/**
 * POST /api/auth/key — 凭身份令牌换取文章解密密钥
 *
 * ⚠️ 这是生产环境实际生效的实现（functions/ 运行时）。
 * EncryptedPostGuard.svelte / AccessGuard.svelte / PrivatePostList.svelte
 * 调用它完成「登录后自动解锁」「分享链接解锁」「私密文章清单解密」。
 *
 * 请求体：{ "token": "凭证", "slug": "文章 entry.id 或 system:private-manifest" }
 * 响应：  { "valid": true, "key": "解密密钥" }
 *
 * 凭证按顺序识别：
 * 1. share:<密码>       — 分享令牌，KV 校验 slug 匹配与有效期
 * 2. KV session token   — GitHub OAuth 登录发放的不透明 token，仅 admin 放行
 * 3. GitHub access token — 兼容旧版前端，直连 GitHub 校验，仅站长本人放行
 *
 * Pages Function 读不到 Astro 内容集合，无法按文章的 visibility / accessLevel
 * 分级放行，因此身份路径统一收紧为「仅站长（admin）」，宁可更严也不放宽。
 * 非站长用户需要访问时，请用分享密码（share token）路径。
 */

import type { Env } from "../../_lib/env";
import {
	extractSessionToken,
	getSession,
	hmacSha256Hex,
	isOwner,
	resolveOwnerUsername,
} from "../../_lib/session";

interface KeyRequest {
	token?: string;
	slug?: string;
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return json({ valid: false, message: "Method not allowed" }, 405);
	}

	try {
		const body = (await context.request.json()) as KeyRequest;
		const slug = body.slug || "";
		// token 允许从 body / Bearer / cookie 三处取（body 优先）
		const token = extractSessionToken(context.request, body.token);

		if (!token || !slug) {
			return json({ valid: false, message: "缺少必要参数" }, 400);
		}

		const siteSecret =
			context.env.SITE_SECRET || context.env.GITHUB_CLIENT_SECRET;
		if (!siteSecret) {
			console.error(
				"Encryption master secret not configured (SITE_SECRET / GITHUB_CLIENT_SECRET)",
			);
			return json({ valid: false, message: "服务端配置异常" }, 500);
		}

		// 密钥派生必须与构建时（src/pages/posts/[...slug].astro 等）完全一致：
		// hmacSha256(主密钥, entry.id)
		const deriveKey = () => hmacSha256Hex(siteSecret, slug);

		const kv = context.env.POST_ENCRYPTION;

		// ── 路径一：分享令牌 ──────────────────────────────
		if (token.startsWith("share:")) {
			if (!kv) {
				console.error("KV binding POST_ENCRYPTION missing");
				return json({ valid: false, message: "服务端配置异常" }, 500);
			}

			const password = token.slice("share:".length);
			const shareDataStr = await kv.get(`share:${password}`);
			if (!shareDataStr) {
				return json({ valid: false, message: "分享链接已失效" }, 403);
			}

			const shareData = JSON.parse(shareDataStr) as {
				slug?: string;
				expiresAt?: number;
			};

			if (shareData.expiresAt && Date.now() > shareData.expiresAt) {
				// KV 的 TTL 可能还没回收，这里主动清理
				await kv.delete(`share:${password}`);
				return json({ valid: false, message: "分享链接已过期" }, 403);
			}

			if (shareData.slug !== slug) {
				return json({ valid: false, message: "该令牌不适用于本文章" }, 403);
			}

			return json({ valid: true, key: await deriveKey() }, 200);
		}

		// ── 路径二：服务端 session（GitHub OAuth 登录） ────
		if (kv) {
			const session = await getSession(kv, token);
			if (session) {
				if (session.role !== "admin") {
					return json({ valid: false, message: "仅站长本人可查看该内容" }, 403);
				}
				return json({ valid: true, key: await deriveKey() }, 200);
			}
		}

		// ── 路径三：GitHub access token（兼容旧版前端） ────
		const ownerUsername = resolveOwnerUsername(context.env);
		if (!ownerUsername) {
			console.error("GITHUB_OWNER_USERNAME / GITHUB_OWNER not configured");
			return json({ valid: false, message: "服务端配置异常" }, 500);
		}

		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Firefly-Blog-Auth",
				Accept: "application/vnd.github+json",
			},
		});

		if (!response.ok) {
			return json({ valid: false, message: "身份校验失败，请重新登录" }, 401);
		}

		const user = (await response.json()) as { login?: string };
		if (!isOwner(user.login || "", ownerUsername)) {
			return json({ valid: false, message: "仅站长本人可查看该内容" }, 403);
		}

		return json({ valid: true, key: await deriveKey() }, 200);
	} catch (error) {
		console.error("Key retrieval error:", error);
		return json({ valid: false, message: "服务器内部错误" }, 500);
	}
};

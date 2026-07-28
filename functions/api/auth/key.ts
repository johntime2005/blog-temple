/**
 * Cloudflare Pages Function：凭身份令牌换取文章解密密钥
 *
 * API 端点：POST /api/auth/key
 *
 * ⚠️ 这是生产环境实际生效的实现。
 * EncryptedPostGuard.svelte / AccessGuard.svelte 会调用它完成
 * 「GitHub 登录后自动解锁」与「分享链接解锁」。
 * 此前 functions/ 下缺少该端点，Pages 把请求当成静态资源处理并返回 404/405，
 * 导致加密文章永远停在锁屏界面。
 *
 * 请求体：{ "token": "GitHub token 或 share:<密码>", "slug": "文章 entry.id" }
 * 响应：  { "valid": true, "key": "解密密钥" }
 *
 * 与 Astro SSR 版本（src/pages/api/auth/key.ts）的差异：
 * Pages Function 读不到 Astro 内容集合，无法按文章的 visibility / accessLevel
 * 分级放行，因此这里统一收紧为「仅站长本人」，宁可更严也不放宽。
 * 非站长用户需要访问时，请用分享密码（share token）路径。
 */

interface Env {
	/** Cloudflare KV 命名空间 */
	POST_ENCRYPTION: KVNamespace;
	/** 文章加密主密钥，必须与构建时使用的值一致 */
	SITE_SECRET?: string;
	/** 兼容旧配置的回退值 */
	GITHUB_CLIENT_SECRET?: string;
	/** 站长的 GitHub 用户名 */
	GITHUB_OWNER_USERNAME?: string;
	/** 回退：仓库 owner 通常就是站长 */
	GITHUB_OWNER?: string;
}

interface KeyRequest {
	token: string;
	slug: string;
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

/**
 * HMAC-SHA256 派生解密密钥。
 * 必须与 src/pages/posts/[...slug].astro 中构建时的派生方式完全一致：
 * hmacSha256(SITE_SECRET, entry.id)
 */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(message),
	);
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return json({ valid: false, message: "Method not allowed" }, 405);
	}

	try {
		const { token, slug } = (await context.request.json()) as KeyRequest;

		if (!token || !slug) {
			return json({ valid: false, message: "缺少必要参数" }, 400);
		}

		const siteSecret =
			context.env.SITE_SECRET || context.env.GITHUB_CLIENT_SECRET;
		if (!siteSecret) {
			console.error(
				"Encryption master secret not configured (SITE_SECRET / GITHUB_CLIENT_SECRET)",
			);
			return json(
				{
					valid: false,
					message:
						"服务端未配置加密主密钥（SITE_SECRET / GITHUB_CLIENT_SECRET）",
				},
				500,
			);
		}

		// ── 路径一：分享令牌 ──────────────────────────────
		if (token.startsWith("share:")) {
			const kv = context.env.POST_ENCRYPTION;
			if (!kv) {
				return json({ valid: false, message: "服务端未配置 KV 绑定" }, 500);
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

			return json(
				{ valid: true, key: await hmacSha256Hex(siteSecret, slug) },
				200,
			);
		}

		// ── 路径二：GitHub 身份令牌，仅放行站长本人 ────────
		const ownerUsername =
			context.env.GITHUB_OWNER_USERNAME || context.env.GITHUB_OWNER;
		if (!ownerUsername) {
			console.error("GITHUB_OWNER_USERNAME not configured");
			return json(
				{ valid: false, message: "服务端未配置 GITHUB_OWNER_USERNAME" },
				500,
			);
		}

		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Astro-Blog",
			},
		});

		if (!response.ok) {
			return json({ valid: false, message: "身份校验失败" }, 401);
		}

		const user = (await response.json()) as { login?: string };
		const isOwner =
			!!user.login && user.login.toLowerCase() === ownerUsername.toLowerCase();

		if (!isOwner) {
			return json({ valid: false, message: "仅站长本人可查看该内容" }, 403);
		}

		return json(
			{ valid: true, key: await hmacSha256Hex(siteSecret, slug) },
			200,
		);
	} catch (error) {
		console.error("Key retrieval error:", error);
		return json({ valid: false, message: "服务器内部错误" }, 500);
	}
};

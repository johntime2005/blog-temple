/**
 * POST /api/share/create — 创建加密文章的分享链接
 *
 * 请求体：{ "token": "登录凭证", "slug": "文章 entry.id",
 *           "expiresInMinutes": 60, "password": "可选自定义口令" }
 * 响应：  { "success": true, "password": "分享口令", "expiresAt": 时间戳 }
 *
 * 仅管理员可创建（统一走 _lib/session.authenticate）。
 * 生成的口令写入 KV share:<口令>，/api/auth/key 与 /api/verify-password
 * 用它对指定 slug 放行，KV 原生 TTL 自动清理。
 */

import type { Env } from "../../_lib/env";
import { authenticate, generateSecureToken } from "../../_lib/session";

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

interface ShareRequest {
	token?: string;
	slug?: string;
	expiresInMinutes?: number;
	password?: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	try {
		const body = (await context.request.json()) as ShareRequest;
		const { slug, expiresInMinutes, password } = body;

		if (!slug) {
			return json({ success: false, message: "缺少文章 slug" }, 400);
		}

		const auth = await authenticate(context.request, context.env, body.token);
		if (auth?.role !== "admin") {
			return json({ success: false, message: "仅站长可创建分享链接" }, 401);
		}

		const kv = context.env.POST_ENCRYPTION;
		if (!kv) {
			return json({ success: false, message: "服务端配置异常" }, 500);
		}

		const sharePassword = password || generateSecureToken(8);
		const expirationMs = (expiresInMinutes || 60) * 60 * 1000;
		const expiresAt = Date.now() + expirationMs;

		await kv.put(
			`share:${sharePassword}`,
			JSON.stringify({ slug, expiresAt, type: "share" }),
			{ expirationTtl: Math.max(60, Math.floor(expirationMs / 1000)) },
		);

		return json({ success: true, password: sharePassword, expiresAt });
	} catch (err) {
		console.error("Share creation failed:", err);
		return json({ success: false, message: "服务器内部错误" }, 500);
	}
};

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method === "POST") {
		return context.next();
	}
	return json({ success: false, message: "Method not allowed" }, 405);
};

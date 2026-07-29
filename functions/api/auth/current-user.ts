/**
 * GET /api/auth/current-user — 获取当前登录用户
 *
 * 凭证来源：Authorization: Bearer <session token> 或 blog_session cookie。
 * 响应：{ "authenticated": true, "user": { "username", "role", "createdAt" } }
 *
 * 直接以 KV session 为准；不再要求存在 user:<username> 记录
 * （GitHub OAuth 用户没有该记录，那是遗留用户名密码系统的存储）。
 */

import type { Env } from "../../_lib/env";
import { extractSessionToken, getSession } from "../../_lib/session";

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const { env, request } = context;

	try {
		const token = extractSessionToken(request);
		if (!token || !env.POST_ENCRYPTION) {
			return json({ authenticated: false });
		}

		const session = await getSession(env.POST_ENCRYPTION, token);
		if (!session) {
			return json({ authenticated: false });
		}

		return json({
			authenticated: true,
			user: {
				username: session.username,
				role: session.role || "user",
				createdAt: session.createdAt,
			},
		});
	} catch (err) {
		console.error("Get current user error:", err);
		return json({ authenticated: false }, 500);
	}
};

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method === "GET") {
		return context.next();
	}
	return json({ authenticated: false }, 405);
};

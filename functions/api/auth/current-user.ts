/**
 * GET /api/auth/current-user — 获取当前登录用户
 *
 * 凭证来源：Authorization: Bearer <token> 或 blog_session cookie。
 * 响应：{ "authenticated": true, "user": { "username", "role", "provider" } }
 *
 * 鉴权统一走 _lib/session.authenticate()。
 */

import type { Env } from "../../_lib/env";
import { authenticate } from "../../_lib/session";

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
	try {
		const auth = await authenticate(context.request, context.env);
		if (!auth) {
			return json({ authenticated: false });
		}

		return json({
			authenticated: true,
			user: {
				username: auth.username,
				role: auth.role,
				provider: auth.provider,
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

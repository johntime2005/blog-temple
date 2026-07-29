/**
 * POST /api/auth/verify — 校验登录凭证
 *
 * 请求体：{ "token": "凭证（可省略，回退 Bearer / cookie）" }
 * 响应：  { "valid": true, "username": "...", "role": "admin|user" }
 *
 * 鉴权统一走 _lib/session.authenticate()：
 * KV session（OAuth / 遗留密码用户）、ADMIN_PASSWORD 管理 token、
 * 遗留 GitHub token 三种凭证都在同一处识别。
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

export const onRequestPost: PagesFunction<Env> = async (context) => {
	try {
		let bodyToken = "";
		try {
			const body = (await context.request.json()) as { token?: string };
			bodyToken = body.token || "";
		} catch {
			// body 为空或非 JSON：继续从 header / cookie 取
		}

		const auth = await authenticate(context.request, context.env, bodyToken);
		if (!auth) {
			return json({ valid: false });
		}

		return json({ valid: true, username: auth.username, role: auth.role });
	} catch (err) {
		console.error("Auth verify error:", err);
		return json({ valid: false }, 500);
	}
};

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method === "POST") {
		return context.next();
	}
	return json({ valid: false, message: "Method not allowed" }, 405);
};

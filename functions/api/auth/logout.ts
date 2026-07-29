/**
 * POST /api/auth/logout — 退出登录
 *
 * 删除 KV 中的 session 记录并清除 session cookie。
 * 幂等：token 不存在也返回成功。
 */

import type { Env } from "../../_lib/env";
import {
	clearCookie,
	deleteSession,
	extractSessionToken,
	SESSION_COOKIE,
} from "../../_lib/session";

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env, request } = context;

	try {
		let bodyToken = "";
		try {
			const body = (await request.json()) as { token?: string };
			bodyToken = body.token || "";
		} catch {
			// body 为空：继续从 header / cookie 取
		}

		const token = extractSessionToken(request, bodyToken);
		if (token && env.POST_ENCRYPTION) {
			await deleteSession(env.POST_ENCRYPTION, token);
		}
	} catch (err) {
		console.error("Logout error:", err);
	}

	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			"Set-Cookie": clearCookie(SESSION_COOKIE),
		},
	});
};

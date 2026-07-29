/**
 * POST /api/auth/verify — 校验登录凭证
 *
 * 请求体：{ "token": "session token（可省略，回退 Bearer / cookie）" }
 * 响应：  { "valid": true, "username": "...", "role": "admin|user" }
 *
 * 校验顺序：
 * 1. KV session（GitHub OAuth 登录 / 遗留用户名密码登录创建的会话）
 * 2. 兼容路径：把 token 当作 GitHub access token 向 GitHub 校验
 *    （旧版本前端把 GitHub token 直接存进 localStorage，避免升级后全员掉线）
 */

import type { Env } from "../../_lib/env";
import {
	extractSessionToken,
	getSession,
	isOwner,
	resolveOwnerUsername,
} from "../../_lib/session";

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
	const { env, request } = context;

	try {
		let bodyToken = "";
		try {
			const body = (await request.json()) as { token?: string };
			bodyToken = body.token || "";
		} catch {
			// body 为空或非 JSON：继续从 header / cookie 取
		}

		const token = extractSessionToken(request, bodyToken);
		if (!token) {
			return json({ valid: false });
		}

		// ── 路径一：服务端 session ────────────────────────
		if (env.POST_ENCRYPTION) {
			const session = await getSession(env.POST_ENCRYPTION, token);
			if (session) {
				return json({
					valid: true,
					username: session.username,
					role: session.role || "user",
				});
			}
		}

		// ── 路径二：遗留 GitHub token ─────────────────────
		const ghResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Firefly-Blog-Auth",
				Accept: "application/vnd.github+json",
			},
		});

		if (!ghResponse.ok) {
			return json({ valid: false });
		}

		const user = (await ghResponse.json()) as { login?: string };
		if (!user.login) {
			return json({ valid: false });
		}

		const role = isOwner(user.login, resolveOwnerUsername(env))
			? "admin"
			: "user";
		return json({ valid: true, username: user.login, role });
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

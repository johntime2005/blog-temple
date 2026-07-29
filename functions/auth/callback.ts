/**
 * GET /auth/callback — GitHub OAuth 回调
 *
 * 流程：
 * 1. 校验 state（cookie 双提交 + HMAC 签名 + 10 分钟时效）→ CSRF 防护
 * 2. 用授权码向 GitHub 换取 access token（真实 API，不落地到前端）
 * 3. 获取用户信息，与 GITHUB_OWNER_USERNAME（回退 GITHUB_OWNER）比对得出角色
 * 4. 在 KV 创建服务端 session，向浏览器发放不透明 session token
 *    （httpOnly cookie + 成功页写 localStorage），
 *    仅站长会在成功页额外拿到真实 GitHub token 供 Sveltia/Decap CMS 使用
 *
 * 所有失败分支：详细原因 console.error 进 Functions 日志，用户只看到友好页面。
 */

import {
	buildErrorPage,
	buildSuccessPage,
	htmlResponse,
} from "../_lib/auth-pages";
import type { Env } from "../_lib/env";
import {
	clearCookie,
	createSession,
	getCookie,
	isOwner,
	REDIRECT_COOKIE,
	resolveOwnerUsername,
	SESSION_COOKIE,
	SESSION_TTL_SECONDS,
	STATE_COOKIE,
	serializeCookie,
	timingSafeEqual,
	verifySignedState,
} from "../_lib/session";
import { sanitizeRedirect } from "./login";

interface GitHubTokenResponse {
	access_token?: string;
	error?: string;
	error_description?: string;
}

interface GitHubUser {
	login?: string;
}

function errorResponse(
	title: string,
	message: string,
	status: number,
	steps: string[] = [],
): Response {
	return htmlResponse(buildErrorPage(title, message, steps), status, {
		"Set-Cookie": clearCookie(STATE_COOKIE),
	});
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const { env, request } = context;
	const url = new URL(request.url);

	const code = url.searchParams.get("code");
	const callbackState = url.searchParams.get("state");
	const oauthError = url.searchParams.get("error");

	// ── 用户在 GitHub 侧拒绝授权 ──────────────────────────
	if (oauthError) {
		console.error(
			"[OAuth] GitHub 返回错误:",
			oauthError,
			url.searchParams.get("error_description") || "",
		);
		return errorResponse(
			"授权未完成",
			oauthError === "access_denied"
				? "您取消了 GitHub 授权。需要授权后才能访问受保护的内容。"
				: "GitHub 授权失败，请稍后重试。",
			400,
		);
	}

	if (!code) {
		console.error("[OAuth] 回调缺少授权码");
		return errorResponse("授权参数缺失", "授权流程被中断，请重新登录。", 400);
	}

	// ── state 校验（CSRF） ────────────────────────────────
	const clientId = env.GITHUB_CLIENT_ID;
	const clientSecret = env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error(
			"[OAuth] 环境变量缺失:",
			JSON.stringify({ hasClientId: !!clientId, hasSecret: !!clientSecret }),
		);
		return errorResponse(
			"登录服务未配置",
			"GitHub 登录暂时不可用，请联系站长。",
			503,
		);
	}

	const savedState = getCookie(request, STATE_COOKIE);
	if (!callbackState || !savedState) {
		console.error(
			"[OAuth] state 缺失:",
			JSON.stringify({ hasParam: !!callbackState, hasCookie: !!savedState }),
		);
		return errorResponse(
			"安全校验失败",
			"登录会话已失效或浏览器未携带 Cookie，请重新登录。",
			403,
			["请确认浏览器允许 Cookie 后重试"],
		);
	}

	if (!timingSafeEqual(callbackState, savedState)) {
		console.error("[OAuth] state 不匹配（可能的 CSRF）");
		return errorResponse("安全校验失败", "登录状态不匹配，请重新登录。", 403);
	}

	const stateCheck = await verifySignedState(clientSecret, savedState);
	if (!stateCheck.valid) {
		console.error("[OAuth] state 校验未通过:", stateCheck.reason);
		return errorResponse(
			"安全校验失败",
			"登录请求已过期或无效，请重新登录。",
			403,
		);
	}

	// ── 授权码换 token ────────────────────────────────────
	try {
		const tokenResponse = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
					"User-Agent": "Firefly-Blog-Auth",
				},
				body: JSON.stringify({
					client_id: clientId,
					client_secret: clientSecret,
					code,
				}),
			},
		);

		const tokenData = (await tokenResponse.json()) as GitHubTokenResponse;

		if (tokenData.error || !tokenData.access_token) {
			console.error(
				"[OAuth] 换取 token 失败:",
				tokenData.error,
				tokenData.error_description || "",
			);
			return errorResponse(
				"授权失败",
				"未能从 GitHub 获取访问令牌，请重新登录。",
				502,
			);
		}

		const githubToken = tokenData.access_token;

		// ── 获取用户身份 ──────────────────────────────────
		const userResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${githubToken}`,
				"User-Agent": "Firefly-Blog-Auth",
				Accept: "application/vnd.github+json",
			},
		});

		if (!userResponse.ok) {
			console.error(
				"[OAuth] 获取用户信息失败:",
				userResponse.status,
				await userResponse.text(),
			);
			return errorResponse(
				"身份获取失败",
				"未能获取您的 GitHub 用户信息，请重新登录。",
				502,
			);
		}

		const user = (await userResponse.json()) as GitHubUser;
		const username = user.login || "";
		if (!username) {
			console.error("[OAuth] GitHub 用户信息缺少 login 字段");
			return errorResponse(
				"身份获取失败",
				"GitHub 返回的用户信息不完整，请重新登录。",
				502,
			);
		}

		const ownerUsername = resolveOwnerUsername(env);
		if (!ownerUsername) {
			console.error("[OAuth] GITHUB_OWNER_USERNAME / GITHUB_OWNER 均未配置");
		}
		const role = isOwner(username, ownerUsername) ? "admin" : "user";

		// ── 创建服务端 session ────────────────────────────
		const kv = env.POST_ENCRYPTION;
		if (!kv) {
			console.error("[OAuth] 缺少 KV 绑定 POST_ENCRYPTION，无法创建会话");
			return errorResponse(
				"服务配置异常",
				"登录服务暂时不可用，请联系站长。",
				500,
			);
		}

		const sessionToken = await createSession(kv, {
			username,
			role,
			githubToken,
			provider: "github",
			createdAt: new Date().toISOString(),
		});
		console.log(`[OAuth] 登录成功: ${username} (role=${role})`);

		const redirectUrl = sanitizeRedirect(
			getCookie(request, REDIRECT_COOKIE) || "/",
		);

		const headers = new Headers();
		headers.append("Set-Cookie", clearCookie(STATE_COOKIE));
		headers.append("Set-Cookie", clearCookie(REDIRECT_COOKIE));
		headers.append(
			"Set-Cookie",
			serializeCookie(SESSION_COOKIE, sessionToken, SESSION_TTL_SECONDS),
		);

		return htmlResponse(
			buildSuccessPage(
				{
					// CMS 需要真实 GitHub token；普通用户只拿 session token
					token: role === "admin" ? githubToken : sessionToken,
					sessionToken,
					username,
					role,
					provider: "github",
					backend: "github",
				},
				redirectUrl,
			),
			200,
			headers,
		);
	} catch (err) {
		console.error("[OAuth] 回调处理异常:", err);
		return errorResponse(
			"登录过程出错",
			"处理 GitHub 授权时发生错误，请稍后重试。",
			500,
		);
	}
};

/**
 * GET /auth/login — GitHub OAuth 授权入口
 *
 * 生成 HMAC 签名的 state（CSRF 防护）写入 httpOnly cookie，
 * 然后 302 跳转 GitHub 授权页。回调地址默认 origin + /auth/callback/，
 * 可用 GITHUB_REDIRECT_URI 覆盖（必须与 GitHub OAuth App 配置一致）。
 */

import { buildErrorPage, htmlResponse } from "../_lib/auth-pages";
import type { Env } from "../_lib/env";
import {
	createSignedState,
	REDIRECT_COOKIE,
	resolveRequestOrigin,
	STATE_COOKIE,
	sanitizeReturnOrigin,
	serializeCookie,
} from "../_lib/session";

const STATE_COOKIE_TTL = 600; // 10 分钟，与 state 时效一致

/** 只允许站内相对路径，防 open redirect */
export function sanitizeRedirect(raw: string | null): string {
	if (!raw) return "/";
	if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
		return "/";
	}
	return raw;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const { env, request } = context;

	const clientId = env.GITHUB_CLIENT_ID;
	const clientSecret = env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		console.error(
			"[OAuth] 环境变量缺失:",
			JSON.stringify({ hasClientId: !!clientId, hasSecret: !!clientSecret }),
		);
		return htmlResponse(
			buildErrorPage("登录服务未配置", "GitHub 登录暂时不可用，请联系站长。", [
				"站长请在 Cloudflare Pages → Settings → Variables and Secrets 配置 GITHUB_CLIENT_ID 与 GITHUB_CLIENT_SECRET（Runtime）",
				"并确认 GitHub OAuth App 的 Authorization callback URL 为 https://<域名>/auth/callback/",
			]),
			503,
		);
	}

	const url = new URL(request.url);
	const redirectTarget = sanitizeRedirect(url.searchParams.get("redirect"));
	// 登录发起域：跨域发起（如国内加速站，其 /auth/* 不经反代）由前端用
	// ?from= 显式传入；同域/反代场景从请求头推导。全部经白名单校验，
	// 并随 HMAC 签名写入 state——回调域拿不到发起域 Cookie，回跳信息只能随 state 走
	const returnOrigin =
		sanitizeReturnOrigin(url.searchParams.get("from"), env) ||
		resolveRequestOrigin(request, env) ||
		url.origin;
	const state = await createSignedState(clientSecret, {
		o: returnOrigin,
		r: redirectTarget,
	});

	const redirectUri = env.GITHUB_REDIRECT_URI || `${url.origin}/auth/callback/`;

	const authUrl = new URL("https://github.com/login/oauth/authorize");
	authUrl.searchParams.set("client_id", clientId);
	authUrl.searchParams.set("redirect_uri", redirectUri);
	// repo 权限供 Sveltia/Decap CMS 管理仓库内容使用（与既有 OAuth App 授权一致）
	authUrl.searchParams.set("scope", "repo");
	authUrl.searchParams.set("state", state);

	const headers = new Headers({ Location: authUrl.toString() });
	headers.append(
		"Set-Cookie",
		serializeCookie(STATE_COOKIE, state, STATE_COOKIE_TTL),
	);
	headers.append(
		"Set-Cookie",
		serializeCookie(REDIRECT_COOKIE, redirectTarget, STATE_COOKIE_TTL),
	);

	return new Response(null, { status: 302, headers });
};

/**
 * GET /auth — 登录入口别名，转发到 /auth/login/
 *
 * LoginForm.svelte 的弹窗打开的是 /auth/?redirect=...，保持兼容。
 */

import type { Env } from "../_lib/env";
import { sanitizeRedirect } from "./login";

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const url = new URL(context.request.url);
	const redirectParam = sanitizeRedirect(url.searchParams.get("redirect"));
	const fromParam = url.searchParams.get("from");

	const params = new URLSearchParams();
	if (redirectParam !== "/") {
		params.set("redirect", redirectParam);
	}
	// 跨域发起登录时透传发起域（login.ts 会做白名单校验）
	if (fromParam) {
		params.set("from", fromParam);
	}

	const qs = params.toString();
	const target = `/auth/login/${qs ? `?${qs}` : ""}`;

	return Response.redirect(new URL(target, url.origin).toString(), 302);
};

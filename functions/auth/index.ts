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

	let target = "/auth/login/";
	if (redirectParam !== "/") {
		target += `?redirect=${encodeURIComponent(redirectParam)}`;
	}

	return Response.redirect(new URL(target, url.origin).toString(), 302);
};

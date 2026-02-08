import { defineMiddleware } from "astro:middleware";

const AUTH_PATHS_NEEDING_SLASH = ["/auth/login", "/auth/callback"];

export const onRequest = defineMiddleware(async (context, next) => {
	const { pathname } = new URL(context.request.url);

	for (const path of AUTH_PATHS_NEEDING_SLASH) {
		if (pathname === path) {
			const target = new URL(context.request.url);
			target.pathname = path + "/";
			return context.redirect(target.toString(), 302);
		}
	}

	return next();
});

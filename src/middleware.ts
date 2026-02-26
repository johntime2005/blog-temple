import { defineMiddleware } from "astro:middleware";

const AUTH_PATHS_NEEDING_SLASH: readonly ["/auth/login", "/auth/callback"] = [
	"/auth/login",
	"/auth/callback",
];

type MiddlewareCallback = Parameters<typeof defineMiddleware>[0];
type MiddlewareContext = Parameters<MiddlewareCallback>[0];
type MiddlewareNext = Parameters<MiddlewareCallback>[1];

type MiddlewareHandler = ReturnType<typeof defineMiddleware>;

export const onRequest: MiddlewareHandler = defineMiddleware(
	async (context: MiddlewareContext, next: MiddlewareNext) => {
		const { pathname } = new URL(context.request.url);

		for (const path of AUTH_PATHS_NEEDING_SLASH) {
			if (pathname === path) {
				const target = new URL(context.request.url);
				target.pathname = `${path}/`;
				return context.redirect(target.toString(), 302);
			}
		}

		return next();
	},
);

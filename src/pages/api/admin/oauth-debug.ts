import type { APIContext } from "astro";
import { getEnv } from "@/utils/env-utils";

export const prerender = false;

export async function GET({ request, locals }: APIContext): Promise<Response> {
	const url = new URL(request.url);
	const origin = url.origin;

	const configuredRedirectUri = getEnv(locals, "GITHUB_REDIRECT_URI");
	const expectedCallback = `${origin}/auth/callback/`;

	return new Response(
		JSON.stringify(
			{
				origin,
				expectedCallback,
				configuredRedirectUri: configuredRedirectUri || null,
				githubOAuthAppCallbackShouldInclude:
					configuredRedirectUri || expectedCallback,
			},
			null,
			2,
		),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": "no-store",
			},
		},
	);
}

import type { APIContext } from "astro";

export const prerender = false;

export async function GET({
	request,
	redirect,
}: APIContext): Promise<Response> {
	const url = new URL(request.url);
	const redirectParam = url.searchParams.get("redirect");

	let targetUrl = "/auth/login/";
	if (redirectParam) {
		targetUrl += `?redirect=${encodeURIComponent(redirectParam)}`;
	}

	return redirect(targetUrl, 302);
}

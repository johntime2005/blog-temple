export const prerender = false;

export async function GET({ request, redirect }) {
	const url = new URL(request.url);
	const redirectParam = url.searchParams.get("redirect");

	let targetUrl = "/auth/login/";
	if (redirectParam) {
		targetUrl += `?redirect=${encodeURIComponent(redirectParam)}`;
	}

	return redirect(targetUrl, 302);
}

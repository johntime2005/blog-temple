export const prerender = false;

export const GET = async ({ request, locals }) => {
	const cookieHeader = request.headers.get("Cookie") || "";
	const match = cookieHeader.match(/keystatic-gh-access-token=([^;]+)/);
	const accessToken = match ? match[1] : null;

	const env = locals?.runtime?.env || {};
	const secret = env.SITE_SECRET;

	if (!accessToken) {
		return new Response(
			JSON.stringify(
				{ error: "No access token found in cookies", cookies: cookieHeader },
				null,
				2,
			),
			{
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	// Test GitHub
	const res = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `Bearer ${accessToken}`,
			"User-Agent": "Keystatic-Debug",
		},
	});

	const data = await res.json();
	return new Response(
		JSON.stringify(
			{
				github_status: res.status,
				github_user: data.login || data.message,
				secret_status: secret ? `Present (${secret.length} chars)` : "Missing",
			},
			null,
			2,
		),
		{
			headers: { "Content-Type": "application/json" },
		},
	);
};

export const prerender = false;

export async function POST({ request }) {
	try {
		const { token } = await request.json();

		if (!token) {
			return new Response(JSON.stringify({ valid: false }), { status: 400 });
		}

		// Verify with GitHub
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Astro-Blog",
			},
		});

		if (response.ok) {
			const data = await response.json();
			return new Response(
				JSON.stringify({
					valid: true,
					username: data.login,
					avatar: data.avatar_url,
				}),
				{ status: 200 },
			);
		}
		return new Response(JSON.stringify({ valid: false }), { status: 401 });
	} catch (error) {
		console.error("Auth verification error:", error);
		return new Response(JSON.stringify({ valid: false }), { status: 500 });
	}
}

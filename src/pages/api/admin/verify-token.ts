import { getEnv } from "@/utils/env-utils";

export const prerender = false;

interface VerifyTokenRequest {
	token: string;
}

export async function POST({ request, locals }) {
	try {
		const body = (await request.json()) as VerifyTokenRequest;
		const { token } = body;

		if (!token) {
			return new Response(JSON.stringify({ valid: false }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const ownerUsername = getEnv(locals, "GITHUB_OWNER_USERNAME");

		const ghResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Astro-Blog",
			},
		});

		if (!ghResponse.ok) {
			return new Response(JSON.stringify({ valid: false }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		const user = await ghResponse.json();
		const isOwner =
			ownerUsername &&
			user.login &&
			ownerUsername.toLowerCase() === user.login.toLowerCase();

		return new Response(
			JSON.stringify({
				valid: true,
				isOwner,
				username: user.login,
				avatar: user.avatar_url,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		console.error("Token verification error:", error);
		return new Response(JSON.stringify({ valid: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

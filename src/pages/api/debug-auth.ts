import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	const authHeader = request.headers.get("Authorization");
	const token = authHeader?.replace("Bearer ", "");

	const runtime = (locals as any).runtime as any;
	const ownerUsername = runtime?.env?.GITHUB_OWNER_USERNAME;

	if (!token) {
		return new Response(
			JSON.stringify({
				status: "No Token",
				ownerConfigured: ownerUsername ? "YES" : "NO",
				ownerValue: ownerUsername, // Debug only
			}),
		);
	}

	const ghResponse = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `token ${token}`,
			"User-Agent": "Astro-Blog",
		},
	});

	if (!ghResponse.ok) {
		return new Response(
			JSON.stringify({
				status: "Token Invalid",
				ghStatus: ghResponse.status,
			}),
		);
	}

	const user = await ghResponse.json();
	const isOwner =
		ownerUsername &&
		user.login &&
		ownerUsername.toLowerCase() === user.login.toLowerCase();

	return new Response(
		JSON.stringify({
			youAre: user.login,
			systemOwnerIs: ownerUsername || "NOT SET",
			match: isOwner,
			canSeePrivate: isOwner ? "YES" : "NO",
		}),
	);
};

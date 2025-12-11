import { hmacSha256 } from "@utils/security";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { token, slug } = await request.json(); // AccessGuard sends 'postSlug'
		// We'll normalize to 'slug' or 'id'.

		if (!token || !slug) {
			return new Response(
				JSON.stringify({ valid: false, message: "Missing params" }),
				{ status: 400 },
			);
		}

		const runtime = (locals as any).runtime as any;
		const SITE_SECRET =
			runtime?.env?.SITE_SECRET || runtime?.env?.GITHUB_CLIENT_SECRET;

		if (!SITE_SECRET) {
			console.error("SITE_SECRET not configured");
			return new Response(
				JSON.stringify({ valid: false, message: "Server configuration error" }),
				{ status: 500 },
			);
		}

		// Verify with GitHub
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Astro-Blog",
			},
		});

		if (!response.ok) {
			return new Response(
				JSON.stringify({ valid: false, message: "Unauthorized" }),
				{ status: 401 },
			);
		}

		// If authorized (valid GitHub user)
		// Check if user has access? content is 'members-only', implying any logged in user?
		// Or restricted to specific users?
		// Deployment docs say: "accessLevel: members-only", need to login.
		// Assuming any valid GitHub login is sufficient for now (matches AccessGuard logic).

		// Derive Key
		const decryptionKey = await hmacSha256(SITE_SECRET, slug);

		return new Response(
			JSON.stringify({
				valid: true,
				key: decryptionKey,
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error("Key retrieval error:", error);
		return new Response(JSON.stringify({ valid: false }), { status: 500 });
	}
};

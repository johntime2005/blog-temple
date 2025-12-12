import { getEntry } from "astro:content";
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
		const ownerUsername = runtime?.env?.GITHUB_OWNER_USERNAME;

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

		const user = await response.json();
		const isOwner =
			ownerUsername &&
			user.login &&
			ownerUsername.toLowerCase() === user.login.toLowerCase();

		// Fetch the post to check visibility
		const post = await getEntry("posts", slug);
		if (!post) {
			return new Response(
				JSON.stringify({ valid: false, message: "Post not found" }),
				{ status: 404 },
			);
		}

		const visibility = post.data.visibility; // private, unlisted, public
		const accessLevel = post.data.accessLevel; // members-only, restricted, public

		// STRICT CHECK: Private posts are OWNER ONLY
		if (visibility === "private" && !isOwner) {
			return new Response(
				JSON.stringify({ valid: false, message: "Forbidden: Owner only" }),
				{ status: 403 },
			);
		}

		// Restricted access level -> Owner only
		if (accessLevel === "restricted" && !isOwner) {
			return new Response(
				JSON.stringify({ valid: false, message: "Forbidden: Restricted access" }),
				{ status: 403 },
			);
		}

		// Members-only -> Owner only (User Request: "only my github login")
		if (accessLevel === "members-only" && !isOwner) {
			return new Response(
				JSON.stringify({
					valid: false,
					message: "Forbidden: Only owner can view members-only content",
				}),
				{ status: 403 },
			);
		}

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

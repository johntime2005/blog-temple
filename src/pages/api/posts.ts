import { getSortedPosts } from "@/utils/content-utils";

export const prerender = false;

export async function GET({ request }) {
	const authHeader = request.headers.get("Authorization");
	const token = authHeader?.replace("Bearer ", "");

	if (!token) {
		return new Response(JSON.stringify({ error: "Unauthorized" }), {
			status: 401,
		});
	}

	// Verify token with GitHub
	// Note: In production with high traffic, you should cache this validation or use a session cookie.
	const ghResponse = await fetch("https://api.github.com/user", {
		headers: {
			Authorization: `token ${token}`,
			"User-Agent": "Astro-Blog",
		},
	});

	if (!ghResponse.ok) {
		return new Response(JSON.stringify({ error: "Invalid token" }), {
			status: 401,
		});
	}

	// Token is valid, fetch private posts
	const allPosts = await getSortedPosts();
	const privatePosts = allPosts.filter((post) => {
		const isPrivate =
			post.data.visibility === "private" ||
			post.data.accessLevel === "members-only";
		return isPrivate;
	});

	// Map to simple structure
	const posts = privatePosts.map((post) => ({
		id: post.id,
		data: {
			title: post.data.title,
			published: post.data.published,
			description: post.data.description,
			tags: post.data.tags,
			category: post.data.category,
			image: post.data.image,
			visibility: post.data.visibility,
			accessLevel: post.data.accessLevel,
		},
		slug: post.id,
	}));

	return new Response(JSON.stringify({ posts }), {
		status: 200,
		headers: { "Content-Type": "application/json" },
	});
}

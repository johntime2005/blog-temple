import type { APIContext } from "astro";
import { getSortedPosts } from "@/utils/content-utils";

export async function GET(_context: APIContext): Promise<Response> {
	const posts = await getSortedPosts();

	const allPostsData = posts.map((post) => ({
		id: post.id,
		title: post.data.title,
		published: post.data.published.getTime(),
	}));

	return new Response(JSON.stringify(allPostsData));
}

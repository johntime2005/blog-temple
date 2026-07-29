import type { APIContext } from "astro";
import { getSortedPosts, shouldShowPost } from "@/utils/content-utils";

export async function GET(_context: APIContext): Promise<Response> {
	const posts = await getSortedPosts();

	// 公开静态 JSON：只统计公开文章，避免私密文章标题泄漏
	const allPostsData = posts
		.filter((post) => shouldShowPost(post, "widget"))
		.map((post) => ({
			id: post.id,
			title: post.data.title,
			published: post.data.published.getTime(),
		}));

	return new Response(JSON.stringify(allPostsData));
}

import { getSortedPosts, shouldShowPost } from "@/utils/content-utils";

export async function GET(): Promise<Response> {
	const posts = await getSortedPosts();

	// 这是公开可下载的静态 JSON（推荐文章/日历组件消费），
	// 必须过滤掉私密、加密、非公开访问级别的文章，否则标题与描述会直接泄漏
	const allPostsData = posts
		.filter((post) => shouldShowPost(post, "widget"))
		.map((post) => ({
			id: post.id,
			title: post.data.title,
			description: post.data.description,
			published: post.data.published.getTime(),
			category: post.data.category || "",
			password: !!post.data.password,
		}))
		// 日历按纯日期排序，忽略置顶
		.sort((a, b) => b.published - a.published);

	return new Response(JSON.stringify(allPostsData));
}

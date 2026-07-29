/**
 * 私密文章清单（构建期静态生成，AES 加密后输出）
 *
 * 产物：/api/private-manifest.json → { "data": "<AES 密文>" }
 *
 * Pages Functions 读不到 Astro 内容集合，所以私密文章列表在构建期生成；
 * 但明文清单会泄漏私密文章的标题/描述，因此用与文章正文相同的
 * 密钥派生方式加密：hmacSha256(主密钥, "system:private-manifest")。
 *
 * 客户端（PrivatePostList.svelte）流程：
 *   POST /api/auth/key { token, slug: "system:private-manifest" }（仅站长放行）
 *   → fetch 本文件 → decryptContent(data, key) → JSON.parse
 *
 * 构建时读不到主密钥则输出 { data: null }（与文章加密的行为一致：
 * 宁可不输出，也不用弱密钥加密）。
 */

import { getCollection } from "astro:content";
import { encryptContent, hmacSha256 } from "@/utils/security";
import { removeFileExtension } from "@/utils/url-utils";

export const prerender = true;

// 与 PrivatePostList.svelte 中的取键 slug 保持一致
const MANIFEST_SLUG = "system:private-manifest";

export async function GET(): Promise<Response> {
	const allPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	// 站长可见的私密集合：private / 加密 / 非公开访问级别
	const privatePosts = allPosts
		.filter(
			({ data }) =>
				data.visibility === "private" ||
				data.encrypted === true ||
				data.accessLevel !== "public",
		)
		.sort((a, b) => b.data.published.getTime() - a.data.published.getTime())
		.map((post) => ({
			id: post.id,
			slug: removeFileExtension(post.id),
			data: {
				title: post.data.title,
				published: post.data.published.toISOString(),
				description: post.data.description || "",
				tags: post.data.tags || [],
				category: post.data.category || "",
				visibility: post.data.visibility,
				accessLevel: post.data.accessLevel,
				encrypted: !!post.data.encrypted,
			},
		}));

	const secret =
		import.meta.env.SITE_SECRET || import.meta.env.GITHUB_CLIENT_SECRET || "";

	if (!secret) {
		console.warn(
			"[private-manifest] 构建时读不到加密主密钥，私密文章清单不输出。",
		);
		return new Response(JSON.stringify({ data: null }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	const key = await hmacSha256(secret, MANIFEST_SLUG);
	const ciphertext = encryptContent(JSON.stringify(privatePosts), key);

	return new Response(JSON.stringify({ data: ciphertext }), {
		headers: { "Content-Type": "application/json" },
	});
}

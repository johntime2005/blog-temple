/**
 * 文章管理 API
 *
 * API 端点: POST /api/admin/posts
 *
 * 支持的操作:
 * - list: 列出文章(从前端传递的数据进行服务端筛选)
 * - get: 获取单个文章信息
 * - update-frontmatter: 更新单个文章(返回修改建议)
 * - batch-update: 批量更新(返回修改建议)
 * - generate-script: 生成批量修改脚本
 *
 * 注意: 由于 Cloudflare Pages Functions 无法直接访问文件系统,
 * 实际的文件修改需要通过本地脚本或 GitHub API 完成
 */

import type {
	PostAPIRequest,
	PostListItem,
	AdminAPIResponse,
	PostFrontmatter,
} from "../../../src/types/admin";

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

/**
 * 验证管理员 token
 */
async function verifyAdminToken(
	kv: KVNamespace,
	token: string
): Promise<boolean> {
	if (!token) return false;
	const tokenValue = await kv.get(`admin:token:${token}`);
	return tokenValue === "valid";
}

/**
 * 筛选文章
 */
function filterPosts(
	posts: PostListItem[],
	filters?: PostAPIRequest["filters"]
): PostListItem[] {
	if (!filters) return posts;

	let result = posts;

	// 按搜索关键词筛选
	if (filters.search) {
		const query = filters.search.toLowerCase();
		result = result.filter(
			(p) =>
				p.title.toLowerCase().includes(query) ||
				p.slug.toLowerCase().includes(query) ||
				p.category?.toLowerCase().includes(query) ||
				p.tags.some((tag) => tag.toLowerCase().includes(query))
		);
	}

	// 按类别筛选
	if (filters.category) {
		result = result.filter((p) => p.category === filters.category);
	}

	// 按标签筛选
	if (filters.tags && filters.tags.length > 0) {
		result = result.filter((p) =>
			filters.tags!.some((tag) => p.tags.includes(tag))
		);
	}

	// 按加密状态筛选
	if (filters.encrypted !== undefined) {
		result = result.filter((p) => p.encrypted === filters.encrypted);
	}

	// 按草稿状态筛选
	if (filters.draft !== undefined) {
		result = result.filter((p) => p.draft === filters.draft);
	}

	// 按可见性筛选
	if (filters.visibility) {
		result = result.filter((p) => p.visibility === filters.visibility);
	}

	// 按首页显示状态筛选
	if (filters.hideFromHome !== undefined) {
		result = result.filter((p) => p.hideFromHome === filters.hideFromHome);
	}

	// 按系列筛选
	if (filters.series) {
		result = result.filter((p) => p.series === filters.series);
	}

	return result;
}

/**
 * 生成 frontmatter 修改脚本
 */
function generateUpdateScript(
	updates: Array<{
		slug: string;
		updates: Partial<PostFrontmatter>;
	}>
): string {
	const scriptLines: string[] = [
		"#!/usr/bin/env node",
		"/**",
		" * 自动生成的文章批量更新脚本",
		" * 运行方式: node update-posts.mjs",
		" */",
		"",
		"import fs from 'fs';",
		"import path from 'path';",
		"import matter from 'gray-matter';",
		"",
		"const updates = " + JSON.stringify(updates, null, 2) + ";",
		"",
		"for (const { slug, updates: frontmatterUpdates } of updates) {",
		"  try {",
		"    const filePath = path.join('src/content/posts', `${slug}.md`);",
		"    ",
		"    if (!fs.existsSync(filePath)) {",
		"      console.error(`文件不存在: ${filePath}`);",
		"      continue;",
		"    }",
		"    ",
		"    const content = fs.readFileSync(filePath, 'utf-8');",
		"    const { data, content: markdown } = matter(content);",
		"    ",
		"    // 合并更新",
		"    const newData = { ...data, ...frontmatterUpdates };",
		"    ",
		"    // 写回文件",
		"    const newContent = matter.stringify(markdown, newData);",
		"    fs.writeFileSync(filePath, newContent);",
		"    ",
		"    console.log(`✅ 已更新: ${slug}`);",
		"  } catch (error) {",
		"    console.error(`❌ 更新失败 ${slug}:`, error);",
		"  }",
		"}",
		"",
		"console.log('批量更新完成！');",
	];

	return scriptLines.join("\n");
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(
			JSON.stringify({
				success: false,
				message: "Method not allowed",
			} as AdminAPIResponse),
			{
				status: 405,
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	try {
		const body = (await context.request.json()) as PostAPIRequest & {
			posts?: PostListItem[];
		};
		const { action, token, filters, slug, frontmatter, batchUpdate, posts } =
			body;

		// 验证管理员权限
		const isAdmin = await verifyAdminToken(
			context.env.POST_ENCRYPTION,
			token
		);
		if (!isAdmin) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "未授权: 无效的管理员 token",
				} as AdminAPIResponse),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 处理不同的操作
		switch (action) {
			case "list": {
				if (!posts) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少文章数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 应用筛选
				const filteredPosts = filterPosts(posts, filters);

				return new Response(
					JSON.stringify({
						success: true,
						data: {
							posts: filteredPosts,
							total: filteredPosts.length,
							filters,
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "get": {
				if (!slug || !posts) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少文章 slug 或文章数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const post = posts.find((p) => p.slug === slug);

				if (!post) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `文章 "${slug}" 不存在`,
						} as AdminAPIResponse),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				return new Response(
					JSON.stringify({
						success: true,
						data: post,
					} as AdminAPIResponse<PostListItem>),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "update-frontmatter": {
				if (!slug || !frontmatter) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少文章 slug 或 frontmatter 数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 返回修改���议
				return new Response(
					JSON.stringify({
						success: true,
						message: "修改建议已生成",
						data: {
							slug,
							updates: frontmatter,
							instructions: [
								`请在文件 src/content/posts/${slug}.md 中更新以下字段:`,
								...Object.entries(frontmatter).map(
									([key, value]) =>
										`  ${key}: ${JSON.stringify(value)}`
								),
								"",
								"或者使用生成的脚本批量更新",
							].join("\n"),
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "batch-update": {
				if (!batchUpdate) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少批量���新数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const updates = batchUpdate.slugs.map((slug) => ({
					slug,
					updates: batchUpdate.updates,
				}));

				return new Response(
					JSON.stringify({
						success: true,
						message: `将更新 ${updates.length} 篇文章`,
						data: {
							updates,
							affectedPosts: batchUpdate.slugs.length,
							instructions:
								"请使用 generate-script 操作生成自动更新脚本",
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "generate-script": {
				if (!batchUpdate) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少批量更新数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const updates = batchUpdate.slugs.map((slug) => ({
					slug,
					updates: batchUpdate.updates,
				}));

				const script = generateUpdateScript(updates);

				return new Response(
					JSON.stringify({
						success: true,
						message: "脚本已生成",
						data: {
							script,
							filename: "update-posts.mjs",
							instructions: [
								"1. 将脚本保存为 update-posts.mjs",
								"2. 确保已安装 gray-matter: pnpm add gray-matter",
								"3. 运行脚本: node update-posts.mjs",
								"4. 验证更改并提交到 Git",
							].join("\n"),
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			default: {
				return new Response(
					JSON.stringify({
						success: false,
						message: "未知的操作",
					} as AdminAPIResponse),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
		}
	} catch (error) {
		console.error("Post management error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				message: "服务器内部错误",
			} as AdminAPIResponse),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

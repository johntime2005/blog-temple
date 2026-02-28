/**
 * 文章管理 API（GitHub API 增强版）
 *
 * POST /api/admin/posts
 *
 * 支持的操作:
 * - list: 列出文章（前端传入数据+服务端筛选）
 * - get: 获取单个文章内容（从 GitHub 读取）
 * - create: 创建新文章（通过 GitHub API 写入文件）
 * - update: 更新文章（通过 GitHub API 修改文件）
 * - delete: 删除文章（通过 GitHub API 删除文件）
 * - update-frontmatter: 更新文章 frontmatter（读取→修改→写回）
 * - batch-update: 批量更新（逐个通过 GitHub API 修改）
 *
 * 关键改进：不再返回"修改建议"，而是通过 GitHub API 真正修改文件。
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import {
	deleteFile,
	fromBase64,
	type GitHubConfig,
	getGitHubConfig,
	listDirectory,
	readFile,
	triggerDeploy,
	upsertFile,
} from "../../_lib/github";
import { error, ok, serverError, unauthorized } from "../../_lib/response";

// ── 类型定义 ──────────────────────────────────────────────

interface PostListItem {
	slug: string;
	title: string;
	published: string;
	updated?: string;
	category?: string;
	tags: string[];
	encrypted: boolean;
	draft: boolean;
	visibility: "public" | "unlisted" | "private";
	hideFromHome: boolean;
	featuredLevel: number;
	series?: string;
}

interface PostAPIRequest {
	token?: string;
	action: string;
	// list
	posts?: PostListItem[];
	filters?: Record<string, unknown>;
	// get/update/delete
	slug?: string;
	// create/update
	content?: string;
	frontmatter?: Record<string, unknown>;
	// batch-update
	batchUpdate?: {
		slugs: string[];
		updates: Record<string, unknown>;
	};
	// 是否触发部署
	triggerDeploy?: boolean;
}

// ── 文章文件路径 ──────────────────────────────────────────

const POSTS_DIR = "src/content/posts";

function postFilePath(slug: string): string {
	// 支持嵌套目录结构：tutorials/my-post → src/content/posts/tutorials/my-post.md
	return `${POSTS_DIR}/${slug}.md`;
}

// ── Frontmatter 解析/生成 ─────────────────────────────────

function parseFrontmatter(content: string): {
	frontmatter: Record<string, unknown>;
	body: string;
} {
	const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) {
		return { frontmatter: {}, body: content };
	}

	const yamlStr = match[1];
	const body = match[2];

	// 简单的 YAML 解析（处理常见格式）
	const frontmatter: Record<string, unknown> = {};
	const lines = yamlStr.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#")) continue;

		const colonIdx = trimmed.indexOf(":");
		if (colonIdx === -1) continue;

		const key = trimmed.slice(0, colonIdx).trim();
		let value: unknown = trimmed.slice(colonIdx + 1).trim();

		// 解析常见值类型
		if (value === "true") value = true;
		else if (value === "false") value = false;
		else if (value === "null" || value === "") value = null;
		else if (typeof value === "string" && /^\d+$/.test(value))
			value = Number.parseInt(value, 10);
		else if (typeof value === "string" && /^\d+\.\d+$/.test(value))
			value = Number.parseFloat(value);
		else if (
			typeof value === "string" &&
			value.startsWith("[") &&
			value.endsWith("]")
		) {
			// 简单数组解析: [tag1, tag2]
			value = value
				.slice(1, -1)
				.split(",")
				.map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
				.filter(Boolean);
		} else if (
			typeof value === "string" &&
			value.startsWith('"') &&
			value.endsWith('"')
		) {
			value = value.slice(1, -1);
		} else if (
			typeof value === "string" &&
			value.startsWith("'") &&
			value.endsWith("'")
		) {
			value = value.slice(1, -1);
		}

		frontmatter[key] = value;
	}

	return { frontmatter, body };
}

function buildFrontmatter(data: Record<string, unknown>): string {
	const lines: string[] = ["---"];

	for (const [key, value] of Object.entries(data)) {
		if (value === null || value === undefined) continue;

		if (Array.isArray(value)) {
			lines.push(`${key}: [${value.map((v) => JSON.stringify(v)).join(", ")}]`);
		} else if (typeof value === "string") {
			// 包含特殊字符的字符串加引号
			if (value.includes(":") || value.includes("#") || value.includes('"')) {
				lines.push(`${key}: "${value.replace(/"/g, '\\"')}"`);
			} else {
				lines.push(`${key}: ${value}`);
			}
		} else if (typeof value === "boolean" || typeof value === "number") {
			lines.push(`${key}: ${value}`);
		} else {
			lines.push(`${key}: ${JSON.stringify(value)}`);
		}
	}

	lines.push("---");
	return lines.join("\n");
}

// ── 筛选文章 ──────────────────────────────────────────────

function filterPosts(
	posts: PostListItem[],
	filters?: Record<string, unknown>,
): PostListItem[] {
	if (!filters) return posts;

	let result = posts;

	if (filters.search && typeof filters.search === "string") {
		const query = filters.search.toLowerCase();
		result = result.filter(
			(p) =>
				p.title.toLowerCase().includes(query) ||
				p.slug.toLowerCase().includes(query) ||
				p.category?.toLowerCase().includes(query) ||
				p.tags.some((tag) => tag.toLowerCase().includes(query)),
		);
	}

	if (filters.category && typeof filters.category === "string") {
		result = result.filter((p) => p.category === filters.category);
	}

	if (Array.isArray(filters.tags) && filters.tags.length > 0) {
		result = result.filter((p) =>
			(filters.tags as string[]).some((tag) => p.tags.includes(tag)),
		);
	}

	if (typeof filters.encrypted === "boolean") {
		result = result.filter((p) => p.encrypted === filters.encrypted);
	}

	if (typeof filters.draft === "boolean") {
		result = result.filter((p) => p.draft === filters.draft);
	}

	if (filters.visibility && typeof filters.visibility === "string") {
		result = result.filter((p) => p.visibility === filters.visibility);
	}

	if (typeof filters.hideFromHome === "boolean") {
		result = result.filter((p) => p.hideFromHome === filters.hideFromHome);
	}

	if (filters.series && typeof filters.series === "string") {
		result = result.filter((p) => p.series === filters.series);
	}

	return result;
}

// ── 主处理函数 ────────────────────────────────────────────

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;

	const body = (await context.request.json()) as PostAPIRequest;
	const token = extractToken(context.request, body);

	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	const ghConfig = getGitHubConfig(env);
	const { action } = body;

	switch (action) {
		// ── 列出文章 ──────────────────────────────────────
		case "list": {
			if (!body.posts) {
				return error("缺少文章数据");
			}
			const filtered = filterPosts(body.posts, body.filters);
			return ok({
				posts: filtered,
				total: filtered.length,
				filters: body.filters,
			});
		}

		// ── 获取文章（从 GitHub 读取真实内容） ──────────────
		case "get": {
			if (!body.slug) {
				return error("缺少文章 slug");
			}
			if (!ghConfig) {
				return error("GitHub API 未配置", 500);
			}

			const filePath = postFilePath(body.slug);
			const content = await readFile(ghConfig, filePath);

			if (content === null) {
				return error(`文章 "${body.slug}" 不存在`, 404);
			}

			const parsed = parseFrontmatter(content);
			return ok({
				slug: body.slug,
				content,
				frontmatter: parsed.frontmatter,
				body: parsed.body,
			});
		}

		// ── 创建文章 ──────────────────────────────────────
		case "create": {
			if (!body.slug) {
				return error("缺少文章 slug");
			}
			if (!ghConfig) {
				return error("GitHub API 未配置", 500);
			}

			const filePath = postFilePath(body.slug);
			let fileContent: string;

			if (body.content) {
				// 直接使用提供的完整内容
				fileContent = body.content;
			} else if (body.frontmatter) {
				// 从 frontmatter 生成
				const defaultFM: Record<string, unknown> = {
					title: body.slug,
					published: new Date().toISOString().split("T")[0],
					draft: true,
					description: "",
					tags: [],
					category: "",
					...body.frontmatter,
				};
				fileContent = `${buildFrontmatter(defaultFM)}\n\n`;
			} else {
				return error("缺少文章内容或 frontmatter");
			}

			const result = await upsertFile(
				ghConfig,
				filePath,
				fileContent,
				`create: 新建文章 ${body.slug}`,
			);

			// 可选触发部署
			if (body.triggerDeploy && env.DEPLOY_HOOK_URL) {
				await triggerDeploy(env.DEPLOY_HOOK_URL);
			}

			return ok(
				{ slug: body.slug, commitSha: result.commitSha },
				"文章创建成功" + (body.triggerDeploy ? "，部署已触发" : ""),
			);
		}

		// ── 更新文章 ──────────────────────────────────────
		case "update": {
			if (!body.slug || !body.content) {
				return error("缺少文章 slug 或内容");
			}
			if (!ghConfig) {
				return error("GitHub API 未配置", 500);
			}

			const filePath = postFilePath(body.slug);
			const result = await upsertFile(
				ghConfig,
				filePath,
				body.content,
				`update: 更新文章 ${body.slug}`,
			);

			if (body.triggerDeploy && env.DEPLOY_HOOK_URL) {
				await triggerDeploy(env.DEPLOY_HOOK_URL);
			}

			return ok(
				{ slug: body.slug, commitSha: result.commitSha },
				"文章更新成功" + (body.triggerDeploy ? "，部署已触发" : ""),
			);
		}

		// ── 删除文章 ──────────────────────────────────────
		case "delete": {
			if (!body.slug) {
				return error("缺少文章 slug");
			}
			if (!ghConfig) {
				return error("GitHub API 未配置", 500);
			}

			const filePath = postFilePath(body.slug);
			await deleteFile(ghConfig, filePath, `delete: 删除文章 ${body.slug}`);

			if (body.triggerDeploy && env.DEPLOY_HOOK_URL) {
				await triggerDeploy(env.DEPLOY_HOOK_URL);
			}

			return ok(
				{ slug: body.slug },
				"文章删除成功" + (body.triggerDeploy ? "，部署已触发" : ""),
			);
		}

		// ── 更新 Frontmatter（读取→修改→写回） ────────────
		case "update-frontmatter": {
			if (!body.slug || !body.frontmatter) {
				return error("缺少文章 slug 或 frontmatter 数据");
			}
			if (!ghConfig) {
				return error("GitHub API 未配置", 500);
			}

			const filePath = postFilePath(body.slug);
			const existing = await readFile(ghConfig, filePath);

			if (existing === null) {
				return error(`文章 "${body.slug}" 不存在`, 404);
			}

			// 解析现有内容
			const parsed = parseFrontmatter(existing);

			// 合并更新
			const updatedFM = { ...parsed.frontmatter, ...body.frontmatter };
			const newContent = `${buildFrontmatter(updatedFM)}\n${parsed.body}`;

			const result = await upsertFile(
				ghConfig,
				filePath,
				newContent,
				`update: 更新文章 ${body.slug} 的 frontmatter`,
			);

			if (body.triggerDeploy && env.DEPLOY_HOOK_URL) {
				await triggerDeploy(env.DEPLOY_HOOK_URL);
			}

			return ok(
				{
					slug: body.slug,
					commitSha: result.commitSha,
					updatedFields: Object.keys(body.frontmatter),
				},
				"Frontmatter 更新成功" + (body.triggerDeploy ? "，部署已触发" : ""),
			);
		}

		// ── 批量更新 Frontmatter ──────────────────────────
		case "batch-update": {
			if (!body.batchUpdate) {
				return error("缺少批量更新数据");
			}
			if (!ghConfig) {
				return error("GitHub API 未配置", 500);
			}

			const { slugs, updates } = body.batchUpdate;
			const results: Array<{ slug: string; success: boolean; error?: string }> =
				[];

			// 逐个更新（避免 GitHub API 并发冲突）
			for (const slug of slugs) {
				try {
					const filePath = postFilePath(slug);
					const existing = await readFile(ghConfig, filePath);

					if (existing === null) {
						results.push({ slug, success: false, error: "文件不存在" });
						continue;
					}

					const parsed = parseFrontmatter(existing);
					const updatedFM = { ...parsed.frontmatter, ...updates };
					const newContent = `${buildFrontmatter(updatedFM)}\n${parsed.body}`;

					await upsertFile(
						ghConfig,
						filePath,
						newContent,
						`batch-update: 批量更新文章 ${slug}`,
					);

					results.push({ slug, success: true });
				} catch (err) {
					results.push({
						slug,
						success: false,
						error: err instanceof Error ? err.message : "未知错误",
					});
				}
			}

			// 完成后统一触发部署
			if (body.triggerDeploy && env.DEPLOY_HOOK_URL) {
				await triggerDeploy(env.DEPLOY_HOOK_URL);
			}

			const succeeded = results.filter((r) => r.success).length;
			const failed = results.filter((r) => !r.success).length;

			return ok(
				{ results, succeeded, failed },
				`批量更新完成: ${succeeded} 成功, ${failed} 失败` +
					(body.triggerDeploy ? "，部署已触发" : ""),
			);
		}

		default:
			return error(`未知操作: ${action}`);
	}
};

/**
 * 类别管理 API
 *
 * POST /api/admin/categories
 *
 * 操作: list / create / update / delete / reorder
 *
 * 数据源是仓库内 src/content/categories/<slug>.md —— 这是构建时的唯一
 * 事实来源（Astro content collection + Sveltia categories collection）。
 * 历史版本把改动写进 KV，但构建根本不读 KV，后台的任何修改都不会生效；
 * 必须通过 GitHub API 写回仓库，commit 自动触发 Pages 重建后才可见。
 */

import type { Env } from "../../_lib/env";
import {
	deleteFile,
	getGitHubConfig,
	type GitHubConfig,
	listDirectory,
	readFile,
	upsertFile,
} from "../../_lib/github";
import { error, ok } from "../../_lib/response";

const CATEGORIES_DIR = "src/content/categories";
const REBUILD_HINT = "已提交到仓库，站点重新构建后生效（约 2-3 分钟）";

interface Category {
	id: string;
	name: string;
	slug?: string;
	icon?: string;
	description?: string;
	showInHome?: boolean;
	showInNavbar?: boolean;
	syncToPublic?: boolean;
	encrypted?: boolean;
	order?: number;
	color?: string;
	customLink?: string;
}

function quote(value: string): string {
	return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** 字段与 src/content/config.ts 的 categories schema、Sveltia 配置保持一致 */
function buildFrontmatter(cat: Category, slug: string): string {
	const lines = [
		"---",
		`title: ${quote(cat.name)}`,
		`slug: ${quote(slug)}`,
		`description: ${quote(cat.description || "")}`,
		`order: ${Number.isFinite(cat.order) ? cat.order : 99}`,
		`icon: ${quote(cat.icon || "material-symbols:folder")}`,
		`color: ${quote(cat.color || "#3b82f6")}`,
		`showInHome: ${cat.showInHome ?? true}`,
		`showInNavbar: ${cat.showInNavbar ?? false}`,
		`syncToPublic: ${cat.syncToPublic ?? false}`,
		`encrypted: ${cat.encrypted ?? false}`,
	];
	if (cat.customLink) lines.push(`customLink: ${quote(cat.customLink)}`);
	lines.push("---");
	return lines.join("\n");
}

/** 更新时保留 frontmatter 之外的正文（当前分类文件通常无正文，防御处理） */
function replaceFrontmatter(original: string, frontmatter: string): string {
	const match = original.match(/^---\n[\s\S]*?\n---/);
	if (!match) return `${frontmatter}\n`;
	return original.replace(match[0], frontmatter);
}

function parseScalar(raw: string): string | number | boolean {
	const trimmed = raw.trim();
	if (trimmed === "true") return true;
	if (trimmed === "false") return false;
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
	return trimmed.replace(/^["']|["']$/g, "");
}

function parseCategoryFile(filename: string, content: string): Category | null {
	const match = content.match(/^---\n([\s\S]*?)\n---/);
	if (!match) return null;

	const data: Record<string, string | number | boolean> = {};
	for (const line of match[1].split("\n")) {
		const kv = line.match(/^([A-Za-z][\w]*):\s*(.*)$/);
		if (kv) data[kv[1]] = parseScalar(kv[2]);
	}

	const fileSlug = filename.replace(/\.md$/, "");
	const title = String(data.title || fileSlug);
	return {
		id: title,
		name: title,
		slug: String(data.slug || fileSlug),
		description: String(data.description || ""),
		order: typeof data.order === "number" ? data.order : 99,
		icon: String(data.icon || "material-symbols:folder"),
		color: String(data.color || "#3b82f6"),
		showInHome: data.showInHome !== false,
		showInNavbar: data.showInNavbar === true,
		syncToPublic: data.syncToPublic === true,
		encrypted: data.encrypted === true,
		customLink: data.customLink ? String(data.customLink) : undefined,
	};
}

interface CategoryFile {
	path: string;
	category: Category;
	raw: string;
}

async function loadCategoryFiles(
	config: GitHubConfig,
): Promise<CategoryFile[]> {
	const entries = await listDirectory(config, CATEGORIES_DIR);
	const files = entries.filter(
		(e) => e.type === "file" && e.name.endsWith(".md"),
	);
	const results = await Promise.all(
		files.map(async (file) => {
			const raw = await readFile(config, file.path);
			if (raw === null) return null;
			const category = parseCategoryFile(file.name, raw);
			if (!category) return null;
			return { path: file.path, category, raw } satisfies CategoryFile;
		}),
	);
	return results.filter((r): r is CategoryFile => r !== null);
}

/** 定位分类文件：slug 直接拼路径，否则按 title（后台的 id 就是 title）匹配 */
async function findCategoryFile(
	config: GitHubConfig,
	idOrTitle: string,
	slug?: string,
): Promise<CategoryFile | null> {
	if (slug) {
		const path = `${CATEGORIES_DIR}/${slug}.md`;
		const raw = await readFile(config, path);
		if (raw !== null) {
			const category = parseCategoryFile(`${slug}.md`, raw);
			if (category) return { path, category, raw };
		}
	}
	const all = await loadCategoryFiles(config);
	return (
		all.find(
			(f) =>
				f.category.name === idOrTitle ||
				f.category.slug === idOrTitle ||
				f.path.endsWith(`/${idOrTitle}.md`),
		) || null
	);
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		category?: Category;
		categoryId?: string;
		slug?: string;
		categories?: Category[];
	};

	const config = getGitHubConfig(env);
	if (!config) {
		return error(
			"未配置 GITHUB_PAT，无法写入仓库；请在 Dashboard 配置后重试",
			500,
		);
	}

	try {
		switch (body.action) {
			case "list": {
				const files = await loadCategoryFiles(config);
				const list = files
					.map((f) => f.category)
					.sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
				return ok(list);
			}

			case "create": {
				if (!body.category?.name) return error("缺少类别数据");
				const slug =
					body.category.slug ||
					body.category.id ||
					body.category.name.toLowerCase().replace(/\s+/g, "-");
				const path = `${CATEGORIES_DIR}/${slug}.md`;

				if ((await readFile(config, path)) !== null) {
					return error(`分类文件 ${slug}.md 已存在`);
				}

				await upsertFile(
					config,
					path,
					`${buildFrontmatter(body.category, slug)}\n`,
					`chore(admin): 新建分类 ${body.category.name}`,
				);
				return ok(body.category, `分类已创建，${REBUILD_HINT}`);
			}

			case "update": {
				if (!body.category || !body.categoryId)
					return error("缺少类别数据或 ID");

				const file = await findCategoryFile(
					config,
					body.categoryId,
					body.category.slug,
				);
				if (!file) return error(`未找到分类 "${body.categoryId}" 的文件`, 404);

				const slug = body.category.slug || file.category.slug || "";
				await upsertFile(
					config,
					file.path,
					replaceFrontmatter(file.raw, buildFrontmatter(body.category, slug)),
					`chore(admin): 更新分类 ${body.category.name}`,
				);
				return ok(body.category, `分类已更新，${REBUILD_HINT}`);
			}

			case "delete": {
				if (!body.categoryId) return error("缺少类别 ID");

				const file = await findCategoryFile(config, body.categoryId, body.slug);
				if (!file) return error(`未找到分类 "${body.categoryId}" 的文件`, 404);

				await deleteFile(
					config,
					file.path,
					`chore(admin): 删除分类 ${body.categoryId}`,
				);
				return ok(null, `分类已删除，${REBUILD_HINT}`);
			}

			case "reorder": {
				if (!body.categories?.length) return error("缺少类别列表");

				for (let index = 0; index < body.categories.length; index++) {
					const cat = body.categories[index];
					const file = await findCategoryFile(config, cat.id, cat.slug);
					if (!file) continue;
					const slug = cat.slug || file.category.slug || "";
					await upsertFile(
						config,
						file.path,
						replaceFrontmatter(
							file.raw,
							buildFrontmatter({ ...cat, order: index }, slug),
						),
						`chore(admin): 调整分类顺序 ${cat.name}`,
					);
				}
				return ok(body.categories, `顺序已保存，${REBUILD_HINT}`);
			}

			default:
				return error(`未知操作: ${body.action}`);
		}
	} catch (err) {
		console.error("[categories] GitHub 操作失败:", err);
		return error(
			`写入仓库失败：${err instanceof Error ? err.message : "未知错误"}`,
			502,
		);
	}
};

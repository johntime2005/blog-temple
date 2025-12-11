import type { CollectionEntry } from "astro:content";
import type { Category } from "@/types/admin";

/**
 * 获取文章所属的所有栏目
 *
 * 自动合并 category 字段和 columns 字段，确保向后兼容
 *
 * @param post 文章对象
 * @returns 栏目 ID 数组
 */
export function getPostColumns(post: CollectionEntry<"posts">): string[] {
	const columns = new Set<string>();

	// 从 columns 字段获取
	if (post.data.columns && Array.isArray(post.data.columns)) {
		for (const col of post.data.columns) {
			if (col?.trim()) {
				columns.add(col.trim());
			}
		}
	}

	// category 自动成为栏目（向后兼容）
	if (post.data.category?.trim()) {
		columns.add(post.data.category.trim());
	}

	return Array.from(columns);
}

/**
 * 检查文章是否属于指定栏目
 *
 * @param post 文章对象
 * @param columnId 栏目 ID
 * @returns 是否属于该栏目
 */
export function isPostInColumn(
	post: CollectionEntry<"posts">,
	columnId: string,
): boolean {
	const columns = getPostColumns(post);
	return columns.includes(columnId);
}

/**
 * 获取栏目配置
 *
 * 优先从 KV 读取，回退到默认配置
 *
 * @returns 栏目配置映射
 */
export async function getColumnConfig(): Promise<Record<string, Category>> {
	// 尝试从 Cloudflare KV 读取（SSR 环境）
	if (import.meta.env.SSR && typeof globalThis !== "undefined") {
		try {
			const kv = (globalThis as any).__CLOUDFLARE_ENV__?.POST_ENCRYPTION;
			if (kv) {
				const config = await kv.get("COLUMN_CONFIG", "json");
				if (config) {
					return config as Record<string, Category>;
				}
			}
		} catch (e) {
			console.warn("从 KV 加载栏目配置失败:", e);
		}
	}

	// 回退到默认配置
	const { getCategoryConfig } = await import("@/config/categoryConfig");
	const categories = getCategoryConfig();

	// 将 Category 转换为 Column 格式（添加必要字段）
	const columns: Record<string, Category> = {};
	for (const [id, category] of Object.entries(categories)) {
		columns[id] = {
			...category,
			showInHome: category.showInHome ?? true,
		};
	}

	return columns;
}

/**
 * 获取栏目列表（按顺序排序）
 *
 * @returns 排序后的栏目列表
 */
export async function getColumnsList(): Promise<Category[]> {
	const config = await getColumnConfig();
	return Object.values(config).sort((a, b) => a.order - b.order);
}

/**
 * 获取指定栏目的所有文章
 *
 * @param columnId 栏目 ID
 * @param options 过滤选项
 * @returns 文章列表
 */
export async function getPostsByColumn(
	columnId: string,
	options: {
		includeHidden?: boolean;
		sortBy?: "published" | "updated" | "custom";
	} = {},
): Promise<CollectionEntry<"posts">[]> {
	const { getCollection } = await import("astro:content");

	// 获取所有文章
	const allPosts = await getCollection("posts", ({ data }) => {
		if (!options.includeHidden && import.meta.env.PROD) {
			return data.draft !== true;
		}
		return true;
	});

	// 过滤属于该栏目的文章
	const columnPosts = allPosts.filter((post) => {
		return isPostInColumn(post, columnId);
	});

	// 排序
	return sortColumnPosts(columnPosts, columnId, options.sortBy);
}

/**
 * 排序栏目内的文章
 *
 * 优先级：
 * 1. 栏目特定排序 (columnConfig.order)
 * 2. 栏目内置顶 (columnConfig.featured)
 * 3. 全局自定义排序 (customOrder)
 * 4. 全局推荐级别 (featuredLevel)
 * 5. 全局置顶 (pinned)
 * 6. 发布日期 (published)
 *
 * @param posts 文章列表
 * @param columnId 栏目 ID
 * @param sortBy 排序方式
 * @returns 排序后的文章列表
 */
function sortColumnPosts(
	posts: CollectionEntry<"posts">[],
	columnId: string,
	sortBy: "published" | "updated" | "custom" = "published",
): CollectionEntry<"posts">[] {
	return posts.sort((a, b) => {
		// 1. 栏目特定排序
		const aOrder = a.data.columnConfig?.[columnId]?.order;
		const bOrder = b.data.columnConfig?.[columnId]?.order;
		if (aOrder !== undefined && bOrder !== undefined) {
			return aOrder - bOrder;
		}
		if (aOrder !== undefined) return -1;
		if (bOrder !== undefined) return 1;

		// 2. 栏目内置顶
		const aFeatured = a.data.columnConfig?.[columnId]?.featured;
		const bFeatured = b.data.columnConfig?.[columnId]?.featured;
		if (aFeatured && !bFeatured) return -1;
		if (!aFeatured && bFeatured) return 1;

		// 3. 全局自定义排序
		const aCustomOrder = a.data.customOrder;
		const bCustomOrder = b.data.customOrder;
		if (aCustomOrder !== undefined && bCustomOrder !== undefined) {
			return aCustomOrder - bCustomOrder;
		}
		if (aCustomOrder !== undefined) return -1;
		if (bCustomOrder !== undefined) return 1;

		// 4. 全局推荐级别
		const aFeaturedLevel = a.data.featuredLevel || 0;
		const bFeaturedLevel = b.data.featuredLevel || 0;
		if (aFeaturedLevel !== bFeaturedLevel) {
			return bFeaturedLevel - aFeaturedLevel;
		}

		// 5. 全局置顶
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;

		// 6. 发布/更新日期
		if (sortBy === "updated" && a.data.updated && b.data.updated) {
			return b.data.updated.valueOf() - a.data.updated.valueOf();
		}

		return b.data.published.valueOf() - a.data.published.valueOf();
	});
}

/**
 * 获取栏目的文章统计信息
 *
 * @param columnId 栏目 ID
 * @returns 统计信息
 */
export async function getColumnStats(columnId: string): Promise<{
	totalCount: number;
	draftCount: number;
	publishedCount: number;
}> {
	const { getCollection } = await import("astro:content");

	const allPosts = await getCollection("posts");
	const columnPosts = allPosts.filter((post) => isPostInColumn(post, columnId));

	const draftCount = columnPosts.filter((post) => post.data.draft).length;

	return {
		totalCount: columnPosts.length,
		draftCount,
		publishedCount: columnPosts.length - draftCount,
	};
}

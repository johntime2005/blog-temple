import type { CategoryConfigMap } from "../types/admin";

/**
 * 默认类别配置
 *
 * 这个配置在构建时使用,作为类别管理的基础
 * 可以在后台界面中修改,修改后的配置存储在 Cloudflare KV 中
 */
export const defaultCategoryConfig: CategoryConfigMap = {
	博客教程: {
		id: "博客教程",
		name: "博客教程",
		icon: "material-symbols:school",
		description: "Firefly 博客主题使用教程",
		showInHome: false, // 教程不在首页显示
		order: 1,
		color: "#3b82f6",
		slug: "tutorials",
	},
	文章示例: {
		id: "文章示例",
		name: "文章示例",
		icon: "material-symbols:article",
		description: "文章功能演示和示例",
		showInHome: false,
		order: 2,
		color: "#10b981",
		slug: "examples",
	},
	博客指南: {
		id: "博客指南",
		name: "博客指南",
		icon: "material-symbols:book",
		description: "博客配置与使用指南",
		showInHome: false,
		order: 3,
		color: "#8b5cf6",
		slug: "guides",
	},
	博客: {
		id: "博客",
		name: "博客",
		icon: "material-symbols:edit-note",
		description: "博客相关文章",
		showInHome: true,
		order: 4,
		color: "#f59e0b",
		slug: "blog",
	},
	前端开发: {
		id: "前端开发",
		name: "前端开发",
		icon: "material-symbols:code",
		description: "前端开发技术文章",
		showInHome: true,
		order: 5,
		color: "#ec4899",
		slug: "frontend",
	},
};

/**
 * 获取类别配置
 *
 * @returns 类别配置映射
 */
export function getCategoryConfig(): CategoryConfigMap {
	return defaultCategoryConfig;
}

/**
 * 获取类别列表(按顺序排序)
 *
 * @returns 排序后的类别列表
 */
export function getCategoriesList() {
	return Object.values(defaultCategoryConfig).sort((a, b) => a.order - b.order);
}

/**
 * 根据 ID 获取类别
 *
 * @param id 类别 ID
 * @returns 类别对象或 undefined
 */
export function getCategoryById(id: string) {
	return defaultCategoryConfig[id];
}

/**
 * 检查类别是否应该在主页显示
 *
 * @param categoryId 类别 ID
 * @returns 是否在主页显示
 */
export function shouldShowCategoryInHome(
	categoryId: string | null | undefined,
): boolean {
	if (!categoryId) return true; // 未分类的文章默认显示

	const category = defaultCategoryConfig[categoryId];
	if (!category) return true; // 未知类别默认显示

	return category.showInHome;
}

import { getCollection } from "astro:content";
import type { CategoryConfigMap } from "../types/admin";

/**
 * 分类配置接口
 */
export interface CategoryConfig {
	id: string;
	name: string;
	slug: string;
	icon: string;
	description: string;
	showInHome: boolean;
	showInNavbar: boolean;
	syncToPublic: boolean;
	order: number;
	color: string;
	customLink?: string;
}

/**
 * 默认分类配置（用于兼容和兜底）
 */
export const defaultCategoryConfig: CategoryConfigMap = {
	博客: {
		id: "博客",
		name: "博客",
		icon: "material-symbols:edit-note",
		description: "博客相关文章",
		showInHome: true,
		order: 99,
		color: "#3b82f6",
		slug: "blog",
	},
};

// 缓存从内容集合读取的分类配置
let cachedCategoryConfig: CategoryConfigMap | null = null;

/**
 * 从内容集合获取分类配置
 */
export async function getCategoryConfigFromContent(): Promise<CategoryConfigMap> {
	if (cachedCategoryConfig) {
		return cachedCategoryConfig;
	}

	try {
		const categoryEntries = await getCollection("categories");
		const configMap: CategoryConfigMap = {};

		for (const entry of categoryEntries) {
			const { data, id } = entry;
			const categoryName = data.title;
			const slug = data.slug || id.replace(/\.md$/, '');

			configMap[categoryName] = {
				id: categoryName,
				name: categoryName,
				slug: slug,
				icon: data.icon || "material-symbols:folder",
				description: data.description || "",
				showInHome: data.showInHome ?? true,
				showInNavbar: data.showInNavbar ?? false,
				syncToPublic: data.syncToPublic ?? false,
				order: data.order ?? 99,
				color: data.color || "#3b82f6",
				customLink: data.customLink,
			};
		}

		cachedCategoryConfig = configMap;
		return configMap;
	} catch (error) {
		console.warn("Failed to load categories from content, using defaults:", error);
		return defaultCategoryConfig;
	}
}

/**
 * 获取类别配置（同步版本，用于非异步上下文）
 * 注意：首次调用可能返回默认配置，建议使用 getCategoryConfigFromContent
 */
export function getCategoryConfig(): CategoryConfigMap {
	return cachedCategoryConfig || defaultCategoryConfig;
}

/**
 * 获取类别列表(按顺序排序)
 */
export async function getCategoriesListAsync(): Promise<CategoryConfig[]> {
	const config = await getCategoryConfigFromContent();
	return Object.values(config).sort((a, b) => a.order - b.order) as CategoryConfig[];
}

/**
 * 获取类别列表(按顺序排序) - 同步版本
 */
export function getCategoriesList(): CategoryConfig[] {
	const config = getCategoryConfig();
	return Object.values(config).sort((a, b) => a.order - b.order) as CategoryConfig[];
}

/**
 * 根据 ID 获取类别
 */
export function getCategoryById(id: string): CategoryConfig | undefined {
	const config = getCategoryConfig();
	return config[id] as CategoryConfig | undefined;
}

/**
 * 根据 ID 异步获取类别
 */
export async function getCategoryByIdAsync(id: string): Promise<CategoryConfig | undefined> {
	const config = await getCategoryConfigFromContent();
	return config[id] as CategoryConfig | undefined;
}

/**
 * 检查类别是否应该在主页显示
 */
export function shouldShowCategoryInHome(
	categoryId: string | null | undefined,
): boolean {
	if (!categoryId) return true; // 未分类的文章默认显示

	const config = getCategoryConfig();
	const category = config[categoryId];
	if (!category) return true; // 未知类别默认显示

	return category.showInHome;
}

/**
 * 异步检查类别是否应该在主页显示
 */
export async function shouldShowCategoryInHomeAsync(
	categoryId: string | null | undefined,
): Promise<boolean> {
	if (!categoryId) return true;

	const config = await getCategoryConfigFromContent();
	const category = config[categoryId];
	if (!category) return true;

	return category.showInHome;
}

/**
 * 获取应该在导航栏显示的分类
 */
export async function getNavbarCategories(): Promise<CategoryConfig[]> {
	const config = await getCategoryConfigFromContent();
	return Object.values(config)
		.filter(c => c.showInNavbar)
		.sort((a, b) => a.order - b.order) as CategoryConfig[];
}

/**
 * 初始化分类配置缓存
 * 应在应用启动时调用
 */
export async function initCategoryConfig(): Promise<void> {
	await getCategoryConfigFromContent();
}

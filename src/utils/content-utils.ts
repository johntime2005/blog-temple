import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils";

/**
 * 获取所有类别配置的映射
 */
async function getCategoryConfigMap() {
	const categories = await getCollection("categories");
	const map = new Map<string, CollectionEntry<"categories">["data"]>();
	for (const cat of categories) {
		map.set(cat.data.title, cat.data);
	}
	return map;
}

/**
 * 检查文章是否应该被显示
 * @param post 文章对象
 * @param context 上下文：home | archive | search | widget | detail
 * @param categoriesMap 类别配置映射 (可选，如果不提供则默认显示类别)
 * @returns 是否显示
 */
export function shouldShowPost(
	post: CollectionEntry<"posts">,
	context: "home" | "archive" | "search" | "widget" | "detail" = "detail",
	categoriesMap?: Map<string, CollectionEntry<"categories">["data"]>,
): boolean {
	const { data } = post;

	// 生产环境下过滤草稿
	if (import.meta.env.PROD && data.draft === true) {
		return false;
	}

	// 根据可见性级别过滤
	if (data.visibility === "private") {
		return false; // private 完全不显示
	}

	// [NEW] Encrypted posts should NOT be shown in public lists (Home, Archive, Search, Widget)
	// They will be loaded client-side for authorized users only.
	if (data.encrypted && context !== "detail") {
		return false;
	}

	if (data.visibility === "unlisted" && context !== "detail") {
		return false; // unlisted 只在详情页显示
	}

	// 根据访问级别过滤（未来可以扩展为基于用户权限）
	if (data.accessLevel !== "public" && context !== "detail") {
		return false; // 非公开内容只在详情页显示（如果用户有权限）
	}

	// 根据上下文过滤
	switch (context) {
		case "home":
			// 首页过滤：检查 hideFromHome 标志和类别配置
			if (data.hideFromHome) return false;

			// 检查类别是否应该在主页显示
			if (data.category && categoriesMap) {
				const catConfig = categoriesMap.get(data.category);
				if (catConfig && catConfig.showInHome === false) {
					return false;
				}
				// 如果没有找到类别配置，默认显示
			}
			// 旧逻辑兼容：如果没有 categoriesMap，暂时允许显示（或者应该去查？但这里是同步的）
			// 建议调用者总是提供 categoriesMap

			return true;
		case "archive":
			return !data.hideFromArchive;
		case "search":
			return !data.hideFromSearch;
		case "widget":
			return data.showInWidget !== false;
		case "detail":
			return true; // 详情页不过滤
		default:
			return true;
	}
}

// // Retrieve posts and sort them by publication date
async function getRawSortedPosts() {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		// 1. 首先按自定义排序优先级（如果设置）
		if (a.data.customOrder !== undefined && b.data.customOrder !== undefined) {
			return a.data.customOrder - b.data.customOrder;
		}
		if (a.data.customOrder !== undefined) return -1;
		if (b.data.customOrder !== undefined) return 1;

		// 2. 然后按推荐级别排序（级别越高越靠前）
		const aFeatured = a.data.featuredLevel || 0;
		const bFeatured = b.data.featuredLevel || 0;
		if (aFeatured !== bFeatured) {
			return bFeatured - aFeatured;
		}

		// 3. 然后按置顶状态排序，置顶文章在前
		if (a.data.pinned && !b.data.pinned) return -1;
		if (!a.data.pinned && b.data.pinned) return 1;

		// 4. 最后按发布日期排序
		const dateA = new Date(a.data.published);
		const dateB = new Date(b.data.published);
		return dateA > dateB ? -1 : 1;
	});
	return sorted;
}

export async function getSortedPosts() {
	const sorted = await getRawSortedPosts();

	for (let i = 1; i < sorted.length; i++) {
		sorted[i].data.nextSlug = sorted[i - 1].id;
		sorted[i].data.nextTitle = sorted[i - 1].data.title;
	}
	for (let i = 0; i < sorted.length - 1; i++) {
		sorted[i].data.prevSlug = sorted[i + 1].id;
		sorted[i].data.prevTitle = sorted[i + 1].data.title;
	}

	return sorted;
}

/**
 * 获取首页显示的文章列表
 */
export async function getHomePagePosts() {
	const sorted = await getSortedPosts();
	const categoriesMap = await getCategoryConfigMap();
	return sorted.filter((post) => shouldShowPost(post, "home", categoriesMap));
}

/**
 * 获取归档页显示的文章列表
 */
export async function getArchivePagePosts() {
	const sorted = await getSortedPosts();
	return sorted.filter((post) => shouldShowPost(post, "archive"));
}

/**
 * 获取搜索结果显示的文章列表
 */
export async function getSearchablePosts() {
	const sorted = await getSortedPosts();
	return sorted.filter((post) => shouldShowPost(post, "search"));
}

/**
 * 获取侧边栏组件显示的文章列表
 */
export async function getWidgetPosts() {
	const sorted = await getSortedPosts();
	return sorted.filter((post) => shouldShowPost(post, "widget"));
}

/**
 * 获取推荐文章（featuredLevel > 0）
 */
export async function getFeaturedPosts(minLevel = 1) {
	const posts = await getWidgetPosts();
	return posts.filter((post) => (post.data.featuredLevel || 0) >= minLevel);
}
export type PostForList = {
	id: string;
	data: CollectionEntry<"posts">["data"];
};
export async function getSortedPostsList(): Promise<PostForList[]> {
	const sortedFullPosts = await getRawSortedPosts();

	// delete post.body
	const sortedPostsList = sortedFullPosts.map((post) => ({
		id: post.id,
		data: post.data,
	}));

	return sortedPostsList;
}

/**
 * 获取归档页显示的文章列表（PostForList 格式）
 */
export async function getArchivePagePostsList(): Promise<PostForList[]> {
	const posts = await getArchivePagePosts();
	return posts.map((post) => ({
		id: post.id,
		data: post.data,
	}));
}
export type Tag = {
	name: string;
	count: number;
};

export async function getTagList(): Promise<Tag[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const countMap: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { tags: string[] } }) => {
		post.data.tags.forEach((tag: string) => {
			if (!countMap[tag]) countMap[tag] = 0;
			countMap[tag]++;
		});
	});

	// sort tags
	const keys: string[] = Object.keys(countMap).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	return keys.map((key) => ({ name: key, count: countMap[key] }));
}

export type Category = {
	name: string;
	count: number;
	url: string;
};

export async function getCategoryList(): Promise<Category[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post: { data: { category: string | null } }) => {
		if (!post.data.category) {
			const ucKey = i18n(I18nKey.uncategorized);
			count[ucKey] = count[ucKey] ? count[ucKey] + 1 : 1;
			return;
		}

		const categoryName =
			typeof post.data.category === "string"
				? post.data.category.trim()
				: String(post.data.category).trim();

		count[categoryName] = count[categoryName] ? count[categoryName] + 1 : 1;
	});

	const lst = Object.keys(count).sort((a, b) => {
		return a.toLowerCase().localeCompare(b.toLowerCase());
	});

	const ret: Category[] = [];
	for (const c of lst) {
		ret.push({
			name: c,
			count: count[c],
			url: getCategoryUrl(c),
		});
	}
	return ret;
}

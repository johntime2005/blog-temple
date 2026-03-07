import { type CollectionEntry, getCollection } from "astro:content";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getCategoryUrl } from "@utils/url-utils";

/**
 * 获取所有类别配置的映射
 */
async function getCategoryConfigMap(): Promise<
	Map<string, CollectionEntry<"categories">["data"]>
> {
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
async function getRawSortedPosts(): Promise<CollectionEntry<"posts">[]> {
	const allBlogPosts = await getCollection("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const sorted = allBlogPosts.sort((a, b) => {
		// 1. 首先按自定义排序优先级（如果设置）
		if (a.data.customOrder != null && b.data.customOrder != null) {
			return a.data.customOrder - b.data.customOrder;
		}
		if (a.data.customOrder != null) return -1;
		if (b.data.customOrder != null) return 1;

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

export async function getSortedPosts(): Promise<CollectionEntry<"posts">[]> {
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
export async function getHomePagePosts(): Promise<CollectionEntry<"posts">[]> {
	const sorted = await getSortedPosts();
	const categoriesMap = await getCategoryConfigMap();
	return sorted.filter((post) => shouldShowPost(post, "home", categoriesMap));
}

/**
 * 获取归档页显示的文章列表
 */
export async function getArchivePagePosts(): Promise<
	CollectionEntry<"posts">[]
> {
	const sorted = await getSortedPosts();
	return sorted.filter((post) => shouldShowPost(post, "archive"));
}

/**
 * 获取搜索结果显示的文章列表
 */
export async function getSearchablePosts(): Promise<
	CollectionEntry<"posts">[]
> {
	const sorted = await getSortedPosts();
	return sorted.filter((post) => shouldShowPost(post, "search"));
}

/**
 * 获取侧边栏组件显示的文章列表
 */
export async function getWidgetPosts(): Promise<CollectionEntry<"posts">[]> {
	const sorted = await getSortedPosts();
	return sorted.filter((post) => shouldShowPost(post, "widget"));
}

/**
 * 获取推荐文章（featuredLevel > 0）
 */
export async function getFeaturedPosts(
	minLevel = 1,
): Promise<CollectionEntry<"posts">[]> {
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
		return (
			count[b] - count[a] || a.toLowerCase().localeCompare(b.toLowerCase())
		);
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

/**
 * 增强的分类信息类型，包含配置和统计
 */
export type CategoryWithConfig = {
	name: string;
	count: number;
	url: string;
	slug: string;
	icon: string;
	description: string;
	showInHome: boolean;
	showInNavbar: boolean;
	syncToPublic: boolean;
	order: number;
	color: string;
	customLink?: string;
};

/**
 * 获取分类列表（包含配置信息和文章统计）
 */
export async function getCategoriesWithConfig(): Promise<CategoryWithConfig[]> {
	const allBlogPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	const categoryEntries = await getCollection("categories");

	// 统计文章数量
	const count: { [key: string]: number } = {};
	allBlogPosts.forEach((post) => {
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

	// 构建配置映射
	const configMap = new Map<
		string,
		CollectionEntry<"categories">["data"] & { slug: string }
	>();
	for (const entry of categoryEntries) {
		configMap.set(entry.data.title, {
			...entry.data,
			slug: entry.data.slug || entry.id.replace(/\.md$/, ""),
		});
	}

	// 合并配置和统计
	const result: CategoryWithConfig[] = [];

	// 先处理有配置的分类
	for (const [name, config] of configMap) {
		result.push({
			name,
			count: count[name] || 0,
			url: config.customLink || getCategoryUrl(name),
			slug: config.slug,
			icon: config.icon || "material-symbols:folder",
			description: config.description || "",
			showInHome: config.showInHome ?? true,
			showInNavbar: config.showInNavbar ?? false,
			syncToPublic: config.syncToPublic ?? false,
			order: config.order ?? 99,
			color: config.color || "#3b82f6",
			customLink: config.customLink,
		});
	}

	// 处理没有配置但有文章的分类
	for (const categoryName of Object.keys(count)) {
		if (!configMap.has(categoryName)) {
			result.push({
				name: categoryName,
				count: count[categoryName],
				url: getCategoryUrl(categoryName),
				slug: categoryName.toLowerCase().replace(/\s+/g, "-"),
				icon: "material-symbols:folder",
				description: "",
				showInHome: true,
				showInNavbar: false,
				syncToPublic: false,
				order: 999,
				color: "#6b7280",
				customLink: undefined,
			});
		}
	}

	// 按 order 排序
	return result.sort((a, b) => a.order - b.order);
}

/**
 * 获取导航栏显示的分类
 */
export async function getNavbarCategories(): Promise<CategoryWithConfig[]> {
	const categories = await getCategoriesWithConfig();
	return categories.filter((c) => c.showInNavbar);
}

/** 对标题进行分词，支持中英文混合
 * 使用 Intl.Segmenter 对中文分词，英文按空格分词
 * 过滤标点和空白，英文统一小写
 */
function tokenizeTitle(title: string): Set<string> {
	const tokens = new Set<string>();
	const segmenter = new Intl.Segmenter("zh", { granularity: "word" });
	for (const { segment, isWordLike } of segmenter.segment(title)) {
		if (!isWordLike) continue;
		tokens.add(segment.toLowerCase());
	}
	return tokens;
}

/**
 * 计算两个集合的 Jaccard 相似度
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
	if (a.size === 0 && b.size === 0) return 0;
	let intersection = 0;
	for (const item of a) {
		if (b.has(item)) intersection++;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
}

/**
 * 获取相关文章推荐
 * 评分公式: totalScore = tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus
 * - tagMatchScore (0-100): 标签 Jaccard 相似度 × 100
 * - titleSimilarityScore (0-100): 标题分词 Jaccard 相似度 × 100
 * - timeFreshnessScore (0-30): 6 个月半衰期指数衰减
 * - categoryBonus (0 or 10): 同分类加 10 分
 */
export async function getRelatedPosts(
	currentPost: CollectionEntry<"posts">,
	maxCount = 5,
): Promise<PostForList[]> {
	const allPosts = await getCollection<"posts">("posts", ({ data }) => {
		return import.meta.env.PROD ? data.draft !== true : true;
	});

	// 排除自身和加密文章
	const candidates = allPosts.filter(
		(p) => p.id !== currentPost.id && !p.data.password,
	);

	const currentTags = new Set<string>(currentPost.data.tags || []);
	const currentTokens = tokenizeTitle(currentPost.data.title);
	const currentCategory = currentPost.data.category || "";
	const now = Date.now();

	const scored = candidates.map((post) => {
		const postTags = new Set<string>(post.data.tags || []);

		// tagMatchScore (0-100)
		const tagMatchScore = jaccardSimilarity(currentTags, postTags) * 100;

		// titleSimilarityScore (0-100)
		const postTokens = tokenizeTitle(post.data.title);
		const titleSimilarityScore =
			jaccardSimilarity(currentTokens, postTokens) * 100;

		// timeFreshnessScore (0-30): 6 个月半衰期
		const daysSincePublished =
			(now - new Date(post.data.published).getTime()) / (1000 * 60 * 60 * 24);
		const timeFreshnessScore =
			30 * Math.exp((-Math.LN2 * daysSincePublished) / 180);

		// categoryBonus (0 or 10)
		const postCategory = post.data.category || "";
		const categoryBonus =
			currentCategory && postCategory && currentCategory === postCategory
				? 10
				: 0;

		const totalScore =
			tagMatchScore + titleSimilarityScore + timeFreshnessScore + categoryBonus;

		return {
			post,
			totalScore,
			tagMatchScore,
			timeFreshnessScore,
			categoryBonus,
		};
	});

	// 按总分降序排列
	scored.sort((a, b) => b.totalScore - a.totalScore);

	// 优先取有标签匹配的
	const withTagMatch = scored.filter((s) => s.tagMatchScore > 0);
	const withoutTagMatch = scored.filter((s) => s.tagMatchScore === 0);

	const result: PostForList[] = [];

	for (const s of withTagMatch) {
		if (result.length >= maxCount) break;
		result.push({ id: s.post.id, data: s.post.data });
	}

	// 不足时从剩余候选中按 timeFreshnessScore + categoryBonus 降序补充
	if (result.length < maxCount) {
		withoutTagMatch.sort(
			(a, b) =>
				b.timeFreshnessScore +
				b.categoryBonus -
				(a.timeFreshnessScore + a.categoryBonus),
		);
		for (const s of withoutTagMatch) {
			if (result.length >= maxCount) break;
			result.push({ id: s.post.id, data: s.post.data });
		}
	}

	return result;
}

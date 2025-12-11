/**
 * 后台管理系统类型定义
 *
 * 用于类别管理、文章管理、自定义页面等功能
 */

/**
 * 类别配置
 */
export interface Category {
	/** 类别 ID (唯一标识符,通常为 slug) */
	id: string;
	/** 类别显示名称 */
	name: string;
	/** 类别图标 (Iconify 图标名称) */
	icon?: string;
	/** 类别描述 */
	description?: string;
	/** 是否在主页显示该类别的文章 */
	showInHome: boolean;
	/** 排序顺序 (数字越小越靠前) */
	order: number;
	/** 类别主题色 (十六进制颜色代码) */
	color?: string;
	/** 类别 URL slug (用于生成链接) */
	slug?: string;
}

/**
 * 类别配置映射
 */
export type CategoryConfigMap = Record<string, Category>;

/**
 * 自定义页面类型
 */
export type CustomPageType = "topic" | "series";

/**
 * 文章筛选条件
 */
export interface PostFilters {
	/** 标签筛选 (包含任一标签即可) */
	tags?: string[];
	/** 类别筛选 */
	category?: string;
	/** 最小推荐级别 */
	minFeaturedLevel?: number;
	/** 系列名称 */
	series?: string;
	/** 是否加密 */
	encrypted?: boolean;
	/** 可见性级别 */
	visibility?: "public" | "unlisted" | "private";
}

/**
 * 自定义页面配置
 */
export interface CustomPage {
	/** 页面 ID (唯一标识符) */
	id: string;
	/** 页面类型 */
	type: CustomPageType;
	/** 页面标题 */
	title: string;
	/** URL slug */
	slug: string;
	/** 页面描述 */
	description?: string;
	/** 文章筛选条件 (仅 topic 类型使用) */
	filters?: PostFilters;
	/** 排序顺序 (数字越小越靠前) */
	order: number;
	/** 布局模式 */
	layout?: "grid" | "list";
	/** 是否在导航��显示 */
	showInNav?: boolean;
	/** 导航栏图标 */
	navIcon?: string;
}

/**
 * 自定义页面配置映射
 */
export type CustomPageConfigMap = Record<string, CustomPage>;

/**
 * 导航栏链接
 */
export interface NavBarLink {
	/** 链接名称 */
	name: string;
	/** 链接 URL */
	url: string;
	/** 链接图标 */
	icon?: string;
	/** 是否为外部链接 */
	external?: boolean;
	/** 子菜单 */
	children?: NavBarLink[];
}

/**
 * 导航栏配置覆盖
 */
export interface NavBarConfigOverride {
	/** 导航链接列表 */
	links: NavBarLink[];
}

/**
 * 站点配置覆盖
 */
export interface SiteConfigOverride {
	/** 站点标题 */
	title?: string;
	/** 站点副标题 */
	subtitle?: string;
	/** 站点描述 */
	description?: string;
	/** 关键词 */
	keywords?: string[];
	/** 主题色配置 */
	themeColor?: {
		/** 色相 (0-360) */
		hue?: number;
		/** 是否固定主题色 */
		fixed?: boolean;
		/** 默认模式 */
		defaultMode?: "light" | "dark" | "system";
	};
	/** 页面开关 */
	pages?: {
		anime?: boolean;
		sponsor?: boolean;
		guestbook?: boolean;
		bangumi?: boolean;
		projects?: boolean;
		timeline?: boolean;
		skills?: boolean;
	};
	/** 分页配置 */
	pagination?: {
		postsPerPage?: number;
	};
}

/**
 * 文章 Frontmatter (用于批量更新)
 */
export interface PostFrontmatter {
	/** 标题 */
	title?: string;
	/** 发布日期 */
	published?: string | Date;
	/** 更新日期 */
	updated?: string | Date;
	/** 是否为草稿 */
	draft?: boolean;
	/** 描述 */
	description?: string;
	/** 封面图 */
	image?: string;
	/** 标签 */
	tags?: string[];
	/** 分类 */
	category?: string;
	/** 语言 */
	lang?: string;
	/** 是否置顶 */
	pinned?: boolean;
	/** 是否加密 */
	encrypted?: boolean;
	/** 加密 ID */
	encryptionId?: string;
	/** 系列 */
	series?: string;
	/** 可见性 */
	visibility?: "public" | "unlisted" | "private";
	/** 从首页隐藏 */
	hideFromHome?: boolean;
	/** 从归档页隐藏 */
	hideFromArchive?: boolean;
	/** 从搜索隐藏 */
	hideFromSearch?: boolean;
	/** 在侧边栏显示 */
	showInWidget?: boolean;
	/** 自定义排序 */
	customOrder?: number;
	/** 推荐级别 */
	featuredLevel?: number;
	/** 文章布局 */
	postLayout?: "default" | "wide" | "fullscreen" | "no-sidebar";
	/** SEO noindex */
	seoNoIndex?: boolean;
	/** SEO nofollow */
	seoNoFollow?: boolean;
}

/**
 * 文章列表项 (用于管理面板显示)
 */
export interface PostListItem {
	/** 文章 slug */
	slug: string;
	/** 标题 */
	title: string;
	/** 发布日期 */
	published: string;
	/** 更新日期 */
	updated?: string;
	/** 分类 */
	category?: string;
	/** 标签 */
	tags: string[];
	/** 是否加密 */
	encrypted: boolean;
	/** 加密 ID */
	encryptionId?: string;
	/** 是否草稿 */
	draft: boolean;
	/** 可见性 */
	visibility: "public" | "unlisted" | "private";
	/** 从首页隐藏 */
	hideFromHome: boolean;
	/** 推荐级别 */
	featuredLevel: number;
	/** 系列 */
	series?: string;
}

/**
 * 批量更新操作
 */
export interface BatchUpdateOperation {
	/** 要更新的文章 slug 列表 */
	slugs: string[];
	/** 更新内容 */
	updates: Partial<PostFrontmatter>;
}

/**
 * API 请求基础接口
 */
export interface AdminAPIRequest {
	/** 管理员 token */
	token: string;
	/** 操作类型 */
	action: string;
}

/**
 * API 响应基础接口
 */
export interface AdminAPIResponse<T = any> {
	/** 是否成功 */
	success: boolean;
	/** 响应消息 */
	message?: string;
	/** 响应数据 */
	data?: T;
}

/**
 * 类别管理 API 请求
 */
export interface CategoryAPIRequest extends AdminAPIRequest {
	action: "list" | "create" | "update" | "delete" | "reorder" | "batch-update";
	/** 类别数据 (create/update 时使用) */
	category?: Category;
	/** 类别 ID (update/delete 时使用) */
	categoryId?: string;
	/** 类别列表 (reorder 时使用) */
	categories?: Category[];
	/** 批量更新操作 (batch-update 时使用) */
	batchUpdate?: {
		/** 类别 ID */
		categoryId: string;
		/** 是否应用到该类别的所有文章 */
		applyToPosts: boolean;
		/** 更新内容 */
		updates: Partial<PostFrontmatter>;
	};
}

/**
 * 文章管理 API 请求
 */
export interface PostAPIRequest extends AdminAPIRequest {
	action: "list" | "update-frontmatter" | "batch-update" | "get";
	/** 文章 slug (get/update-frontmatter 时使用) */
	slug?: string;
	/** 筛选条件 (list 时使用) */
	filters?: PostFilters & {
		/** 搜索关键词 */
		search?: string;
		/** 是否草稿 */
		draft?: boolean;
		/** 从首页隐藏 */
		hideFromHome?: boolean;
	};
	/** Frontmatter 更新内容 (update-frontmatter 时使用) */
	frontmatter?: Partial<PostFrontmatter>;
	/** 批量更新操作 (batch-update 时使用) */
	batchUpdate?: BatchUpdateOperation;
}

/**
 * 自定义页面管理 API 请求
 */
export interface CustomPageAPIRequest extends AdminAPIRequest {
	action: "list" | "create" | "update" | "delete" | "reorder";
	/** 页面数据 (create/update 时使用) */
	page?: CustomPage;
	/** 页面 ID (update/delete 时使用) */
	pageId?: string;
	/** 页面列表 (reorder 时使用) */
	pages?: CustomPage[];
}

/**
 * 导航栏配置 API 请求
 */
export interface NavBarAPIRequest extends AdminAPIRequest {
	action: "get" | "update";
	/** 导航栏配置 (update 时使用) */
	config?: NavBarConfigOverride;
}

/**
 * 站点配置 API 请求
 */
export interface SiteConfigAPIRequest extends AdminAPIRequest {
	action: "get" | "update" | "reset";
	/** 站点配置覆盖 (update 时使用) */
	config?: SiteConfigOverride;
}

/**
 * 标签管理 API 请求
 */
export interface TagAPIRequest extends AdminAPIRequest {
	action: "list" | "rename" | "merge" | "delete";
	/** 旧标签名 (rename/merge/delete 时使用) */
	oldTag?: string;
	/** 新标签名 (rename/merge 时使用) */
	newTag?: string;
}

/**
 * KV 存储 key 常量
 */
export const KV_KEYS = {
	/** 类别配置 */
	CATEGORIES: "config:categories",
	/** 自定义页面配置 */
	CUSTOM_PAGES: "config:custom_pages",
	/** 导航栏配置覆盖 */
	NAVBAR_OVERRIDE: "config:navbar_override",
	/** 站点配置覆盖 */
	SITE_OVERRIDE: "config:site_override",
} as const;

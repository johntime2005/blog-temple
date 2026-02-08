import type { SiteConfig } from "../types/config";
import { fontConfig } from "./fontConfig";

// 定义站点语言
// 语言代码，例如：'zh_CN', 'zh_TW', 'en', 'ja', 'ru'。
const SITE_LANG = "zh_CN";

export const siteConfig: SiteConfig = {
	// ⚠️ 重要：首次部署后请运行初始化向导或手动设置为 true
	initialized: true,

	// 站点标题
	title: "johntime 的博客",

	// 站点副标题
	subtitle: "记录生活，分享技术",

	// 站点 URL
	site_url: "https://blog.johntime.top",

	// 站点描述
	description:
		"johntime 的个人博客，记录学习笔记、技术分享、生活随笔。内容涵盖服务器搭建、开源项目、旅行记录等。",

	// 站点关键词
	keywords: ["johntime", "个人博客", "技术博客", "开源", "旅行", "生活记录"],

	// 主题色
	themeColor: {
		hue: 155,
		fixed: false,
		defaultMode: "system",
	},

	// 网站Card样式配置
	card: {
		border: true,
	},

	// Favicon 配置
	favicon: [
		{
			src: "/assets/images/favicon.ico",
		},
	],

	// 导航栏配置
	navbar: {
		logo: {
			type: "image",
			value: "/assets/images/LiuYingPure3.svg",
			alt: "🍀",
		},
		title: "johntime 的博客",
		widthFull: false,
		followTheme: false,
	},

	// 站点开始日期
	siteStartDate: "2025-01-01",

	// 站点时区
	timezone: "Asia/Shanghai",

	// 提醒框配置
	rehypeCallouts: {
		theme: "github",
	},

	showLastModified: true,
	outdatedThreshold: 30,
	sharePoster: true,
	generateOgImages: false,

	// bangumi配置
	bangumi: {
		userId: "1176159",
	},

	// 页面开关
	pages: {
		anime: true,
		sponsor: false,
		guestbook: true,
		bangumi: true,
		projects: true,
		timeline: true,
		skills: true,
	},

	// 文章列表布局
	postListLayout: {
		defaultMode: "list",
		allowSwitch: true,
		grid: {
			masonry: false,
			columns: 3,
		},
	},

	// 分页
	pagination: {
		postsPerPage: 10,
	},

	// 统计分析
	analytics: {
		googleAnalyticsId: "",
		microsoftClarityId: "",
	},

	// 目录功能
	toc: {
		enable: true,
		depth: 3,
	},

	// 字体配置
	font: fontConfig,

	// 站点语言
	lang: SITE_LANG,
};

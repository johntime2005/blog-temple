import type { SiteConfig } from "../types/config";
import { fontConfig } from "./fontConfig";

// 定义站点语言
const SITE_LANG = "zh_CN"; // 语言代码，例如：'en', 'zh_CN', 'ja' 等。

export const siteConfig: SiteConfig = {
	// ⚠️ 重要：首次部署后请运行初始化向导或手动设置为 true
	// 设置为 false 时会自动跳转到 /setup/ 初始化页面
	initialized: true, // 当前网站已配置，保持 true；新部署时改为 false

	title: "johntime 的博客",
	subtitle: "记录生活，分享技术",
	site_url: "https://blog.johntime.top",
	description:
		"johntime 的个人博客，记录学习笔记、技术分享、生活随笔。内容涵盖服务器搭建、开源项目、旅行记录等。",
	keywords: ["johntime", "个人博客", "技术博客", "开源", "旅行", "生活记录"],

	lang: SITE_LANG,

	themeColor: {
		hue: 155, // 主题色的默认色相，范围从 0 到 360。例如：红色：0，青色：200，蓝绿色：250，粉色：345
		fixed: false, // 对访问者隐藏主题色选择器
		defaultMode: "system", // 默认模式："light" 浅色，"dark" 深色，"system" 跟随系统
	},

	favicon: [
		// 留空以使用默认 favicon
		{
			src: "/assets/images/favicon.ico", // 图标文件路径
			theme: "light", // 可选，指定主题 'light' | 'dark'
			sizes: "32x32", // 可选，图标大小
		},
	],

	// 网站Logo
	// logoIcon 支持三种类型：Astro图标库，本地图片，网络图片
	// { type: "icon", value: "material-symbols:home-pin-outline" }
	// { type: "image", value: "/assets/images/logo.webp", alt: "Firefly Logo" }
	// { type: "image", value: "https://example.com/logo.png", alt: "Firefly Logo" }
	logoIcon: {
		type: "image",
		value: "/assets/images/LiuYingPure3.svg",
		alt: "🍀",
	},

	// 站点开始日期，用于统计运行天数
	siteStartDate: "2025-01-01", // 请修改为你的站点实际开始日期，格式：YYYY-MM-DD

	// 追番配置
	bangumi: {
		userId: "1176159", // 在此处设置你的Bangumi用户ID
	},

	// 文章页底部的"上次编辑时间"卡片开关
	showLastModified: true,

	// 文章过期阈值（天数），超过此天数才显示"上次编辑"卡片
	outdatedThreshold: 30,

	// OpenGraph图片功能,注意开启后要渲染很长时间，不建议本地调试的时候开启
	generateOgImages: false,

	// anime和bangumi都是来源bangumi的数据，请配置bangumi.userId
	// anime是动态请求获取数据，所以是实时数据，目前缺点是需要手动F5刷新一次才加载数据
	// bangumi的数据为编译时获取的，所以不是实时数据
	pages: {
		anime: true, // 追番页面开关，设为false时访问/anime/会返回404
		sponsor: false, // 赞助页面开关
		guestbook: true, // 留言板页面开关，需要配置评论系统
		bangumi: true, // 番组计划页面开关，含追番和游戏
		projects: true, // 项目展示页面开关，设为false时访问/projects/会返回404
		timeline: true, // 时间线页面开关，设为false时访问/timeline/会返回404
		skills: true, // 技能页面开关，设为false时访问/skills/会返回404
	},

	// 文章列表布局配置
	postListLayout: {
		// 默认布局模式："list" 列表模式（单列布局），"grid" 网格模式（双列布局）
		// 如果sidebarConfig.ts中侧边栏配置启用了"both"双侧边栏，则无法使用文章列表"grid"网格（双列）布局
		defaultMode: "list",
		// 是否允许用户切换布局
		allowSwitch: true,

		// 网格布局配置，仅在 defaultMode 为 "grid" 或允许切换布局时生效
		grid: {
			// 是否开启瀑布流布局，同时有封面图和无封面图的混合文章推荐开启
			masonry: true,
		},
	},

	// 分页配置
	pagination: {
		// 每页显示的文章数量
		postsPerPage: 10,
	},

	backgroundWallpaper: {
		// 壁纸模式："banner" 横幅壁纸，"overlay" 全屏透明，"none" 纯色背景无壁纸
		mode: "banner",

		// 背景图片配置
		src: {
			// 桌面背景图片
			desktop: "/assets/images/d1.webp",
			// 移动背景图片
			mobile: "/assets/images/m1.webp",
		},

		// 图片位置
		// 支持所有CSS object-position值，如: 'top', 'center', 'bottom', 'left top', 'right bottom', '25% 75%', '10px 20px'..
		// 如果不知道怎么配置百分百之类的配置，推荐直接使用：'center'居中，'top'顶部居中，'bottom' 底部居中，'left'左侧居中，'right'右侧居中
		banner: {
			position: "0% 20%",
			homeText: {
				// 主页显示自定义文本（全局开关）
				enable: true,
				// 主页横幅主标题
				title: "Lovely firefly!",
				// 主页横幅副标题
				subtitle: [
					"In Reddened Chrysalis, I Once Rest",
					"From Shattered Sky, I Free Fall",
					"Amidst Silenced Stars, I Deep Sleep",
					"Upon Lighted Fyrefly, I Soon Gaze",
					"From Undreamt Night, I Thence Shine",
					"In Finalized Morrow, I Full Bloom",
				],
				typewriter: {
					enable: true, // 启用副标题打字机效果
					speed: 100, // 打字速度（毫秒）
					deleteSpeed: 50, // 删除速度（毫秒）
					pauseTime: 2000, // 完全显示后的暂停时间（毫秒）
				},
			},
			credit: {
				enable: {
					desktop: true, // 桌面端显示横幅图片来源文本
					mobile: false, // 移动端显示横幅图片来源文本
				},
				text: {
					desktop: "晚晚喵", // 桌面端要显示的来源文本
					mobile: "Mobile Credit", // 移动端要显示的来源文本
				},
				url: {
					desktop: "https://www.pixiv.net/artworks/135490046", // 桌面端原始艺术品或艺术家页面的 URL 链接
					mobile: "", // 移动端原始艺术品或艺术家页面的 URL 链接
				},
			},
			navbar: {
				transparentMode: "semifull", // 导航栏透明模式："semi" 半透明加圆角，"full" 完全透明，"semifull" 动态透明
			},
			waves: {
				enable: {
					desktop: true, // 桌面端启用波浪动画效果
					mobile: true, // 移动端启用波浪动画效果
				},
			},
		},

		// 全屏透明覆盖模式特有配置
		overlay: {
			zIndex: -1, // 层级，确保壁纸在背景层
			opacity: 0.8, // 壁纸透明度
			blur: 1, // 背景模糊程度
		},
	},

	// 目录功能
	toc: {
		// 目录功能开关
		enable: true,
		// 目录深度，1-3，1 表示只显示 h1 标题，2 表示显示 h1 和 h2 标题，依此类推
		// depth在新版已弃用
		depth: 3,
	},

	// 字体配置
	// 在src/config/fontConfig.ts中配置具体字体
	font: fontConfig,
};

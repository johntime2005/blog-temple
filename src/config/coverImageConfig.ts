import type { CoverImageConfig } from "../types/config";

/**
 * 文章封面图配置
 *
 * enableInPost - 是否在文章详情页显示封面图
 *
 * 随机封面图使用说明：
 * 1. 在文章的 Frontmatter 中添加 image: "api" 即可使用随机图功能
 * 2. 系统会依次尝试所有配置的 API，全部失败后使用备用图片
 * 3. 如果 enable 为 false，则直接不显示封面图（也不会显示备用图）
 *
 * // 文章 Frontmatter 示例：
 * ---
 * title: 文章标题
 * # 不设置 image 字段，将使用随机封面（当 useAsDefault: true 时）
 * ---
 */
export const coverImageConfig: CoverImageConfig = {
	// 是否在文章详情页显示封面图
	enableInPost: true,

	// 随机封面图功能开关
	enable: true,

	// 当文章未设置 image 字段时，是否默认使用随机封面图
	useAsDefault: true,

	// 封面图API列表
	apis: [
		"https://t.alcy.cc/pc",
		"https://www.dmoe.cc/random.php",
		"https://uapis.cn/api/v1/random/image?category=acg&type=pc",
	],

	// 备用图片路径
	fallback: "/assets/images/cover.webp",

	/**
	 * 加载指示器配置
	 * - 自定义加载图片和背景色，用于在图片加载过程中显示
	 * - 如果不配置，将使用默认的 loading.gif 和 #fefefe 背景色
	 */
	loading: {
		// 加载指示器开关
		enable: true,
		// 自定义加载图片路径（相对于 public 目录）
		image: "/assets/images/loading.gif",
		// 加载指示器背景颜色，应与加载图片的背景色一致，避免在暗色模式下显得突兀
		backgroundColor: "#fefefe",
	},

	watermark: {
		// 是否显示水印
		enable: true,
		// 水印文本
		text: "Firefly Theme",
		// 水印位置
		position: "bottom-right",
		// 水印透明度
		opacity: 0.6,
		// 字体大小
		fontSize: "0.75rem",
		// 文字颜色
		color: "#ffffff",
		// 背景颜色
		backgroundColor: "rgba(0, 0, 0, 0.3)",
	},
};

import type { APIRoute } from "astro";
import JSZip from "jszip";
import type { SetupData } from "../../types/setup";
import {
	escapeStringLiteral,
	isValidUrl,
	securityHeaders,
	validateNumber,
	validateOrigin,
	validateString,
} from "../../utils/security";

// 请求大小限制（10KB）
const MAX_REQUEST_SIZE = 10 * 1024;

export const POST: APIRoute = async ({ request }) => {
	try {
		// 🔒 安全检查：请求大小限制
		const contentLength = request.headers.get("content-length");
		if (
			contentLength &&
			Number.parseInt(contentLength, 10) > MAX_REQUEST_SIZE
		) {
			return new Response(JSON.stringify({ error: "请求体过大" }), {
				status: 413,
				headers: { "Content-Type": "application/json", ...securityHeaders },
			});
		}

		// 🔒 安全检查：验证请求来源（严格同源检查）
		const origin = request.headers.get("origin");
		const host = request.headers.get("host");

		if (!validateOrigin(origin, host)) {
			console.error("[API] 拒绝跨域请求:", { origin, host });
			return new Response(JSON.stringify({ error: "不允许的请求来源" }), {
				status: 403,
				headers: { "Content-Type": "application/json", ...securityHeaders },
			});
		}

		// 🔒 安全检查：验证 Content-Type
		const contentType = request.headers.get("content-type");
		if (!contentType || contentType !== "application/json") {
			return new Response(JSON.stringify({ error: "不支持的内容类型" }), {
				status: 415,
				headers: { "Content-Type": "application/json", ...securityHeaders },
			});
		}

		let data: SetupData;
		try {
			data = await request.json();
		} catch {
			return new Response(JSON.stringify({ error: "无效的 JSON 格式" }), {
				status: 400,
				headers: { "Content-Type": "application/json", ...securityHeaders },
			});
		}

		// 🔒 安全检查：验证输入数据
		const validationError = validateSetupData(data);
		if (validationError) {
			return new Response(JSON.stringify({ error: validationError }), {
				status: 400,
				headers: { "Content-Type": "application/json", ...securityHeaders },
			});
		}

		// 生成配置文件内容（使用安全转义）
		const siteConfigContent = generateSiteConfig(data);
		const profileConfigContent = generateProfileConfig(data);
		const astroConfigContent = generateAstroConfig(data);
		const robotsTxtContent = generateRobotsTxt(data);
		const readmeContent = generateReadme(data);

		// 使用 JSZip 打包
		const zip = new JSZip();
		const configFolder = zip.folder("src/config");
		const publicFolder = zip.folder("public");

		configFolder?.file("siteConfig.ts", siteConfigContent);
		configFolder?.file("profileConfig.ts", profileConfigContent);
		zip.file("astro.config.mjs", astroConfigContent);
		publicFolder?.file("robots.txt", robotsTxtContent);
		zip.file("README_SETUP.md", readmeContent);

		const zipBlob = await zip.generateAsync({ type: "blob" });

		return new Response(zipBlob, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": "attachment; filename=firefly-config.zip",
				...securityHeaders,
			},
		});
	} catch (error) {
		console.error("生成配置文件失败:", error);
		return new Response(JSON.stringify({ error: "生成配置文件失败" }), {
			status: 500,
			headers: { "Content-Type": "application/json", ...securityHeaders },
		});
	}
};

/**
 * 验证设置数据
 */
function validateSetupData(data: SetupData): string | null {
	// 验证 siteInfo
	if (!data.siteInfo) {
		return "缺少站点信息";
	}

	if (!isValidUrl(data.siteInfo.siteUrl)) {
		return "无效的站点 URL";
	}

	if (!validateString(data.siteInfo.title, 1, 100)) {
		return "站点标题无效（1-100字符）";
	}

	if (!validateString(data.siteInfo.subtitle, 1, 200)) {
		return "站点副标题无效（1-200字符）";
	}

	if (!validateString(data.siteInfo.description, 1, 500)) {
		return "站点描述无效（1-500字符）";
	}

	// 验证 profileInfo
	if (!data.profileInfo) {
		return "缺少个人资料信息";
	}

	if (!validateString(data.profileInfo.name, 1, 50)) {
		return "名称无效（1-50字符）";
	}

	if (!validateString(data.profileInfo.bio, 1, 200)) {
		return "简介无效（1-200字符）";
	}

	// 验证可选字段格式
	if (data.profileInfo.githubUsername) {
		// GitHub 用户名：字母数字和连字符，最长39字符
		if (
			!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/.test(
				data.profileInfo.githubUsername,
			)
		) {
			return "无效的 GitHub 用户名格式";
		}
	}

	if (data.profileInfo.bilibiliUid) {
		// Bilibili UID：纯数字
		if (!/^\d{1,15}$/.test(data.profileInfo.bilibiliUid)) {
			return "无效的 Bilibili UID 格式";
		}
	}

	if (data.profileInfo.bangumiUserId) {
		// Bangumi 用户 ID：纯数字
		if (!/^\d{1,10}$/.test(data.profileInfo.bangumiUserId)) {
			return "无效的 Bangumi 用户 ID 格式";
		}
	}

	// 验证 themeConfig
	if (!data.themeConfig) {
		return "缺少主题配置";
	}

	if (!validateNumber(data.themeConfig.themeHue, 0, 360)) {
		return "主题色相值无效（0-360）";
	}

	return null;
}

/**
 * 生成 siteConfig.ts 内容（使用安全转义）
 */
function generateSiteConfig(data: SetupData): string {
	const { siteInfo, themeConfig } = data;

	// 安全转义所有字符串
	const title = escapeStringLiteral(siteInfo.title);
	const subtitle = escapeStringLiteral(siteInfo.subtitle);
	const description = escapeStringLiteral(siteInfo.description);
	const bangumiUserId = escapeStringLiteral(
		data.profileInfo.bangumiUserId || "",
	);

	// 处理关键词数组
	const keywords = siteInfo.keywords
		? siteInfo.keywords
				.split(",")
				.map((k) => `"${escapeStringLiteral(k.trim())}"`)
		: [];

	return `import type { SiteConfig } from "../types/config";
import { fontConfig } from "./fontConfig";

// 定义站点语言
const SITE_LANG = "zh_CN";

export const siteConfig: SiteConfig = {
	initialized: true,

	title: "${title}",
	subtitle: "${subtitle}",
	description: "${description}",
	keywords: [${keywords.join(", ")}],

	lang: SITE_LANG,

	themeColor: {
		hue: ${themeConfig.themeHue},
		fixed: false,
		defaultMode: "system",
	},

	favicon: [
		{
			src: "/assets/images/favicon.ico",
			theme: "light",
			sizes: "32x32",
		},
	],

	logoIcon: {
		type: "image",
		value: "/assets/images/LiuYingPure3.svg",
		alt: "🍀",
	},

	bangumi: {
		userId: "${bangumiUserId}",
	},

	showLastModified: true,
	generateOgImages: false,

	pages: {
		anime: ${data.profileInfo.bangumiUserId ? "true" : "false"},
		projects: true,
		timeline: true,
		skills: true,
	},

	postListLayout: {
		defaultMode: "list",
		allowSwitch: true,
	},

	pagination: {
		postsPerPage: 8,
	},

	backgroundWallpaper: {
		enable: true,
		mode: "banner",
		src: {
			desktop: "/assets/images/d1.webp",
			mobile: "/assets/images/m1.webp",
		},
		position: "0% 20%",
		banner: {
			homeText: {
				enable: true,
				title: "${title}",
				subtitle: [
					"${subtitle}",
					"In Reddened Chrysalis, I Once Rest",
					"From Shattered Sky, I Free Fall",
					"Amidst Silenced Stars, I Deep Sleep",
				],
				typewriter: {
					enable: true,
					speed: 100,
					deleteSpeed: 50,
					pauseTime: 2000,
				},
			},
			credit: {
				enable: {
					desktop: true,
					mobile: false,
				},
				text: {
					desktop: "晚晚喵",
					mobile: "Mobile Credit",
				},
				url: {
					desktop: "https://www.pixiv.net/artworks/135490046",
					mobile: "",
				},
			},
			navbar: {
				transparentMode: "semifull",
			},
			waves: {
				enable: {
					desktop: true,
					mobile: true,
				},
			},
		},
		overlay: {
			zIndex: -1,
			opacity: 0.8,
			blur: 1,
		},
	},

	toc: {
		enable: true,
		depth: 3,
	},

	font: fontConfig,
};
`;
}

/**
 * 生成 profileConfig.ts 内容（使用安全转义）
 */
function generateProfileConfig(data: SetupData): string {
	const { profileInfo } = data;

	// 安全转义
	const name = escapeStringLiteral(profileInfo.name);
	const bio = escapeStringLiteral(profileInfo.bio);
	const githubUsername = escapeStringLiteral(profileInfo.githubUsername || "");
	const bilibiliUid = escapeStringLiteral(profileInfo.bilibiliUid || "");

	const links: string[] = [];

	if (profileInfo.githubUsername) {
		links.push(`\t\t{
			name: "GitHub",
			icon: "fa6-brands:github",
			url: "https://github.com/${githubUsername}",
		}`);
	}

	if (profileInfo.bilibiliUid) {
		links.push(`\t\t{
			name: "Bilibili",
			icon: "fa6-brands:bilibili",
			url: "https://space.bilibili.com/${bilibiliUid}",
		}`);
	}

	return `import type { ProfileConfig } from "../types/config";

export const profileConfig: ProfileConfig = {
	avatar: "/assets/images/avatar.webp",
	name: "${name}",
	bio: "${bio}",
	links: [
${links.join(",\n")}
	],
};
`;
}

/**
 * 生成 astro.config.mjs 内容
 */
function generateAstroConfig(data: SetupData): string {
	// URL 已经在 validateSetupData 中验证过
	const siteUrl = data.siteInfo.siteUrl;

	return `import sitemap from "@astrojs/sitemap";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import swup from "@swup/astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeComponents from "rehype-components";
import rehypeKatex from "rehype-katex";
import rehypeSlug from "rehype-slug";
import remarkDirective from "remark-directive";
import remarkGithubAdmonitionsToDirectives from "remark-github-admonitions-to-directives";
import remarkMath from "remark-math";
import remarkSectionize from "remark-sectionize";
import { expressiveCodeConfig, siteConfig } from "./src/config";
import { pluginCustomCopyButton } from "./src/plugins/expressive-code/custom-copy-button.js";
import { pluginLanguageBadge } from "./src/plugins/expressive-code/language-badge.ts";
import { AdmonitionComponent } from "./src/plugins/rehype-component-admonition.mjs";
import { GithubCardComponent } from "./src/plugins/rehype-component-github-card.mjs";
import { rehypeMermaid } from "./src/plugins/rehype-mermaid.mjs";
import { parseDirectiveNode } from "./src/plugins/remark-directive-rehype.js";
import { remarkExcerpt } from "./src/plugins/remark-excerpt.js";
import { remarkMermaid } from "./src/plugins/remark-mermaid.js";
import { remarkReadingTime } from "./src/plugins/remark-reading-time.mjs";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: "${siteUrl}",
  base: "/",
  trailingSlash: "always",

  integrations: [
      tailwind({ nesting: true }),
      swup({
          theme: false,
          animationClass: "transition-swup-",
          containers: ["main"],
          smoothScrolling: false,
          cache: true,
          preload: false,
          accessibility: true,
          updateHead: true,
          updateBodyClass: false,
          globalInstance: true,
          resolveUrl: (url) => url,
          animateHistoryBrowsing: false,
          skipPopStateHandling: (event) => {
              return event.state && event.state.url && event.state.url.includes("#");
          },
      }),
      icon({
          include: {
              "preprocess: vitePreprocess(),": ["*"],
              "fa6-brands": ["*"],
              "fa6-regular": ["*"],
              "fa6-solid": ["*"],
              mdi: ["*"],
          },
      }),
      expressiveCode({
          themes: [expressiveCodeConfig.theme, expressiveCodeConfig.theme],
          plugins: [
              pluginCollapsibleSections(),
              pluginLineNumbers(),
              pluginLanguageBadge(),
              pluginCustomCopyButton(),
          ],
          defaultProps: {
              wrap: true,
              overridesByLang: {
                  shellsession: { showLineNumbers: false },
              },
          },
          styleOverrides: {
              codeBackground: "var(--codeblock-bg)",
              borderRadius: "0.75rem",
              borderColor: "none",
              codeFontSize: "0.875rem",
              codeFontFamily: "'JetBrains Mono Variable', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              codeLineHeight: "1.5rem",
              frames: {
                  editorBackground: "var(--codeblock-bg)",
                  terminalBackground: "var(--codeblock-bg)",
                  terminalTitlebarBackground: "var(--codeblock-topbar-bg)",
                  editorTabBarBackground: "var(--codeblock-topbar-bg)",
                  editorActiveTabBackground: "none",
                  editorActiveTabIndicatorBottomColor: "var(--primary)",
                  editorActiveTabIndicatorTopColor: "none",
                  editorTabBarBorderBottomColor: "var(--codeblock-topbar-bg)",
                  terminalTitlebarBorderBottomColor: "none",
              },
              textMarkers: {
                  delHue: 0,
                  insHue: 180,
                  markHue: 250,
              },
          },
          frames: { showCopyToClipboardButton: false },
      }),
      svelte(),
      sitemap({
          filter: (page) => {
              const url = new URL(page);
              const pathname = url.pathname;
              if (pathname === '/anime/' && !siteConfig.pages.anime) return false;
              if (pathname === '/projects/' && !siteConfig.pages.projects) return false;
              if (pathname === '/timeline/' && !siteConfig.pages.timeline) return false;
              if (pathname === '/skills/' && !siteConfig.pages.skills) return false;
              return true;
          },
      }),
  ],

  markdown: {
      remarkPlugins: [
          remarkMath,
          remarkReadingTime,
          remarkExcerpt,
          remarkGithubAdmonitionsToDirectives,
          remarkDirective,
          remarkSectionize,
          parseDirectiveNode,
          remarkMermaid,
      ],
      rehypePlugins: [
          rehypeKatex,
          rehypeSlug,
          rehypeMermaid,
          [
              rehypeComponents,
              {
                  components: {
                      github: GithubCardComponent,
                      note: (x, y) => AdmonitionComponent(x, y, "note"),
                      tip: (x, y) => AdmonitionComponent(x, y, "tip"),
                      important: (x, y) => AdmonitionComponent(x, y, "important"),
                      caution: (x, y) => AdmonitionComponent(x, y, "caution"),
                      warning: (x, y) => AdmonitionComponent(x, y, "warning"),
                  },
              },
          ],
          [
              rehypeAutolinkHeadings,
              {
                  behavior: "append",
                  properties: { className: ["anchor"] },
                  content: {
                      type: "element",
                      tagName: "span",
                      properties: { className: ["anchor-icon"], "data-pagefind-ignore": true },
                      children: [{ type: "text", value: "#" }],
                  },
              },
          ],
      ],
  },

  vite: {
      build: {
          rollupOptions: {
              onwarn(warning, warn) {
                  if (
                      warning.message.includes("is dynamically imported by") &&
                      warning.message.includes("but also statically imported by")
                  ) {
                      return;
                  }
                  warn(warning);
              },
          },
      },
  },

  adapter: cloudflare(),
});
`;
}

/**
 * 生成 robots.txt 内容
 */
function generateRobotsTxt(data: SetupData): string {
	return `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Sitemap: ${data.siteInfo.siteUrl}sitemap-index.xml
`;
}

/**
 * 生成 README 说明文件（使用安全转义）
 */
function generateReadme(data: SetupData): string {
	const title = escapeStringLiteral(data.siteInfo.title);
	const name = escapeStringLiteral(data.profileInfo.name);

	return `# 🎉 Firefly 博客配置文件

## 配置信息

- **网站标题**: ${title}
- **网站 URL**: ${data.siteInfo.siteUrl}
- **作者**: ${name}

## 📥 如何使用这些配置文件

### 1. 解压文件

将下载的 \`firefly-config.zip\` 解压到本地。

### 2. 克隆你的仓库

\`\`\`bash
git clone <你的 GitHub 仓库地址>
cd <仓库目录>
\`\`\`

### 3. 复制配置文件

将解压后的文件复制到对应位置：

\`\`\`bash
# 复制配置文件
cp firefly-config/src/config/siteConfig.ts src/config/
cp firefly-config/src/config/profileConfig.ts src/config/
cp firefly-config/astro.config.mjs .
cp firefly-config/public/robots.txt public/
\`\`\`

### 4. 提交到 GitHub

\`\`\`bash
git add .
git commit -m "chore: 完成初始化配置"
git push
\`\`\`

### 5. 等待自动部署

Cloudflare Pages 会自动检测到提交并重新部署你的网站。

## 🎨 下一步

- **替换图片**: 在 \`public/assets/images/\` 目录下替换头像、Logo 和背景图
- **创建文章**: 使用 \`pnpm new-post 文章标题\` 创建新文章
- **自定义配置**: 查看 \`src/config/\` 目录下的其他配置文件

## ❓ 遇到问题？

如果遇到任何问题，请：
1. 检查 GitHub 仓库的 Actions 标签页查看构建日志
2. 查看 [Issues](https://github.com/johntime2005/blog/issues)
3. 参考项目文档

祝你创作愉快！✨
`;
}

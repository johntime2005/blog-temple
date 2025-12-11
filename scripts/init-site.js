#!/usr/bin/env node

/**
 * 网站初始化脚本
 * 用于在一键部署到 Cloudflare 时自动配置所有个性化选项
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

// 创建命令行交互接口
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// 包装 readline.question 为 Promise
function question(query) {
	return new Promise((resolve) => {
		rl.question(query, resolve);
	});
}

// 颜色输出辅助函数
const colors = {
	reset: "\x1b[0m",
	bright: "\x1b[1m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	red: "\x1b[31m",
};

function log(message, color = "reset") {
	console.log(`${colors[color]}${message}${colors.reset}`);
}

// 读取文件并替换内容
function updateFile(filePath, replacements) {
	try {
		let content = fs.readFileSync(filePath, "utf-8");

		for (const [search, replace] of Object.entries(replacements)) {
			content = content.replace(new RegExp(search, "g"), replace);
		}

		fs.writeFileSync(filePath, content, "utf-8");
		log(`✓ 已更新: ${path.relative(rootDir, filePath)}`, "green");
		return true;
	} catch (error) {
		log(`✗ 更新失败: ${path.relative(rootDir, filePath)}`, "red");
		console.error(error.message);
		return false;
	}
}

// 生成 robots.txt
function generateRobotsTxt(siteUrl) {
	const content = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Sitemap: ${siteUrl}sitemap-index.xml
`;

	const robotsPath = path.join(rootDir, "public", "robots.txt");
	try {
		fs.writeFileSync(robotsPath, content, "utf-8");
		log("✓ 已生成: public/robots.txt", "green");
		return true;
	} catch (error) {
		log("✗ 生成 robots.txt 失败", "red");
		console.error(error.message);
		return false;
	}
}

// 主函数
async function main() {
	log("\n🚀 Firefly 博客初始化向导\n", "bright");
	log("此向导将帮助你配置个性化信息\n", "blue");

	// 询问网站信息
	log("=== 网站基本信息 ===\n", "yellow");

	const siteUrl = await question(
		"网站 URL (例如: https://blog.example.com/): ",
	);
	const siteTitle = await question("网站标题 (例如: 我的博客): ");
	const siteSubtitle = await question("网站副标题 (例如: 记录生活，分享技术): ");
	const siteDescription = await question(
		"网站描述 (用于 SEO，可以稍长一点): ",
	);

	log("\n=== 个人信息 ===\n", "yellow");

	const authorName = await question("你的名字/昵称: ");
	const authorBio = await question("个人简介 (一句话介绍自己): ");
	const githubUsername = await question("GitHub 用户名 (留空跳过): ");
	const bilibiliUid = await question("Bilibili UID (留空跳过): ");
	const bangumiUserId = await question("Bangumi 用户 ID (留空跳过): ");

	log("\n=== 主题配置 ===\n", "yellow");

	const themeHue = await question(
		"主题色色相 (0-360，默认155绿色系，200蓝色系，0红色系): ",
	);

	rl.close();

	log("\n\n开始更新配置文件...\n", "bright");

	// 确保 URL 以斜杠结尾
	const normalizedUrl = siteUrl.endsWith("/") ? siteUrl : `${siteUrl}/`;

	// 1. 更新 astro.config.mjs
	updateFile(path.join(rootDir, "astro.config.mjs"), {
		'site: "https://demo-firefly.netlify.app/"': `site: "${normalizedUrl}"`,
	});

	// 2. 更新 siteConfig.ts
	const siteConfigPath = path.join(rootDir, "src", "config", "siteConfig.ts");
	const siteConfigReplacements = {
		'title: "johntime 的博客"': `title: "${siteTitle}"`,
		'subtitle: "记录生活，分享技术"': `subtitle: "${siteSubtitle}"`,
		'description:\\s*"[^"]*"': `description: "${siteDescription}"`,
	};

	if (themeHue && themeHue.trim() !== "") {
		siteConfigReplacements["hue: 155"] = `hue: ${themeHue.trim()}`;
	}

	if (bangumiUserId && bangumiUserId.trim() !== "") {
		siteConfigReplacements['userId: "1176159"'] =
			`userId: "${bangumiUserId.trim()}"`;
	}

	updateFile(siteConfigPath, siteConfigReplacements);

	// 3. 更新 profileConfig.ts
	const profileConfigPath = path.join(
		rootDir,
		"src",
		"config",
		"profileConfig.ts",
	);
	const profileConfigReplacements = {
		'name: "johntime"': `name: "${authorName}"`,
		'bio: "热爱技术，喜欢折腾，记录生活。"': `bio: "${authorBio}"`,
	};

	// 更新 GitHub 链接
	if (githubUsername && githubUsername.trim() !== "") {
		profileConfigReplacements['url: "https://github.com/johntime2005"'] =
			`url: "https://github.com/${githubUsername.trim()}"`;
	}

	// 更新 Bilibili 链接
	if (bilibiliUid && bilibiliUid.trim() !== "") {
		profileConfigReplacements['url: "https://space.bilibili.com/456736081"'] =
			`url: "https://space.bilibili.com/${bilibiliUid.trim()}"`;
	}

	updateFile(profileConfigPath, profileConfigReplacements);

	// 4. 生成 robots.txt
	generateRobotsTxt(normalizedUrl);

	// 5. 完成提示
	log("\n\n✨ 初始化完成！\n", "green");
	log("已更新的文件：", "bright");
	log("  - astro.config.mjs", "blue");
	log("  - src/config/siteConfig.ts", "blue");
	log("  - src/config/profileConfig.ts", "blue");
	log("  - public/robots.txt (新建)", "blue");

	log("\n下一步操作：", "yellow");
	log("  1. 运行 `pnpm dev` 预览更改", "blue");
	log("  2. 运行 `pnpm build` 构建生产版本", "blue");
	log("  3. 部署到 Cloudflare Pages", "blue");

	log("\n💡 提示：", "yellow");
	log("  - 你可以随时修改 src/config/*.ts 文件进行更多自定义", "blue");
	log("  - 替换 public/assets/images/ 下的图片文件", "blue");
	log("  - 在 src/content/posts/ 下创建你的第一篇文章", "blue");

	log("\n更多帮助请查看 CLAUDE.md 文档\n", "blue");
}

// 运行主函数
main().catch((error) => {
	log("\n✗ 初始化过程中出现错误", "red");
	console.error(error);
	process.exit(1);
});

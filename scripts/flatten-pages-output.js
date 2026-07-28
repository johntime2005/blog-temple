/**
 * 把 @astrojs/cloudflare 的产物摊平成 Cloudflare Pages 可直接发布的目录结构。
 *
 * 背景：
 * 适配器按 Cloudflare Workers 的约定输出——静态资源在 dist/client/，
 * SSR worker 在 dist/server/。而本站部署在 Cloudflare Pages 上，
 * 发布目录是 dist/，于是整站被下移一层，线上所有 HTML/CSS/JS/图片
 * 都变成 /client/*，访问 / 与 /_astro/* 全部 404。
 *
 * 之所以在构建后摊平，而不是去改 pages_build_output_dir：
 * Pages 究竟读 wrangler.toml、wrangler.jsonc 还是 Dashboard 里的设置并不确定，
 * 适配器还会写 .wrangler/deploy/config.json 做配置重定向。
 * 让 dist/ 本身就是正确的站点根目录，无论哪一份配置生效结果都一致。
 *
 * 动作：
 *   dist/client/** -> dist/**
 *   dist/server/   -> .astro-cloudflare-server/（移出发布目录，避免服务端代码被当静态文件公开）
 *   删除 .wrangler/deploy/config.json（它指向已被移走的 dist/server/wrangler.json）
 *
 * ⚠️ CF_WORKERS=1 时不摊平：那条路径要的正是 Workers 的 client/server 结构。
 */

import { existsSync } from "node:fs";
import { readdir, rename, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const clientDir = join(dist, "client");
const serverDir = join(dist, "server");
const serverStash = join(root, ".astro-cloudflare-server");
// 适配器写入的「重定向配置」，指向 dist/server/wrangler.json。
// 摊平后目标不存在，任何 wrangler 命令都会直接报错退出，必须一并清掉。
const deployConfigDir = join(root, ".wrangler", "deploy");

async function main() {
	if (process.env.CF_WORKERS) {
		console.log("[flatten] CF_WORKERS 已设置，保留 Workers 目录结构，跳过。");
		return;
	}

	if (!existsSync(clientDir)) {
		// 已经是摊平结构（或适配器行为变更），无需处理
		console.log("[flatten] dist/client 不存在，跳过。");
		return;
	}

	// 先把 server 移出 dist，避免它在摊平后混进发布目录被公开访问
	if (existsSync(serverDir)) {
		await rm(serverStash, { recursive: true, force: true });
		await rename(serverDir, serverStash);
		console.log("[flatten] dist/server -> .astro-cloudflare-server/");
	}

	// 此时 dist 下应当只剩 client，逐项上移
	const entries = await readdir(clientDir);
	for (const name of entries) {
		const target = join(dist, name);
		await rm(target, { recursive: true, force: true });
		await rename(join(clientDir, name), target);
	}
	await rm(clientDir, { recursive: true, force: true });

	console.log(
		`[flatten] 已摊平 ${entries.length} 个条目：dist/client/** -> dist/**`,
	);

	// 清掉悬空的重定向配置，恢复「wrangler 读根目录 wrangler.toml」的默认行为
	if (existsSync(deployConfigDir)) {
		await rm(deployConfigDir, { recursive: true, force: true });
		console.log("[flatten] 已移除悬空的 .wrangler/deploy 重定向配置。");
	}

	// 兜底自检：站点根必须有 index.html，否则 Pages 会整站 404
	if (!existsSync(join(dist, "index.html"))) {
		throw new Error(
			"[flatten] 摊平后 dist/index.html 不存在，构建产物异常，请检查 astro build 输出。",
		);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});

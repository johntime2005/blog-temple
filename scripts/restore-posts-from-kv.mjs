#!/usr/bin/env node

/**
 * 从 Cloudflare Workers KV 恢复文章到本地
 *
 * 使用前需要设置环境变量：
 * - CLOUDFLARE_ACCOUNT_ID: Cloudflare 账户 ID
 * - CLOUDFLARE_API_TOKEN: Cloudflare API Token
 * - CLOUDFLARE_BACKUP_KV_NAMESPACE_ID: KV 命名空间 ID
 * - CLOUDFLARE_BACKUP_PREFIX: KV key 前缀(可选，默认 "posts:")
 *
 * 或在项目根目录创建 .env.backup 文件
 */

import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, normalize, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试加载 .env.backup 文件
try {
	const envPath = join(__dirname, "../.env.backup");
	const envFile = readFileSync(envPath, "utf-8");
	for (const line of envFile.split("\n")) {
		const [key, value] = line.split("=");
		if (key && value) {
			process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
		}
	}
} catch (error) {
	// 忽略错误，_error可能已通过其他方式设置
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const KV_NAMESPACE_ID = process.env.CLOUDFLARE_BACKUP_KV_NAMESPACE_ID;
const KEY_PREFIX = (process.env.CLOUDFLARE_BACKUP_PREFIX || "posts:").trim();

if (!ACCOUNT_ID || !API_TOKEN || !KV_NAMESPACE_ID) {
	console.error("❌ 错误：缺少必要的环境变量");
	console.error("\n请设置以下环境变量或创建 .env.backup 文件：");
	console.error("  - CLOUDFLARE_ACCOUNT_ID");
	console.error("  - CLOUDFLARE_API_TOKEN");
	console.error("  - CLOUDFLARE_BACKUP_KV_NAMESPACE_ID");
	console.error("\n示例 .env.backup 文件：");
	console.error("CLOUDFLARE_ACCOUNT_ID=your-account-id");
	console.error("CLOUDFLARE_API_TOKEN=your-api-token");
	console.error("CLOUDFLARE_BACKUP_KV_NAMESPACE_ID=your-namespace-id");
	console.error("CLOUDFLARE_BACKUP_PREFIX=posts:");
	process.exit(1);
}

const KV_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}`;

/**
 * 获取 KV value 文本
 */
async function kvGetValueText(key) {
	const url = `${KV_API_BASE}/values/${encodeURIComponent(key)}`;
	const response = await fetch(url, {
		method: "GET",
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
		},
	});

	if (response.status === 404) {
		return null;
	}

	if (!response.ok) {
		throw new Error(`KV 获取失败 (${response.status})`);
	}

	return response.text();
}

/**
 * 列出所有 keys（带前缀）
 */
async function listKeys(prefix) {
	const keys = [];
	let cursor = undefined;
	let done = false;

	while (!done) {
		const query = cursor
			? `/keys?prefix=${encodeURIComponent(prefix)}&cursor=${encodeURIComponent(
					cursor
				)}`
			: `/keys?prefix=${encodeURIComponent(prefix)}`;
		const url = `${KV_API_BASE}${query}`;
		const response = await fetch(url, {
			method: "GET",
			headers: {
				Authorization: `Bearer ${API_TOKEN}`,
				"Content-Type": "application/json",
			},
		});
		const data = await response.json();
		if (!data.success) {
			throw new Error(data.errors?.[0]?.message || "API request failed");
		}

		if (Array.isArray(data.result)) {
			keys.push(...data.result.map((item) => item.name));
		}

		const info = data.result_info;
		if (info?.complete) {
			done = true;
		} else if (info?.cursor) {
			cursor = info.cursor;
		} else {
			done = true;
		}
	}

	return keys;
}

/**
 * 安全化相对路径，防止越界
 */
function ensureSafeRelativePath(inputPath) {
	const normalized = normalize(inputPath).replace(/\\/g, "/");
	if (isAbsolute(normalized)) {
		throw new Error(`非法路径(绝对路径): ${inputPath}`);
	}
	if (normalized.startsWith("..") || normalized.split("/").includes("..")) {
		throw new Error(`非法路径(越界): ${inputPath}`);
	}
	return normalized;
}

/**
 * 恢复文章
 */
async function restorePosts() {
	const postsDir = join(__dirname, "../src/content/posts");
	const normalizedPrefix = KEY_PREFIX.endsWith(":")
		? KEY_PREFIX
		: `${KEY_PREFIX}:`;
	const indexKey = `${normalizedPrefix}index`;
	const now = new Date().toISOString();

	let entries = null;

	const indexContent = await kvGetValueText(indexKey);
	if (indexContent) {
		try {
			const indexData = JSON.parse(indexContent);
			if (Array.isArray(indexData?.files) && indexData.files.length > 0) {
				entries = indexData.files.map((item) => ({
					key: item.key,
					path: item.path,
				}));
			}
		} catch (error) {
			// 索引解析失败，回退到 keys 列表
		}
	}

	if (!entries) {
		const keys = await listKeys(normalizedPrefix);
		entries = keys
			.filter((key) => key !== indexKey)
			.map((key) => ({
				key,
				path: key.replace(normalizedPrefix, ""),
			}));
	}

	if (!entries || entries.length === 0) {
		console.log("⚠️ 未找到任何可恢复的文章");
		return;
	}

	console.log(`📥 共发现 ${entries.length} 篇文章，开始恢复...`);

	let restoredCount = 0;
	for (const entry of entries) {
		const relativePath = ensureSafeRelativePath(entry.path);
		const targetPath = join(postsDir, relativePath);
		const content = await kvGetValueText(entry.key);

		if (content === null) {
			console.log(`⚠️ 未找到内容: ${entry.key}`);
			continue;
		}

		await mkdir(dirname(targetPath), { recursive: true });
		await writeFile(targetPath, content, "utf-8");
		restoredCount += 1;

		console.log(`✅ 已恢复: ${relativePath}`);
	}

	console.log(`\n🎉 恢复完成 (${restoredCount}/${entries.length}) @ ${now}`);
}

/**
 * 主函数
 */
async function main() {
	try {
		await restorePosts();
	} catch (error) {
		console.error(`\n❌ 恢复失败: ${error.message}`);
		process.exit(1);
	}
}

main();

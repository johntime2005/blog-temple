#!/usr/bin/env node

/**
 * 文章备份到 Cloudflare Workers KV
 *
 * 使用前需要设置环境变量：
 * - CLOUDFLARE_ACCOUNT_ID: Cloudflare 账户 ID
 * - CLOUDFLARE_API_TOKEN: Cloudflare API Token
 * - CLOUDFLARE_BACKUP_KV_NAMESPACE_ID: KV 命名空间 ID
 * - CLOUDFLARE_BACKUP_PREFIX: KV key 前缀(可选，默认 "posts:")
 *
 * 或在项目根目录创建 .env.backup 文件
 */

import { readFileSync, statSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { glob } from "glob";

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
 * 调用 Cloudflare KV API
 */
async function kvRequest(method, path, body = null) {
	const url = `${KV_API_BASE}${path}`;
	const options = {
		method,
		headers: {
			Authorization: `Bearer ${API_TOKEN}`,
			"Content-Type": "application/json",
		},
	};

	if (body) {
		options.body = JSON.stringify(body);
	}

	const response = await fetch(url, options);
	const data = await response.json();

	if (!data.success) {
		throw new Error(data.errors?.[0]?.message || "API request failed");
	}

	return data.result;
}

/**
 * 写入 KV
 */
async function putValue(key, value, metadata) {
	return kvRequest("PUT", `/values/${encodeURIComponent(key)}`, {
		value,
		metadata,
	});
}

/**
 * 备份文章
 */
async function backupPosts() {
	const postsDir = join(__dirname, "../src/content/posts");
	const files = await glob("**/*.md", { cwd: postsDir, nodir: true });

	if (files.length === 0) {
		console.log("⚠️ 未找到需要备份的文章");
		return;
	}

	const now = new Date().toISOString();
	const normalizedPrefix = KEY_PREFIX.endsWith(":")
		? KEY_PREFIX
		: `${KEY_PREFIX}:`;

	console.log(`📦 共发现 ${files.length} 篇文章，开始备份...`);

	const indexEntries = [];
	const sortedFiles = files.sort();

	for (const relativePath of sortedFiles) {
		const normalizedPath = relativePath.replace(/\\/g, "/");
		const absolutePath = join(postsDir, relativePath);
		const content = await readFile(absolutePath, "utf-8");
		const stats = statSync(absolutePath);
		const key = `${normalizedPrefix}${normalizedPath}`;

		await putValue(key, content, {
			path: normalizedPath,
			size: stats.size,
			mtime: stats.mtime.toISOString(),
			backedUpAt: now,
		});

		indexEntries.push({
			key,
			path: normalizedPath,
			size: stats.size,
			mtime: stats.mtime.toISOString(),
		});

		console.log(`✅ 已备份: ${normalizedPath}`);
	}

	const indexKey = `${normalizedPrefix}index`;
	await putValue(
		indexKey,
		JSON.stringify(
			{
				version: 1,
				updatedAt: now,
				count: indexEntries.length,
				files: indexEntries,
			},
			null,
			2
		),
		{
			updatedAt: now,
			count: indexEntries.length,
		}
	);

	console.log(`\n🎉 备份完成，索引已写入: ${indexKey}`);
}

/**
 * 主函数
 */
async function main() {
	try {
		await backupPosts();
	} catch (error) {
		console.error(`\n❌ 备份失败: ${error.message}`);
		process.exit(1);
	}
}

main();

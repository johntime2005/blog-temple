#!/usr/bin/env node

/**
 * 文章加密密码管理工具
 *
 * 用于管理 Cloudflare KV 中存储的文章密码
 *
 * 使用前需要设置环境变量：
 * - CLOUDFLARE_ACCOUNT_ID: Cloudflare 账户 ID
 * - CLOUDFLARE_API_TOKEN: Cloudflare API Token
 * - CLOUDFLARE_KV_NAMESPACE_ID: KV 命名空间 ID (POST_ENCRYPTION)
 *
 * 或在项目根目录创建 .env.encryption 文件
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 尝试加载 .env.encryption 文件
try {
	const envPath = join(__dirname, "../.env.encryption");
	const envFile = readFileSync(envPath, "utf-8");
	for (const line of envFile.split("\n")) {
		const [key, value] = line.split("=");
		if (key && value) {
			process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, "");
		}
	}
} catch (error) {
	// 忽略错误，_error能已通过其他方式设置
}

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const KV_NAMESPACE_ID = process.env.CLOUDFLARE_KV_NAMESPACE_ID;

if (!ACCOUNT_ID || !API_TOKEN || !KV_NAMESPACE_ID) {
	console.error("❌ 错误：缺少必要的环境变量");
	console.error("\n请设置以下环境变量或创建 .env.encryption 文件：");
	console.error("  - CLOUDFLARE_ACCOUNT_ID");
	console.error("  - CLOUDFLARE_API_TOKEN");
	console.error("  - CLOUDFLARE_KV_NAMESPACE_ID");
	console.error("\n示例 .env.encryption 文件：");
	console.error("CLOUDFLARE_ACCOUNT_ID=your-account-id");
	console.error("CLOUDFLARE_API_TOKEN=your-api-token");
	console.error("CLOUDFLARE_KV_NAMESPACE_ID=your-namespace-id");
	process.exit(1);
}

const KV_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}`;

/**
 * 计算密码的 SHA-256 哈希
 */
function hashPassword(password) {
	return createHash("sha256").update(password).digest("hex");
}

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
 * 设置文章密码
 */
async function setPassword(encryptionId, password) {
	const passwordHash = hashPassword(password);
	const key = `post:${encryptionId}:password`;

	console.log(`🔐 正在为文章 "${encryptionId}" 设置密码...`);

	await kvRequest("PUT", `/values/${key}`, {
		value: passwordHash,
		metadata: {
			encryptionId,
			createdAt: new Date().toISOString(),
		},
	});

	console.log("✅ 密码设置成功！");
	console.log("\n在文章的 frontmatter 中添加：");
	console.log("---");
	console.log("encrypted: true");
	console.log(`encryptionId: "${encryptionId}"`);
	console.log("---");
}

/**
 * 删除文章密码
 */
async function deletePassword(encryptionId) {
	const key = `post:${encryptionId}:password`;

	console.log(`🗑️  正在删除文章 "${encryptionId}" 的密码...`);

	await kvRequest("DELETE", `/values/${key}`);

	console.log("✅ 密码已删除！");
}

/**
 * 列出所有加密文章
 */
async function listPasswords() {
	console.log("📋 正在获取所有加密文章...");

	const result = await kvRequest("GET", "/keys?prefix=post:");

	if (!result || result.length === 0) {
		console.log("\n暂无加密文章");
		return;
	}

	console.log(`\n找到 ${result.length} 个加密文章：\n`);

	for (const item of result) {
		// 从 key "post:xxx:password" 中提取 encryptionId
		const match = item.name.match(/^post:(.+):password$/);
		if (match) {
			console.log(`  - ${match[1]}`);
		}
	}
}

/**
 * 显示帮助信息
 */
function showHelp() {
	console.log(`
📚 文章加密密码管理工具

用法:
  pnpm manage-password <命令> [参数]

命令:
  set <encryptionId> <password>   设置文章密码
  delete <encryptionId>           删除文章密码
  list                            列出所有加密文章
  help                            显示帮助信息

示例:
  pnpm manage-password set my-secret-post MyPassword123
  pnpm manage-password delete my-secret-post
  pnpm manage-password list

环境变量:
  CLOUDFLARE_ACCOUNT_ID       - Cloudflare 账户 ID
  CLOUDFLARE_API_TOKEN        - Cloudflare API Token
  CLOUDFLARE_KV_NAMESPACE_ID  - KV 命名空间 ID

或在项目根目录创建 .env.encryption 文件
  `);
}

/**
 * 主函数
 */
async function main() {
	const args = process.argv.slice(2);
	const command = args[0];

	try {
		switch (command) {
			case "set": {
				const [, encryptionId, password] = args;
				if (!encryptionId || !password) {
					console.error("❌ 错误：缺少参数");
					console.error(
						"用法: pnpm manage-password set <encryptionId> <password>",
					);
					process.exit(1);
				}
				await setPassword(encryptionId, password);
				break;
			}

			case "delete": {
				const [, encryptionId] = args;
				if (!encryptionId) {
					console.error("❌ 错误：缺少参数");
					console.error("用法: pnpm manage-password delete <encryptionId>");
					process.exit(1);
				}
				await deletePassword(encryptionId);
				break;
			}

			case "list": {
				await listPasswords();
				break;
			}
			default: {
				showHelp();
				break;
			}
		}
	} catch (error) {
		console.error(`\n❌ 错误: ${error.message}`);
		process.exit(1);
	}
}

main();

/**
 * 标签管理 API
 *
 * API 端点: POST /api/admin/tags
 *
 * 支持的操作:
 * - list: 列出所有标签及其使用次数
 * - rename: 重命名标签
 * - merge: 合并标签
 * - delete: 删除标签
 *
 * 注意: 实际的文章更新需要通过生成的脚本完成
 */

import type {
	TagAPIRequest,
	AdminAPIResponse,
} from "../../../src/types/admin";

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface Tag {
	name: string;
	count: number;
	posts: string[];
}

/**
 * 验证管理员 token
 */
async function verifyAdminToken(
	kv: KVNamespace,
	token: string
): Promise<boolean> {
	if (!token) return false;
	const tokenValue = await kv.get(`admin:token:${token}`);
	return tokenValue === "valid";
}

/**
 * 生成标签更新脚本
 */
function generateTagUpdateScript(
	operation: "rename" | "merge" | "delete",
	oldTag: string,
	newTag?: string
): string {
	const scriptLines: string[] = [
		"#!/usr/bin/env node",
		"/**",
		` * 自动生成的标签${operation === "rename" ? "重命名" : operation === "merge" ? "合并" : "删除"}脚本`,
		" * 运行方式: node update-tags.mjs",
		" */",
		"",
		"import fs from 'fs';",
		"import path from 'path';",
		"import matter from 'gray-matter';",
		"import { glob } from 'glob';",
		"",
		`const operation = "${operation}";`,
		`const oldTag = "${oldTag}";`,
		`const newTag = ${newTag ? `"${newTag}"` : "null"};`,
		"",
		"async function updateTags() {",
		"  const files = await glob('src/content/posts/**/*.md');",
		"  let updated = 0;",
		"  ",
		"  for (const filePath of files) {",
		"    try {",
		"      const content = fs.readFileSync(filePath, 'utf-8');",
		"      const { data, content: markdown } = matter(content);",
		"      ",
		"      if (!data.tags || !Array.isArray(data.tags)) continue;",
		"      ",
		"      let hasChanges = false;",
		"      let newTags = [...data.tags];",
		"      ",
		"      switch (operation) {",
		'        case "rename":',
		"          if (newTags.includes(oldTag)) {",
		"            newTags = newTags.map(tag => tag === oldTag ? newTag : tag);",
		"            hasChanges = true;",
		"          }",
		"          break;",
		"        ",
		'        case "merge":',
		"          if (newTags.includes(oldTag)) {",
		"            newTags = newTags.filter(tag => tag !== oldTag);",
		"            if (!newTags.includes(newTag)) {",
		"              newTags.push(newTag);",
		"            }",
		"            hasChanges = true;",
		"          }",
		"          break;",
		"        ",
		'        case "delete":',
		"          if (newTags.includes(oldTag)) {",
		"            newTags = newTags.filter(tag => tag !== oldTag);",
		"            hasChanges = true;",
		"          }",
		"          break;",
		"      }",
		"      ",
		"      if (hasChanges) {",
		"        data.tags = newTags;",
		"        const newContent = matter.stringify(markdown, data);",
		"        fs.writeFileSync(filePath, newContent);",
		"        console.log(`✅ 已更新: ${filePath}`);",
		"        updated++;",
		"      }",
		"    } catch (error) {",
		"      console.error(`❌ 更新失败 ${filePath}:`, error);",
		"    }",
		"  }",
		"  ",
		"  console.log(`\\n标签更新完成！共更新 ${updated} 个文件`);",
		"}",
		"",
		"updateTags();",
	];

	return scriptLines.join("\n");
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(
			JSON.stringify({
				success: false,
				message: "Method not allowed",
			} as AdminAPIResponse),
			{
				status: 405,
				headers: { "Content-Type": "application/json" },
			}
		);
	}

	try {
		const body = (await context.request.json()) as TagAPIRequest & {
			tags?: Tag[];
		};
		const { action, token, oldTag, newTag, tags } = body;

		// 验证管理员权限
		const isAdmin = await verifyAdminToken(
			context.env.POST_ENCRYPTION,
			token
		);
		if (!isAdmin) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "未授权: 无效的管理员 token",
				} as AdminAPIResponse),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 处理不同的操作
		switch (action) {
			case "list": {
				if (!tags) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少标签数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				return new Response(
					JSON.stringify({
						success: true,
						data: tags,
					} as AdminAPIResponse<Tag[]>),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "rename": {
				if (!oldTag || !newTag) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少旧标签名或新标签名",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const script = generateTagUpdateScript("rename", oldTag, newTag);

				return new Response(
					JSON.stringify({
						success: true,
						message: `标签重命名脚本已生成`,
						data: {
							script,
							filename: "update-tags.mjs",
							instructions: [
								"1. 将脚本保存为 update-tags.mjs",
								"2. 确保已安���依赖: pnpm add gray-matter glob",
								"3. 运行脚本: node update-tags.mjs",
								`4. 验证更改(将 "${oldTag}" 重命名为 "${newTag}")`,
								"5. 提交到 Git",
							].join("\n"),
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "merge": {
				if (!oldTag || !newTag) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少源标签或目标标签",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const script = generateTagUpdateScript("merge", oldTag, newTag);

				return new Response(
					JSON.stringify({
						success: true,
						message: `标签合并脚本已生成`,
						data: {
							script,
							filename: "update-tags.mjs",
							instructions: [
								"1. 将脚本保存为 update-tags.mjs",
								"2. 确保已安装依赖: pnpm add gray-matter glob",
								"3. 运行脚本: node update-tags.mjs",
								`4. 验证更改(将 "${oldTag}" 合并到 "${newTag}")`,
								"5. 提交到 Git",
							].join("\n"),
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "delete": {
				if (!oldTag) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少标签名",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const script = generateTagUpdateScript("delete", oldTag);

				return new Response(
					JSON.stringify({
						success: true,
						message: `标签删除脚本已生成`,
						data: {
							script,
							filename: "update-tags.mjs",
							instructions: [
								"1. 将脚本保存为 update-tags.mjs",
								"2. 确保已安装依赖: pnpm add gray-matter glob",
								"3. 运行脚本: node update-tags.mjs",
								`4. 验证更改(删除标签 "${oldTag}")`,
								"5. 提交到 Git",
							].join("\n"),
						},
					} as AdminAPIResponse),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			default: {
				return new Response(
					JSON.stringify({
						success: false,
						message: "未知的操作",
					} as AdminAPIResponse),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
		}
	} catch (error) {
		console.error("Tag management error:", error);
		return new Response(
			JSON.stringify({
				success: false,
				message: "服务器内部错误",
			} as AdminAPIResponse),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

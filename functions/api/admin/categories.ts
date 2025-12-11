/**
 * 类别管理 API
 *
 * API 端点: POST /api/admin/categories
 *
 * 支持的操作:
 * - list: 列出所有类别
 * - create: 创建新类别
 * - update: 更新类别
 * - delete: 删除类别
 * - reorder: 重新排序类别
 * - batch-update: 批量更新类别下的所有文章
 */

import type {
	Category,
	CategoryConfigMap,
	CategoryAPIRequest,
	AdminAPIResponse,
	PostFrontmatter,
} from "../../../src/types/admin";
import { KV_KEYS } from "../../../src/types/admin";

interface Env {
	POST_ENCRYPTION: KVNamespace;
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
 * 获取类别配置
 */
async function getCategoryConfig(
	kv: KVNamespace
): Promise<CategoryConfigMap> {
	const configJson = await kv.get(KV_KEYS.CATEGORIES, "json");
	return (configJson as CategoryConfigMap) || {};
}

/**
 * 保存类别配置
 */
async function saveCategoryConfig(
	kv: KVNamespace,
	config: CategoryConfigMap
): Promise<void> {
	await kv.put(KV_KEYS.CATEGORIES, JSON.stringify(config));
}

/**
 * 批量更新文章 Frontmatter
 * 注意: 这个函数只返回需要更新的文章列表,实际更新需要在客户端进行
 */
async function getPostsToUpdate(
	categoryId: string
): Promise<{ slug: string; updates: Partial<PostFrontmatter> }[]> {
	// 这里返回空数组,实际的文章更新会在后续的 posts API 中处理
	// 或者通过触发 webhook 重新构建来应用更改
	return [];
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
		const body = (await context.request.json()) as CategoryAPIRequest;
		const { action, token, category, categoryId, categories, batchUpdate } =
			body;

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

		// 获取当前配置
		const config = await getCategoryConfig(context.env.POST_ENCRYPTION);

		// 处理不同的操作
		switch (action) {
			case "list": {
				// 返回所有类别
				const categoriesList = Object.values(config).sort(
					(a, b) => a.order - b.order
				);

				return new Response(
					JSON.stringify({
						success: true,
						data: categoriesList,
					} as AdminAPIResponse<Category[]>),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "create": {
				if (!category) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少类别数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 检查 ID 是否已存在
				if (config[category.id]) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `类别 ID "${category.id}" 已存在`,
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 添加新类别
				config[category.id] = {
					...category,
					slug: category.slug || category.id,
				};

				await saveCategoryConfig(context.env.POST_ENCRYPTION, config);

				return new Response(
					JSON.stringify({
						success: true,
						message: "类别创建成功",
						data: category,
					} as AdminAPIResponse<Category>),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "update": {
				if (!category || !categoryId) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少类别数据或类别 ID",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 检查类别是否存在
				if (!config[categoryId]) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `类别 "${categoryId}" 不存在`,
						} as AdminAPIResponse),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 更新类别
				config[categoryId] = {
					...config[categoryId],
					...category,
					id: categoryId, // 保持 ID 不变
				};

				await saveCategoryConfig(context.env.POST_ENCRYPTION, config);

				return new Response(
					JSON.stringify({
						success: true,
						message: "类别更新成功",
						data: config[categoryId],
					} as AdminAPIResponse<Category>),
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
				if (!categoryId) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少类别 ID",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 检查类别是否存在
				if (!config[categoryId]) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `类别 "${categoryId}" 不存在`,
						} as AdminAPIResponse),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 删除类别
				delete config[categoryId];

				await saveCategoryConfig(context.env.POST_ENCRYPTION, config);

				return new Response(
					JSON.stringify({
						success: true,
						message: "类别删除成功",
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

			case "reorder": {
				if (!categories) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少类别列表",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 更新所有类别的顺序
				const newConfig: CategoryConfigMap = {};
				categories.forEach((cat, index) => {
					newConfig[cat.id] = {
						...cat,
						order: index,
					};
				});

				await saveCategoryConfig(context.env.POST_ENCRYPTION, newConfig);

				return new Response(
					JSON.stringify({
						success: true,
						message: "类别顺序更新成功",
						data: Object.values(newConfig).sort(
							(a, b) => a.order - b.order
						),
					} as AdminAPIResponse<Category[]>),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "batch-update": {
				if (!batchUpdate) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少批量更新数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 获取需要更新的文章列表
				const postsToUpdate = await getPostsToUpdate(
					batchUpdate.categoryId
				);

				return new Response(
					JSON.stringify({
						success: true,
						message: `找到 ${postsToUpdate.length} 篇文章需要更新`,
						data: {
							postsToUpdate,
							note: "请使用文章管理 API 进行批量更新,或触发重新构建",
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
		console.error("Category management error:", error);
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

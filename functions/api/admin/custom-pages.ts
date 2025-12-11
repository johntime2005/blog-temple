/**
 * 自定义页面管理 API
 *
 * API 端点: POST /api/admin/custom-pages
 *
 * 支持的操作:
 * - list: 列出所有自定义页面
 * - create: 创建新页面
 * - update: 更新页面
 * - delete: 删除页面
 * - reorder: 重新排序页面
 */

import type {
	CustomPage,
	CustomPageConfigMap,
	CustomPageAPIRequest,
	AdminAPIResponse,
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
 * 获取自定义页面配置
 */
async function getCustomPageConfig(
	kv: KVNamespace
): Promise<CustomPageConfigMap> {
	const configJson = await kv.get(KV_KEYS.CUSTOM_PAGES, "json");
	return (configJson as CustomPageConfigMap) || {};
}

/**
 * 保存自定义页面配置
 */
async function saveCustomPageConfig(
	kv: KVNamespace,
	config: CustomPageConfigMap
): Promise<void> {
	await kv.put(KV_KEYS.CUSTOM_PAGES, JSON.stringify(config));
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
		const body = (await context.request.json()) as CustomPageAPIRequest;
		const { action, token, page, pageId, pages } = body;

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
		const config = await getCustomPageConfig(context.env.POST_ENCRYPTION);

		// 处理不同的操作
		switch (action) {
			case "list": {
				const pagesList = Object.values(config).sort(
					(a, b) => a.order - b.order
				);

				return new Response(
					JSON.stringify({
						success: true,
						data: pagesList,
					} as AdminAPIResponse<CustomPage[]>),
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
				if (!page) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少页面数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				if (config[page.id]) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `页面 ID "${page.id}" 已存在`,
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				config[page.id] = page;
				await saveCustomPageConfig(context.env.POST_ENCRYPTION, config);

				return new Response(
					JSON.stringify({
						success: true,
						message: "页面创建成功",
						data: page,
					} as AdminAPIResponse<CustomPage>),
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
				if (!page || !pageId) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少页面数据或页面 ID",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				if (!config[pageId]) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `页面 "${pageId}" 不存在`,
						} as AdminAPIResponse),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				config[pageId] = {
					...config[pageId],
					...page,
					id: pageId,
				};

				await saveCustomPageConfig(context.env.POST_ENCRYPTION, config);

				return new Response(
					JSON.stringify({
						success: true,
						message: "页面更新成功",
						data: config[pageId],
					} as AdminAPIResponse<CustomPage>),
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
				if (!pageId) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少页面 ID",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				if (!config[pageId]) {
					return new Response(
						JSON.stringify({
							success: false,
							message: `页面 "${pageId}" 不存在`,
						} as AdminAPIResponse),
						{
							status: 404,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				delete config[pageId];
				await saveCustomPageConfig(context.env.POST_ENCRYPTION, config);

				return new Response(
					JSON.stringify({
						success: true,
						message: "页面删除成功",
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
				if (!pages) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少页面列表",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				const newConfig: CustomPageConfigMap = {};
				pages.forEach((p, index) => {
					newConfig[p.id] = {
						...p,
						order: index,
					};
				});

				await saveCustomPageConfig(context.env.POST_ENCRYPTION, newConfig);

				return new Response(
					JSON.stringify({
						success: true,
						message: "页面顺序更新成功",
						data: Object.values(newConfig).sort(
							(a, b) => a.order - b.order
						),
					} as AdminAPIResponse<CustomPage[]>),
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
		console.error("Custom page management error:", error);
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

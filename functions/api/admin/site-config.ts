/**
 * 站点配置管理 API
 *
 * API 端点: POST /api/admin/site-config
 *
 * 支持的操作:
 * - get: 获取当前站点配置覆盖
 * - update: 更新站点配置
 * - reset: 重置为默认配置
 */

import type {
	SiteConfigAPIRequest,
	SiteConfigOverride,
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
 * 获取站点配置覆盖
 */
async function getSiteConfigOverride(
	kv: KVNamespace
): Promise<SiteConfigOverride | null> {
	const configJson = await kv.get(KV_KEYS.SITE_OVERRIDE, "json");
	return configJson as SiteConfigOverride | null;
}

/**
 * 保存站点配置覆盖
 */
async function saveSiteConfigOverride(
	kv: KVNamespace,
	config: SiteConfigOverride
): Promise<void> {
	await kv.put(KV_KEYS.SITE_OVERRIDE, JSON.stringify(config));
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
		const body = (await context.request.json()) as SiteConfigAPIRequest;
		const { action, token, config } = body;

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
			case "get": {
				const currentConfig = await getSiteConfigOverride(
					context.env.POST_ENCRYPTION
				);

				return new Response(
					JSON.stringify({
						success: true,
						data: currentConfig,
						message: currentConfig
							? "已加载自定义配置"
							: "使用默认配置",
					} as AdminAPIResponse<SiteConfigOverride | null>),
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
				if (!config) {
					return new Response(
						JSON.stringify({
							success: false,
							message: "缺少配置���据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 获取现有配置并合并
				const existingConfig =
					(await getSiteConfigOverride(context.env.POST_ENCRYPTION)) ||
					{};
				const newConfig = {
					...existingConfig,
					...config,
				};

				await saveSiteConfigOverride(
					context.env.POST_ENCRYPTION,
					newConfig
				);

				return new Response(
					JSON.stringify({
						success: true,
						message: "站点配置已更新",
						data: newConfig,
					} as AdminAPIResponse<SiteConfigOverride>),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "reset": {
				// 删除自定义配置
				await context.env.POST_ENCRYPTION.delete(KV_KEYS.SITE_OVERRIDE);

				return new Response(
					JSON.stringify({
						success: true,
						message: "站点配置已重置为默认值",
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
		console.error("Site config management error:", error);
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

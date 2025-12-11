/**
 * 导航栏配置管理 API
 *
 * API 端点: POST /api/admin/navbar
 *
 * 支持的操作:
 * - get: 获取当前导航栏配置
 * - update: 更新导航栏配置
 */

import type {
	NavBarAPIRequest,
	NavBarConfigOverride,
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
 * 获取导航栏配置覆盖
 */
async function getNavBarConfigOverride(
	kv: KVNamespace
): Promise<NavBarConfigOverride | null> {
	const configJson = await kv.get(KV_KEYS.NAVBAR_OVERRIDE, "json");
	return configJson as NavBarConfigOverride | null;
}

/**
 * 保存导航栏配置覆盖
 */
async function saveNavBarConfigOverride(
	kv: KVNamespace,
	config: NavBarConfigOverride
): Promise<void> {
	await kv.put(KV_KEYS.NAVBAR_OVERRIDE, JSON.stringify(config));
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
		const body = (await context.request.json()) as NavBarAPIRequest;
		const { action, token, config } = body;

		// 验���管理员权限
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
				const currentConfig = await getNavBarConfigOverride(
					context.env.POST_ENCRYPTION
				);

				return new Response(
					JSON.stringify({
						success: true,
						data: currentConfig,
						message: currentConfig
							? "已加载自定义配置"
							: "使用默认配置",
					} as AdminAPIResponse<NavBarConfigOverride | null>),
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
							message: "缺少配置数据",
						} as AdminAPIResponse),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				await saveNavBarConfigOverride(
					context.env.POST_ENCRYPTION,
					config
				);

				return new Response(
					JSON.stringify({
						success: true,
						message: "导航栏配置已更新",
						data: config,
					} as AdminAPIResponse<NavBarConfigOverride>),
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
		console.error("Navbar config management error:", error);
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

/**
 * 公共配置读取 API（无需认证）
 *
 * GET /api/config/[name]
 *
 * 前端组件运行时从这里读取 KV 中的动态配置。
 * 如果 KV 中没有覆盖值，返回 null（前端应 fallback 到构建时静态值）。
 *
 * 支持的配置名:
 * - announcement: 公告配置
 * - friends: 友链列表
 * - profile: 用户资料
 * - site-config: 站点配置覆盖
 * - navbar: 导航栏配置覆盖
 * - categories: 类别配置
 */

import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";

// 配置名 → KV 键 映射
const CONFIG_MAP: Record<string, string> = {
	announcement: KV_KEYS.ANNOUNCEMENT,
	friends: KV_KEYS.FRIENDS,
	profile: KV_KEYS.PROFILE,
	"site-config": KV_KEYS.SITE_OVERRIDE,
	navbar: KV_KEYS.NAVBAR_OVERRIDE,
	categories: KV_KEYS.CATEGORIES,
};

// 缓存时间（秒）：不同配置类型使用不同的缓存策略
const CACHE_TTL: Record<string, number> = {
	announcement: 60, // 公告 1 分钟缓存
	friends: 300, // 友链 5 分钟缓存
	profile: 300, // 资料 5 分钟缓存
	"site-config": 300, // 站点配置 5 分钟缓存
	navbar: 300, // 导航栏 5 分钟缓存
	categories: 300, // 类别 5 分钟缓存
};

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type",
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
	const name = context.params.name as string;

	// 验证配置名
	const kvKey = CONFIG_MAP[name];
	if (!kvKey) {
		return new Response(
			JSON.stringify({
				success: false,
				message: `未知的配置类型: ${name}`,
				available: Object.keys(CONFIG_MAP),
			}),
			{
				status: 404,
				headers: { "Content-Type": "application/json", ...CORS_HEADERS },
			},
		);
	}

	// 从 KV 读取
	const data = await context.env.POST_ENCRYPTION.get(kvKey, "json");

	const cacheTtl = CACHE_TTL[name] || 300;

	return new Response(
		JSON.stringify({
			success: true,
			data,
			source: data ? "kv" : "default",
		}),
		{
			status: 200,
			headers: {
				"Content-Type": "application/json",
				"Cache-Control": `public, max-age=${cacheTtl}, s-maxage=${cacheTtl}`,
				...CORS_HEADERS,
			},
		},
	);
};

// CORS 预检
export const onRequestOptions: PagesFunction<Env> = async () => {
	return new Response(null, {
		status: 204,
		headers: {
			...CORS_HEADERS,
			"Access-Control-Max-Age": "86400",
		},
	});
};

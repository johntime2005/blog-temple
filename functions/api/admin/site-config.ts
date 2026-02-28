/**
 * 站点配置管理 API
 *
 * POST /api/admin/site-config
 *
 * 操作: get / update / reset
 * 配置存储在 KV 中作为覆盖层，前端优先读取 KV 值，fallback 到构建时静态值。
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";
import { error, ok, unauthorized } from "../../_lib/response";

interface SiteConfigOverride {
	title?: string;
	subtitle?: string;
	description?: string;
	keywords?: string[];
	themeColor?: {
		hue?: number;
		fixed?: boolean;
		defaultMode?: "light" | "dark" | "system";
	};
	pages?: {
		anime?: boolean;
		sponsor?: boolean;
		guestbook?: boolean;
		bangumi?: boolean;
		projects?: boolean;
		timeline?: boolean;
		skills?: boolean;
	};
	pagination?: {
		postsPerPage?: number;
	};
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		config?: SiteConfigOverride;
	};

	const token = extractToken(context.request, body);
	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	switch (body.action) {
		case "get": {
			const config = await env.POST_ENCRYPTION.get(
				KV_KEYS.SITE_OVERRIDE,
				"json",
			);
			return ok(config, config ? "已加载自定义配置" : "使用默认配置");
		}

		case "update": {
			if (!body.config) return error("缺少配置数据");

			const existing =
				((await env.POST_ENCRYPTION.get(
					KV_KEYS.SITE_OVERRIDE,
					"json",
				)) as SiteConfigOverride) || {};
			const merged = { ...existing, ...body.config };
			await env.POST_ENCRYPTION.put(
				KV_KEYS.SITE_OVERRIDE,
				JSON.stringify(merged),
			);

			return ok(merged, "站点配置已更新");
		}

		case "reset": {
			await env.POST_ENCRYPTION.delete(KV_KEYS.SITE_OVERRIDE);
			return ok(null, "站点配置已重置为默认值");
		}

		default:
			return error(`未知操作: ${body.action}`);
	}
};

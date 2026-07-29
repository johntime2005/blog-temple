/**
 * 导航栏配置管理 API
 *
 * POST /api/admin/navbar
 *
 * 操作: get / update
 */

import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";
import { error, ok } from "../../_lib/response";

interface NavBarLink {
	name: string;
	url: string;
	icon?: string;
	external?: boolean;
	children?: NavBarLink[];
}

interface NavBarConfigOverride {
	links: NavBarLink[];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		config?: NavBarConfigOverride;
	};

	switch (body.action) {
		case "get": {
			const config = await env.POST_ENCRYPTION.get(
				KV_KEYS.NAVBAR_OVERRIDE,
				"json",
			);
			return ok(config, config ? "已加载自定义导航栏配置" : "使用默认配置");
		}

		case "update": {
			if (!body.config) return error("缺少配置数据");
			await env.POST_ENCRYPTION.put(
				KV_KEYS.NAVBAR_OVERRIDE,
				JSON.stringify(body.config),
			);
			return ok(body.config, "导航栏配置已更新");
		}

		default:
			return error(`未知操作: ${body.action}`);
	}
};

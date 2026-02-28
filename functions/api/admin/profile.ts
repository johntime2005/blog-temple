/**
 * 用户资料配置管理 API
 *
 * POST /api/admin/profile
 *
 * 操作: get / update / reset
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";
import { error, ok, unauthorized } from "../../_lib/response";

interface ProfileConfig {
	avatar?: string;
	name?: string;
	bio?: string;
	links?: Array<{
		name: string;
		icon: string;
		url: string;
	}>;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		config?: ProfileConfig;
	};

	const token = extractToken(context.request, body);
	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	switch (body.action) {
		case "get": {
			const config = await env.POST_ENCRYPTION.get(KV_KEYS.PROFILE, "json");
			return ok(config, config ? "已加载自定义资料" : "使用默认资料");
		}

		case "update": {
			if (!body.config) return error("缺少资料配置");

			const existing =
				((await env.POST_ENCRYPTION.get(
					KV_KEYS.PROFILE,
					"json",
				)) as ProfileConfig) || {};
			const merged = { ...existing, ...body.config };
			await env.POST_ENCRYPTION.put(KV_KEYS.PROFILE, JSON.stringify(merged));

			return ok(merged, "用户资料已更新（即时生效）");
		}

		case "reset": {
			await env.POST_ENCRYPTION.delete(KV_KEYS.PROFILE);
			return ok(null, "用户资料已重置为默认值");
		}

		default:
			return error(`未知操作: ${body.action}`);
	}
};

/**
 * 公告配置管理 API
 *
 * POST /api/admin/announcement
 *
 * 操作: get / update / reset
 * 公告是最适合 KV 动态化的配置——改了立刻前端可见，无需重编。
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";
import { error, ok, unauthorized } from "../../_lib/response";

interface AnnouncementConfig {
	title?: string;
	content?: string;
	closable?: boolean;
	link?: {
		enable: boolean;
		text: string;
		url: string;
		external?: boolean;
	};
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		config?: AnnouncementConfig;
	};

	const token = extractToken(context.request, body);
	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	switch (body.action) {
		case "get": {
			const config = await env.POST_ENCRYPTION.get(
				KV_KEYS.ANNOUNCEMENT,
				"json",
			);
			return ok(config, config ? "已加载自定义公告" : "使用默认公告");
		}

		case "update": {
			if (!body.config) return error("缺少公告配置");
			await env.POST_ENCRYPTION.put(
				KV_KEYS.ANNOUNCEMENT,
				JSON.stringify(body.config),
			);
			return ok(body.config, "公告已更新（即时生效）");
		}

		case "reset": {
			await env.POST_ENCRYPTION.delete(KV_KEYS.ANNOUNCEMENT);
			return ok(null, "公告已重置为默认值");
		}

		default:
			return error(`未知操作: ${body.action}`);
	}
};

/**
 * 部署触发 API
 *
 * POST /api/admin/deploy
 *
 * 触发 Cloudflare Pages 重新构建部署。
 * 用于文章/配置文件通过 GitHub API 修改后触发更新。
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { triggerDeploy } from "../../_lib/github";
import { error, ok, unauthorized } from "../../_lib/response";

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;

	const body = (await context.request.json().catch(() => ({}))) as {
		token?: string;
	};
	const token = extractToken(context.request, body);

	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	if (!env.DEPLOY_HOOK_URL) {
		return error(
			"Deploy Hook 未配置，请在 Cloudflare Dashboard 设置 DEPLOY_HOOK_URL",
			500,
		);
	}

	const result = await triggerDeploy(env.DEPLOY_HOOK_URL);

	if (!result.success) {
		return error("触发部署失败", 502);
	}

	return ok({ deploymentId: result.id }, "部署已触发，预计 1-2 分钟后生效");
};

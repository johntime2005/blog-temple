/**
 * 管理员登录 API
 *
 * POST /api/admin/login
 *
 * 请求体: { "password": "管理员密码" }
 * 响应: { "success": true, "data": { "token": "xxx" } }
 */

import { generateAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { error, methodNotAllowed, ok, serverError } from "../../_lib/response";

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;

	const body = (await context.request.json()) as { password?: string };
	const { password } = body;

	if (!password) {
		return error("密码不能为空");
	}

	// 从环境变量获取管理员密码
	const adminPassword = env.ADMIN_PASSWORD;
	if (!adminPassword) {
		console.error("ADMIN_PASSWORD 环境变量未设置");
		return serverError("服务器配置错误：未设置管理员密码");
	}

	// 验证密码
	if (password !== adminPassword) {
		return error("密码错误", 401);
	}

	// 生成 token
	const token = await generateAdminToken(env.POST_ENCRYPTION);

	return ok({ token }, "登录成功");
};

// 其他方法返回 405
export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method === "POST") {
		return context.next();
	}
	return methodNotAllowed();
};

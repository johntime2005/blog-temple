/**
 * /api/admin/* 中间件
 *
 * 职责：
 * 1. CORS 预检处理
 * 2. 全局错误捕获
 *
 * 注意：认证在各端点内部处理（因为 login 不需要 token）
 */

import type { Env } from "../../_lib/env";
import {
	corsPreflightResponse,
	serverError,
	withCors,
} from "../../_lib/response";

// 错误处理 + CORS
const middleware: PagesFunction<Env> = async (context) => {
	// CORS 预检
	if (context.request.method === "OPTIONS") {
		return corsPreflightResponse();
	}

	try {
		const response = await context.next();
		return withCors(response);
	} catch (err) {
		console.error("Admin API error:", err);
		const message = err instanceof Error ? err.message : "服务器内部错误";
		return withCors(serverError(message));
	}
};

export const onRequest = [middleware];

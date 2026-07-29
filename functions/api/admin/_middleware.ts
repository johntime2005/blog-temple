/**
 * /api/admin/* 统一中间件 —— 管理员鉴权的唯一入口
 *
 * 职责：
 * 1. CORS 预检处理
 * 2. 统一管理员鉴权（除 /api/admin/login 外）：
 *    走 _lib/session.authenticate()，接受三种凭证——
 *    GitHub OAuth 管理员 session、ADMIN_PASSWORD 管理 token、
 *    遗留 GitHub token（站长）。非 admin 一律 401。
 *    各端点内部不再各自校验 token。
 * 3. 全局错误捕获
 *
 * 端点如需当前身份，从 context.data.auth 读取（AuthInfo）。
 */

import type { Env } from "../../_lib/env";
import {
	corsPreflightResponse,
	serverError,
	unauthorized,
	withCors,
} from "../../_lib/response";
import type { AuthInfo } from "../../_lib/session";
import { authenticate } from "../../_lib/session";

/** 无需鉴权的管理端点（登录本身） */
const PUBLIC_ADMIN_PATHS = ["/api/admin/login"];

async function extractBodyToken(request: Request): Promise<string | undefined> {
	// 旧版前端把 token 放在 POST body 里，这里克隆读取以保持兼容；
	// 端点仍可正常消费原始 body。
	if (request.method === "GET" || request.method === "HEAD") return undefined;
	const contentType = request.headers.get("Content-Type") || "";
	if (!contentType.includes("application/json")) return undefined;
	try {
		const body = (await request.clone().json()) as { token?: string };
		return typeof body.token === "string" ? body.token : undefined;
	} catch {
		return undefined;
	}
}

const middleware: PagesFunction<Env> = async (context) => {
	if (context.request.method === "OPTIONS") {
		return corsPreflightResponse();
	}

	try {
		const pathname = new URL(context.request.url).pathname.replace(/\/$/, "");

		if (!PUBLIC_ADMIN_PATHS.includes(pathname)) {
			const bodyToken = await extractBodyToken(context.request);
			const auth = await authenticate(context.request, context.env, bodyToken);

			if (auth?.role !== "admin") {
				return withCors(unauthorized("未授权：需要管理员身份"));
			}

			(context.data as Record<string, unknown>).auth = auth satisfies AuthInfo;
		}

		const response = await context.next();
		return withCors(response);
	} catch (err) {
		console.error("Admin API error:", err);
		const message = err instanceof Error ? err.message : "服务器内部错误";
		return withCors(serverError(message));
	}
};

export const onRequest = [middleware];

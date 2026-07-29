/**
 * POST /api/admin/get-password — 查看文章明文密码
 *
 * 鉴权由 /api/admin/_middleware.ts 统一处理（管理员）。
 * 明文由 manage-passwords 的 generate 动作写入 admin:password:<encryptionId>。
 */

import type { Env } from "../../_lib/env";
import { error, methodNotAllowed, notFound, serverError } from "../../_lib/response";

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const body = (await context.request.json()) as { encryptionId?: string };
	const { encryptionId } = body;

	if (!encryptionId) {
		return error("缺少 encryptionId");
	}

	const kv = context.env.POST_ENCRYPTION;
	if (!kv) {
		return serverError("KV 存储不可用");
	}

	const password = await kv.get(`admin:password:${encryptionId}`);
	if (!password) {
		return notFound("密码不可用（可能未生成或已被删除）");
	}

	return new Response(JSON.stringify({ success: true, password }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
};

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method === "POST") {
		return context.next();
	}
	return methodNotAllowed();
};

/**
 * 用户注册 API
 *
 * API 端点：POST /api/auth/register
 *
 * 请求体：
 * {
 *   "username": "用户名",
 *   "password": "密码",
 *   "email": "邮箱（可选）",
 *   "adminToken": "管理员token（必须）"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "message": "注册成功",
 *   "username": "用户名"
 * }
 */

import { authenticate } from "../../_lib/session";

interface Env {
	POST_ENCRYPTION: KVNamespace;
	ADMIN_PASSWORD: string;
}

interface RegisterRequest {
	username: string;
	password: string;
	email?: string;
	adminToken?: string; // 管理员登录凭证；也可通过 Cookie/Authorization 头携带
}

// 密码加密函数（使用 Web Crypto API）
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(
			JSON.stringify({ success: false, message: "Method not allowed" }),
			{
				status: 405,
				headers: { "Content-Type": "application/json" },
			},
		);
	}

	try {
		const body = (await context.request.json()) as RegisterRequest;
		const { username, password, email, adminToken } = body;

		// 验证必填字段
		if (!username || !password) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "用户名和密码不能为空",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// 统一走 _lib/session 的 authenticate 校验管理员身份
		// （兼容 session token 与旧版 admin:token，不再自行读 KV）
		const auth = await authenticate(context.request, context.env, adminToken);
		if (!auth || auth.role !== "admin") {
			return new Response(
				JSON.stringify({
					success: false,
					message: "无权操作：请以站长身份登录后再创建用户",
				}),
				{
					status: 403,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// 检查用户名长度和格式
		if (username.length < 3 || username.length > 20) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "用户名长度必须在3-20个字符之间",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		if (!/^[a-zA-Z0-9_]+$/.test(username)) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "用户名只能包含字母、数字和下划线",
				}),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// 检查密码强度
		if (password.length < 6) {
			return new Response(
				JSON.stringify({ success: false, message: "密码长度至少为6个字符" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// 检查用户是否已存在
		const existingUser = await context.env.POST_ENCRYPTION.get(
			`user:${username}`,
		);
		if (existingUser) {
			return new Response(
				JSON.stringify({ success: false, message: "用户名已存在" }),
				{
					status: 409,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// 加密密码
		const passwordHash = await hashPassword(password);

		// 创建用户数据
		const userData = {
			username,
			passwordHash,
			email: email || "",
			role: "user",
			createdAt: new Date().toISOString(),
		};

		// 存储用户数据到 KV
		await context.env.POST_ENCRYPTION.put(
			`user:${username}`,
			JSON.stringify(userData),
		);

		return new Response(
			JSON.stringify({
				success: true,
				message: "注册成功",
				username,
			}),
			{
				status: 201,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		console.error("User registration error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器内部错误" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
};

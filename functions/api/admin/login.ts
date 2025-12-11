/**
 * 管理员登录 API
 *
 * API 端点：POST /api/admin/login
 *
 * 请求体：
 * {
 *   "password": "管理员密码"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "token": "admin-token-xxx"
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
	ADMIN_PASSWORD: string; // 从环境变量获取
}

interface LoginRequest {
	password: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = (await context.request.json()) as LoginRequest;
		const { password } = body;

		if (!password) {
			return new Response(
				JSON.stringify({ success: false, message: "密码不能为空" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 从环境变量获取管理员密码
		const adminPassword = context.env.ADMIN_PASSWORD;

		if (!adminPassword) {
			console.error("ADMIN_PASSWORD environment variable not set");
			return new Response(
				JSON.stringify({ success: false, message: "服务器配置错误" }),
				{
					status: 500,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 验证密码
		if (password !== adminPassword) {
			return new Response(
				JSON.stringify({ success: false, message: "密码错误" }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 生成管理员 token（使用 UUID）
		const token = crypto.randomUUID();

		// 将 token 存储到 KV（24 小时有效）
		await context.env.POST_ENCRYPTION.put(
			`admin:token:${token}`,
			"valid",
			{ expirationTtl: 86400 } // 24 hours
		);

		return new Response(
			JSON.stringify({
				success: true,
				token,
				message: "登录成功",
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			}
		);
	} catch (error) {
		console.error("Admin login error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器内部错误" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

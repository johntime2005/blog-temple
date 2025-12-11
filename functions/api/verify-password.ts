/**
 * Cloudflare Workers 函数：验证文章密码
 *
 * API 端点：POST /api/verify-password
 *
 * 请求体：
 * {
 *   "encryptionId": "文章的加密 ID",
 *   "password": "用户输入的密码"
 * }
 *
 * 响应：
 * {
 *   "success": true/false,
 *   "message": "错误信息（如果失败）"
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace; // Cloudflare KV 命名空间
}

interface VerifyPasswordRequest {
	encryptionId: string;
	password: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	// 只允许 POST 请求
	if (context.request.method !== "POST") {
		return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		// 解析请求体
		const body = (await context.request.json()) as VerifyPasswordRequest;
		const { encryptionId, password } = body;

		// 验证参数
		if (!encryptionId || !password) {
			return new Response(
				JSON.stringify({ success: false, message: "缺少必要参数" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 从 KV 中获取存储的密码哈希
		const storedPasswordHash = await context.env.POST_ENCRYPTION.get(
			`post:${encryptionId}:password`
		);

		if (!storedPasswordHash) {
			return new Response(
				JSON.stringify({ success: false, message: "未找到加密配置" }),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 使用 Web Crypto API 计算用户输入密码的哈希
		const encoder = new TextEncoder();
		const data = encoder.encode(password);
		const hashBuffer = await crypto.subtle.digest("SHA-256", data);
		const hashArray = Array.from(new Uint8Array(hashBuffer));
		const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

		// 比较哈希值
		if (hashHex === storedPasswordHash) {
			// 生成一个临时令牌（可选，用于后续请求验证）
			const token = crypto.randomUUID();

			// 将令牌存储到 KV（设置过期时间为 1 小时）
			await context.env.POST_ENCRYPTION.put(
				`token:${token}:${encryptionId}`,
				"valid",
				{ expirationTtl: 3600 }
			);

			return new Response(
				JSON.stringify({
					success: true,
					token,
					message: "密码验证成功"
				}),
				{
					status: 200,
					headers: {
						"Content-Type": "application/json",
						"Cache-Control": "no-store"
					},
				}
			);
		}

		// 密码错误
		return new Response(
			JSON.stringify({ success: false, message: "密码错误" }),
			{
				status: 401,
				headers: { "Content-Type": "application/json" },
			}
		);
	} catch (error) {
		console.error("Password verification error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器内部错误" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

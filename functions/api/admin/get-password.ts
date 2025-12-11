/**
 * 获取指定文章的明文密码（需要管理员权限）
 *
 * API 端点：POST /api/admin/get-password
 *
 * 请求体：
 * {
 *   "token": "admin-token-xxx",
 *   "encryptionId": "my-post"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "password": "明文密码"  // 永久保存，随时可查看
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface GetPasswordRequest {
	token: string;
	encryptionId: string;
}

/**
 * 验证管理员 token
 */
async function verifyAdminToken(kv: KVNamespace, token: string): Promise<boolean> {
	if (!token) return false;
	const tokenValue = await kv.get(`admin:token:${token}`);
	return tokenValue === "valid";
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = (await context.request.json()) as GetPasswordRequest;
		const { token, encryptionId } = body;

		if (!encryptionId) {
			return new Response(
				JSON.stringify({ success: false, message: "缺少 encryptionId" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 验证管理员权限
		const isAdmin = await verifyAdminToken(context.env.POST_ENCRYPTION, token);
		if (!isAdmin) {
			return new Response(
				JSON.stringify({ success: false, message: "未授权：无效的管理员 token" }),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		// 获取明文密码
		const password = await context.env.POST_ENCRYPTION.get(`admin:password:${encryptionId}`);

		if (!password) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "密码不可用（可能未生成或已被删除）",
				}),
				{
					status: 404,
					headers: { "Content-Type": "application/json" },
				}
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				password,
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
		console.error("Get password error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器内部错误" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

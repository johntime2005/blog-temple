/**
 * Cloudflare Workers 函数：验证访问令牌
 *
 * API 端点：POST /api/check-token
 *
 * 请求体：
 * {
 *   "encryptionId": "文章的加密 ID",
 *   "token": "验证成功后获得的令牌"
 * }
 *
 * 响应：
 * {
 *   "valid": true/false
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface CheckTokenRequest {
	encryptionId: string;
	token: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(JSON.stringify({ valid: false }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = (await context.request.json()) as CheckTokenRequest;
		const { encryptionId, token } = body;

		if (!encryptionId || !token) {
			return new Response(JSON.stringify({ valid: false }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 验证令牌
		const tokenValue = await context.env.POST_ENCRYPTION.get(
			`token:${token}:${encryptionId}`
		);

		return new Response(
			JSON.stringify({ valid: tokenValue === "valid" }),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store"
				},
			}
		);
	} catch (error) {
		console.error("Token check error:", error);
		return new Response(JSON.stringify({ valid: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

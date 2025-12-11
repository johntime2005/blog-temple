/**
 * 验证管理员 token
 *
 * API 端点：POST /api/admin/verify-token
 *
 * 请求体：
 * {
 *   "token": "admin-token-xxx"
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

interface VerifyTokenRequest {
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
		const body = (await context.request.json()) as VerifyTokenRequest;
		const { token } = body;

		if (!token) {
			return new Response(JSON.stringify({ valid: false }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// 验证 token
		const tokenValue = await context.env.POST_ENCRYPTION.get(`admin:token:${token}`);

		return new Response(
			JSON.stringify({ valid: tokenValue === "valid" }),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			}
		);
	} catch (error) {
		console.error("Token verification error:", error);
		return new Response(JSON.stringify({ valid: false }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
};

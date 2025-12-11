/**
 * 验证用户 session API
 *
 * API 端点：POST /api/auth/verify
 *
 * 请求体：
 * {
 *   "token": "session-token-xxx"
 * }
 *
 * 响应：
 * {
 *   "valid": true/false,
 *   "username": "用户名"（如果valid为true）,
 *   "role": "角色"（如果valid为true）
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface VerifyRequest {
	token: string;
}

interface SessionData {
	username: string;
	role: string;
	createdAt: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== 'POST') {
		return new Response(JSON.stringify({ valid: false }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const body = (await context.request.json()) as VerifyRequest;
		const { token } = body;

		if (!token) {
			return new Response(JSON.stringify({ valid: false }), {
				status: 400,
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// 验证 session
		const sessionDataStr = await context.env.POST_ENCRYPTION.get(`session:${token}`);

		if (!sessionDataStr) {
			return new Response(
				JSON.stringify({ valid: false }),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-store',
					},
				}
			);
		}

		const sessionData: SessionData = JSON.parse(sessionDataStr);

		return new Response(
			JSON.stringify({
				valid: true,
				username: sessionData.username,
				role: sessionData.role,
			}),
			{
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store',
				},
			}
		);
	} catch (error) {
		console.error('Session verification error:', error);
		return new Response(JSON.stringify({ valid: false }), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
};

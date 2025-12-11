/**
 * 用户登出 API
 *
 * API 端点：POST /api/auth/logout
 *
 * 请求体：
 * {
 *   "token": "session-token-xxx"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "message": "登出成功"
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface LogoutRequest {
	token: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== 'POST') {
		return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const body = (await context.request.json()) as LogoutRequest;
		const { token } = body;

		if (!token) {
			return new Response(
				JSON.stringify({ success: false, message: 'Token不能为空' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 从 KV 删除 session
		await context.env.POST_ENCRYPTION.delete(`session:${token}`);

		return new Response(
			JSON.stringify({
				success: true,
				message: '登出成功',
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
		console.error('User logout error:', error);
		return new Response(
			JSON.stringify({ success: false, message: '服务器内部错误' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

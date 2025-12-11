/**
 * 获取当前用户信息 API
 *
 * API 端点：GET /api/auth/current-user
 *
 * Headers:
 * Authorization: Bearer {token}
 *
 * 响应：
 * {
 *   "authenticated": true/false,
 *   "user": {
 *     "username": "用户名",
 *     "email": "邮箱",
 *     "role": "角色",
 *     "createdAt": "创建时间"
 *   }
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface SessionData {
	username: string;
	role: string;
	createdAt: string;
}

interface UserData {
	username: string;
	passwordHash: string;
	email: string;
	role: string;
	createdAt: string;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== 'GET') {
		return new Response(JSON.stringify({ authenticated: false }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		// 从 Authorization header 获取 token
		const authHeader = context.request.headers.get('Authorization');
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			return new Response(
				JSON.stringify({ authenticated: false }),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-store',
					},
				}
			);
		}

		const token = authHeader.substring(7); // 移除 "Bearer " 前缀

		// 验证 session
		const sessionDataStr = await context.env.POST_ENCRYPTION.get(`session:${token}`);

		if (!sessionDataStr) {
			return new Response(
				JSON.stringify({ authenticated: false }),
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

		// 获取用户详细信息
		const userDataStr = await context.env.POST_ENCRYPTION.get(`user:${sessionData.username}`);

		if (!userDataStr) {
			// Session存在但用户不存在（异常情况）
			await context.env.POST_ENCRYPTION.delete(`session:${token}`);
			return new Response(
				JSON.stringify({ authenticated: false }),
				{
					status: 200,
					headers: {
						'Content-Type': 'application/json',
						'Cache-Control': 'no-store',
					},
				}
			);
		}

		const userData: UserData = JSON.parse(userDataStr);

		// 返回用户信息（不包含密码哈希）
		return new Response(
			JSON.stringify({
				authenticated: true,
				user: {
					username: userData.username,
					email: userData.email,
					role: userData.role,
					createdAt: userData.createdAt,
				},
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
		console.error('Get current user error:', error);
		return new Response(
			JSON.stringify({ authenticated: false }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

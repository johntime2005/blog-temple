/**
 * 用户登录 API
 *
 * API 端点：POST /api/auth/login
 *
 * 请求体：
 * {
 *   "username": "用户名",
 *   "password": "密码"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "token": "session-token-xxx",
 *   "username": "用户名",
 *   "message": "登录成功"
 * }
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface LoginRequest {
	username: string;
	password: string;
}

interface UserData {
	username: string;
	passwordHash: string;
	email: string;
	role: string;
	createdAt: string;
}

// 密码加密函数（与注册时使用相同的算法）
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== 'POST') {
		return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const body = (await context.request.json()) as LoginRequest;
		const { username, password } = body;

		// 验证必填字段
		if (!username || !password) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名和密码不能为空' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 从 KV 获取用户数据
		const userDataStr = await context.env.POST_ENCRYPTION.get(`user:${username}`);

		if (!userDataStr) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名或密码错误' }),
				{
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		const userData: UserData = JSON.parse(userDataStr);

		// 验证密码
		const passwordHash = await hashPassword(password);
		if (passwordHash !== userData.passwordHash) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名或密码错误' }),
				{
					status: 401,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 生成 session token
		const token = crypto.randomUUID();

		// 创建 session 数据
		const sessionData = {
			username: userData.username,
			role: userData.role,
			createdAt: new Date().toISOString(),
		};

		// 将 session 存储到 KV（7天有效）
		await context.env.POST_ENCRYPTION.put(
			`session:${token}`,
			JSON.stringify(sessionData),
			{ expirationTtl: 604800 } // 7 days = 7 * 24 * 60 * 60 seconds
		);

		return new Response(
			JSON.stringify({
				success: true,
				token,
				username: userData.username,
				role: userData.role,
				message: '登录成功',
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
		console.error('User login error:', error);
		return new Response(
			JSON.stringify({ success: false, message: '服务器内部错误' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

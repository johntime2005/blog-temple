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

interface Env {
	POST_ENCRYPTION: KVNamespace;
	ADMIN_PASSWORD: string;
}

interface RegisterRequest {
	username: string;
	password: string;
	email?: string;
	adminToken: string; // 需要管理员token才能注册新用户
}

// 密码加密函数（使用 Web Crypto API）
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 验证管理员token
async function verifyAdminToken(env: Env, token: string): Promise<boolean> {
	const tokenValue = await env.POST_ENCRYPTION.get(`admin:token:${token}`);
	return tokenValue === 'valid';
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== 'POST') {
		return new Response(JSON.stringify({ success: false, message: 'Method not allowed' }), {
			status: 405,
			headers: { 'Content-Type': 'application/json' },
		});
	}

	try {
		const body = (await context.request.json()) as RegisterRequest;
		const { username, password, email, adminToken } = body;

		// 验证必填字段
		if (!username || !password || !adminToken) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名、密码和管理员token不能为空' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 验证管理员token
		const isAdmin = await verifyAdminToken(context.env, adminToken);
		if (!isAdmin) {
			return new Response(
				JSON.stringify({ success: false, message: '无效的管理员token，只有管理员可以创建用户' }),
				{
					status: 403,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 检查用户名长度和格式
		if (username.length < 3 || username.length > 20) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名长度必须在3-20个字符之间' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		if (!/^[a-zA-Z0-9_]+$/.test(username)) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名只能包含字母、数字和下划线' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 检查密码强度
		if (password.length < 6) {
			return new Response(
				JSON.stringify({ success: false, message: '密码长度至少为6个字符' }),
				{
					status: 400,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 检查用户是否已存在
		const existingUser = await context.env.POST_ENCRYPTION.get(`user:${username}`);
		if (existingUser) {
			return new Response(
				JSON.stringify({ success: false, message: '用户名已存在' }),
				{
					status: 409,
					headers: { 'Content-Type': 'application/json' },
				}
			);
		}

		// 加密密码
		const passwordHash = await hashPassword(password);

		// 创建用户数据
		const userData = {
			username,
			passwordHash,
			email: email || '',
			role: 'user',
			createdAt: new Date().toISOString(),
		};

		// 存储用户数据到 KV
		await context.env.POST_ENCRYPTION.put(
			`user:${username}`,
			JSON.stringify(userData)
		);

		return new Response(
			JSON.stringify({
				success: true,
				message: '注册成功',
				username,
			}),
			{
				status: 201,
				headers: {
					'Content-Type': 'application/json',
					'Cache-Control': 'no-store',
				},
			}
		);
	} catch (error) {
		console.error('User registration error:', error);
		return new Response(
			JSON.stringify({ success: false, message: '服务器内部错误' }),
			{
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			}
		);
	}
};

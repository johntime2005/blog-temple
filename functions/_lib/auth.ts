/**
 * Admin 认证工具
 *
 * 基于 KV 的 token 验证系统。
 * 管理员通过密码登录获取 token，token 存储在 KV 中（24h 有效）。
 */

const TOKEN_TTL = 86400; // 24 小时

/**
 * 验证管理员 token 是否有效
 */
export async function verifyAdminToken(
	kv: KVNamespace,
	token: string,
): Promise<boolean> {
	if (!token) return false;
	const value = await kv.get(`admin:token:${token}`);
	return value === "valid";
}

/**
 * 生成新的管理员 token 并存储到 KV
 */
export async function generateAdminToken(kv: KVNamespace): Promise<string> {
	const token = crypto.randomUUID();
	await kv.put(`admin:token:${token}`, "valid", {
		expirationTtl: TOKEN_TTL,
	});
	return token;
}

/**
 * 撤销管理员 token
 */
export async function revokeAdminToken(
	kv: KVNamespace,
	token: string,
): Promise<void> {
	await kv.delete(`admin:token:${token}`);
}

/**
 * 从请求中提取 token
 * 支持两种方式：
 * 1. Authorization: Bearer <token>
 * 2. POST body 中的 token 字段
 */
export function extractToken(
	request: Request,
	body?: { token?: string },
): string {
	// 优先从 header 获取
	const authHeader = request.headers.get("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice(7);
	}

	// 其次从 body 获取（兼容旧 API）
	return body?.token || "";
}

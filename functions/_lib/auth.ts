/**
 * ADMIN_PASSWORD 管理 token 的发放
 *
 * 管理员用密码登录（/api/admin/login）后获得 token，存 KV 24h。
 * token 的校验统一在 _lib/session.ts 的 authenticate() 中完成
 * （admin:token:<token> 命中即视为 admin），这里只负责发放。
 */

const TOKEN_TTL = 86400; // 24 小时

/** 生成新的管理员 token 并存储到 KV */
export async function generateAdminToken(kv: KVNamespace): Promise<string> {
	const token = crypto.randomUUID();
	await kv.put(`admin:token:${token}`, "valid", {
		expirationTtl: TOKEN_TTL,
	});
	return token;
}

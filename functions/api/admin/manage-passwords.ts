/**
 * 密码管理 API（需要管理员权限）
 *
 * API 端点：POST /api/admin/manage-passwords
 *
 * 支持的操作：
 * - generate: 生成新密码
 * - list: 列出所有加密文章
 * - delete: 删除密码
 */

interface Env {
	POST_ENCRYPTION: KVNamespace;
}

interface ManagePasswordRequest {
	action: "generate" | "list" | "delete";
	token: string; // 管理员 token
	encryptionId?: string; // 用于 generate 和 delete
	passwordLength?: number; // 用于 generate，默认 16
}

/**
 * 验证管理员 token
 */
async function verifyAdminToken(kv: KVNamespace, token: string): Promise<boolean> {
	if (!token) return false;
	const tokenValue = await kv.get(`admin:token:${token}`);
	return tokenValue === "valid";
}

/**
 * 生成强密码
 */
function generateStrongPassword(length: number = 16): string {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);

	let password = "";
	for (let i = 0; i < length; i++) {
		password += charset[array[i] % charset.length];
	}

	// 确保密码包含至少一个大写字母、小写字母、数字和特殊字符
	const hasUpper = /[A-Z]/.test(password);
	const hasLower = /[a-z]/.test(password);
	const hasDigit = /[0-9]/.test(password);
	const hasSpecial = /[!@#$%^&*]/.test(password);

	if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
		// 递归生成直到满足条件
		return generateStrongPassword(length);
	}

	return password;
}

/**
 * 计算密码的 SHA-256 哈希
 */
async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method !== "POST") {
		return new Response(JSON.stringify({ success: false, message: "Method not allowed" }), {
			status: 405,
			headers: { "Content-Type": "application/json" },
		});
	}

	try {
		const body = (await context.request.json()) as ManagePasswordRequest;
		const { action, token, encryptionId, passwordLength } = body;

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

		// 处理不同的操作
		switch (action) {
			case "generate": {
				if (!encryptionId) {
					return new Response(
						JSON.stringify({ success: false, message: "缺少 encryptionId" }),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 生成强密码
				const password = generateStrongPassword(passwordLength || 16);
				const passwordHash = await hashPassword(password);

				// 存储密码哈希到 KV
				await context.env.POST_ENCRYPTION.put(
					`post:${encryptionId}:password`,
					passwordHash,
					{
						metadata: {
							encryptionId,
							createdAt: new Date().toISOString(),
							createdBy: "admin",
						},
					}
				);

				// 存储明文密码到 KV（✅ 永久保存，仅管理员可见）
				await context.env.POST_ENCRYPTION.put(
					`admin:password:${encryptionId}`,
					password,
					{
						metadata: {
							encryptionId,
							createdAt: new Date().toISOString(),
							note: "管理员专用：可随时查看，密码遗失可在后台恢复",
						},
					}
					// 注意：移除 expirationTtl，永久保存，密码不会丢失
				);

				return new Response(
					JSON.stringify({
						success: true,
						password, // 返回明文密码
						encryptionId,
						message: "密码生成成功（已永久保存到后台，可随时查看）",
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "list": {
				// 获取所有密码
				const result = await context.env.POST_ENCRYPTION.list({ prefix: "post:" });

				const passwords: Array<{
					encryptionId: string;
					createdAt?: string;
					hasPlaintext?: boolean;
				}> = [];

				for (const item of result.keys) {
					const match = item.name.match(/^post:(.+):password$/);
					if (match) {
						const id = match[1];

						// 检查是否有明文密码（永久保存）
						const plaintext = await context.env.POST_ENCRYPTION.get(`admin:password:${id}`);

						passwords.push({
							encryptionId: id,
							createdAt: (item.metadata as any)?.createdAt,
							hasPlaintext: !!plaintext,
						});
					}
				}

				return new Response(
					JSON.stringify({
						success: true,
						passwords,
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			case "delete": {
				if (!encryptionId) {
					return new Response(
						JSON.stringify({ success: false, message: "缺少 encryptionId" }),
						{
							status: 400,
							headers: { "Content-Type": "application/json" },
						}
					);
				}

				// 删除密码哈希
				await context.env.POST_ENCRYPTION.delete(`post:${encryptionId}:password`);

				// 删除明文密码（如果存在）
				await context.env.POST_ENCRYPTION.delete(`admin:password:${encryptionId}`);

				return new Response(
					JSON.stringify({
						success: true,
						message: "密码已删除",
					}),
					{
						status: 200,
						headers: {
							"Content-Type": "application/json",
							"Cache-Control": "no-store",
						},
					}
				);
			}

			default: {
				return new Response(
					JSON.stringify({ success: false, message: "未知的操作" }),
					{
						status: 400,
						headers: { "Content-Type": "application/json" },
					}
				);
			}
		}
	} catch (error) {
		console.error("Password management error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器内部错误" }),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			}
		);
	}
};

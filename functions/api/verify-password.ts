/**
 * Cloudflare Pages Function：验证文章密码并下发解密密钥
 *
 * API 端点：POST /api/verify-password
 *
 * ⚠️ 这是生产环境实际生效的实现。
 * src/pages/api/verify-password.ts 是 Astro SSR 版本，本站以 Cloudflare Pages +
 * functions/ 方式部署，Astro 的 SSR 路由不会被执行，两边逻辑必须保持一致。
 *
 * 请求体：
 * {
 *   "encryptionId": "文章的加密 ID（KV 中密码哈希的索引）",
 *   "postSlug": "文章 entry.id（构建时派生加密密钥所用的值）",
 *   "password": "用户输入的密码"
 * }
 *
 * 响应：
 * {
 *   "success": true,
 *   "token": "解密密钥，或 share: 前缀的会话令牌",
 *   "isSession": false
 * }
 */

interface Env {
	/** Cloudflare KV 命名空间 */
	POST_ENCRYPTION: KVNamespace;
	/** 文章加密主密钥，必须与构建时使用的值一致 */
	SITE_SECRET?: string;
	/** 兼容旧配置的回退值 */
	GITHUB_CLIENT_SECRET?: string;
}

interface VerifyPasswordRequest {
	encryptionId: string;
	postSlug?: string;
	password: string;
}

function json(body: unknown, status: number): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** SHA-256 十六进制摘要，与 scripts/manage-password.mjs 的存储格式保持一致 */
async function sha256Hex(message: string): Promise<string> {
	const data = new TextEncoder().encode(message);
	return toHex(await crypto.subtle.digest("SHA-256", data));
}

/**
 * HMAC-SHA256 派生解密密钥。
 * 必须与 src/pages/posts/[...slug].astro 中构建时的派生方式完全一致：
 * hmacSha256(SITE_SECRET, entry.id)
 */
async function hmacSha256Hex(secret: string, message: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		encoder.encode(message),
	);
	return toHex(signature);
}

/** 定长比较，避免密码哈希比对被时序攻击 */
function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

export const onRequest: PagesFunction<Env> = async (context) => {
	// 只允许 POST 请求
	if (context.request.method !== "POST") {
		return json({ success: false, message: "Method not allowed" }, 405);
	}

	try {
		const body = (await context.request.json()) as VerifyPasswordRequest;
		const { encryptionId, password } = body;
		// 旧版客户端不发 postSlug，退回 encryptionId 以保持兼容
		const postSlug = body.postSlug || encryptionId;

		if (!encryptionId || !password) {
			return json({ success: false, message: "缺少必要参数" }, 400);
		}

		const kv = context.env.POST_ENCRYPTION;
		if (!kv) {
			console.error("KV binding POST_ENCRYPTION not found");
			return json({ success: false, message: "服务端未配置 KV 绑定" }, 500);
		}

		const siteSecret =
			context.env.SITE_SECRET || context.env.GITHUB_CLIENT_SECRET;
		if (!siteSecret) {
			console.error(
				"Encryption master secret not configured (SITE_SECRET / GITHUB_CLIENT_SECRET)",
			);
			return json(
				{
					success: false,
					message:
						"服务端未配置加密主密钥（SITE_SECRET / GITHUB_CLIENT_SECRET）",
				},
				500,
			);
		}

		// 1. 先尝试按「分享密码」处理（动态、可过期）
		const shareDataStr = await kv.get(`share:${password}`);
		if (shareDataStr) {
			const shareData = JSON.parse(shareDataStr) as {
				slug?: string;
				expiresAt?: number;
			};
			const matchesPost =
				shareData.slug === postSlug || shareData.slug === encryptionId;
			const expired = shareData.expiresAt && Date.now() > shareData.expiresAt;

			if (matchesPost && !expired) {
				// 分享密码本身即会话令牌，真正的密钥由 /api/auth/key 再次校验后下发
				return json(
					{ success: true, token: `share:${password}`, isSession: true },
					200,
				);
			}
			// 不匹配则继续走静态密码校验
		}

		// 2. 静态密码：比对 KV 中存储的 SHA-256 哈希
		const storedHash = await kv.get(`post:${encryptionId}:password`);
		if (!storedHash) {
			return json({ success: false, message: "未找到加密配置" }, 404);
		}

		const passwordHash = await sha256Hex(password);
		if (!timingSafeEqual(passwordHash, storedHash)) {
			return json({ success: false, message: "密码错误" }, 401);
		}

		// 3. 密码正确，下发真正的解密密钥。
		// 注意用 postSlug（entry.id）派生，与构建时保持一致。
		const decryptionKey = await hmacSha256Hex(siteSecret, postSlug);

		return json({ success: true, token: decryptionKey, isSession: false }, 200);
	} catch (error) {
		console.error("Password verification error:", error);
		return json({ success: false, message: "服务器内部错误" }, 500);
	}
};

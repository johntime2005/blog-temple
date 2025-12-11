import AES from "crypto-js/aes";
import enc from "crypto-js/enc-utf8";

/**
 * 安全工具模块
 * 提供加密、验证、转义等安全相关功能
 */

/**
 * 使用 AES 加密内容
 */
export function encryptContent(content: string, secret: string): string {
	return AES.encrypt(content, secret).toString();
}

/**
 * 使用 AES 解密内容
 */
export function decryptContent(ciphertext: string, secret: string): string {
	const bytes = AES.decrypt(ciphertext, secret);
	return bytes.toString(enc);
}

/**
 * 使用 Web Crypto API 生成加密安全的随机字符串
 * 使用 SHA-256 级别的熵
 */
export function generateSecureToken(length = 32): string {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
		"",
	);
}

/**
 * 使用 SHA-256 计算哈希值
 */
export async function sha256(message: string): Promise<string> {
	const msgBuffer = new TextEncoder().encode(message);
	const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 使用 HMAC-SHA256 生成签名
 */
export async function hmacSha256(
	secret: string,
	message: string,
): Promise<string> {
	const encoder = new TextEncoder();
	const keyData = encoder.encode(secret);
	const messageData = encoder.encode(message);

	const key = await crypto.subtle.importKey(
		"raw",
		keyData,
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);

	const signature = await crypto.subtle.sign("HMAC", key, messageData);
	const hashArray = Array.from(new Uint8Array(signature));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * 转义字符串字面量，防止代码注入
 */
export function escapeStringLiteral(str: string): string {
	if (typeof str !== "string") {
		return "";
	}
	return str
		.replace(/\\/g, "\\\\") // 转义反斜杠
		.replace(/"/g, '\\"') // 转义双引号
		.replace(/'/g, "\\'") // 转义单引号
		.replace(/\n/g, "\\n") // 转义换行
		.replace(/\r/g, "\\r") // 转义回车
		.replace(/\t/g, "\\t") // 转义制表符
		.replace(/\0/g, "\\0") // 转义 null
		.replace(/\u2028/g, "\\u2028") // 转义行分隔符
		.replace(/\u2029/g, "\\u2029"); // 转义段落分隔符
}

/**
 * 转义 HTML 特殊字符，防止 XSS
 */
export function escapeHtml(str: string): string {
	if (typeof str !== "string") {
		return "";
	}
	const htmlEscapes: Record<string, string> = {
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#x27;",
		"/": "&#x2F;",
		"`": "&#x60;",
		"=": "&#x3D;",
	};
	return str.replace(/[&<>"'`=/]/g, (char) => htmlEscapes[char]);
}

/**
 * 验证 URL 格式
 */
export function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		return url.protocol === "https:" || url.protocol === "http:";
	} catch {
		return false;
	}
}

/**
 * 验证字符串长度和内容
 */
export function validateString(
	str: unknown,
	minLength = 1,
	maxLength = 1000,
): boolean {
	return (
		typeof str === "string" &&
		str.length >= minLength &&
		str.length <= maxLength
	);
}

/**
 * 验证数字范围
 */
export function validateNumber(
	num: unknown,
	min: number,
	max: number,
): boolean {
	return (
		typeof num === "number" && !Number.isNaN(num) && num >= min && num <= max
	);
}

/**
 * 安全的 Cookie 设置选项
 */
export interface SecureCookieOptions {
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "strict" | "lax" | "none";
	maxAge?: number;
	path?: string;
}

/**
 * 获取安全的 Cookie 默认选项
 */
export function getSecureCookieOptions(maxAge = 600): SecureCookieOptions {
	return {
		httpOnly: true,
		secure: true,
		sameSite: "lax",
		maxAge,
		path: "/",
	};
}

/**
 * 时间安全的字符串比较（防止时序攻击）
 */
export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) {
		return false;
	}

	const aBytes = new TextEncoder().encode(a);
	const bBytes = new TextEncoder().encode(b);

	let result = 0;
	for (let i = 0; i < aBytes.length; i++) {
		result |= aBytes[i] ^ bBytes[i];
	}

	return result === 0;
}

/**
 * 安全响应头
 */
export const securityHeaders: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"X-XSS-Protection": "1; mode=block",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy":
		"camera=(), microphone=(), geolocation=(), interest-cohort=()",
};

/**
 * 验证请求来源（同源检查）
 */
export function validateOrigin(
	origin: string | null,
	host: string | null,
): boolean {
	if (!origin || !host) {
		return false;
	}

	try {
		const originUrl = new URL(origin);
		// 严格匹配主机名
		return originUrl.host === host;
	} catch {
		return false;
	}
}

/**
 * 生成 CSRF 令牌
 */
export async function generateCsrfToken(secret: string): Promise<string> {
	const timestamp = Date.now().toString();
	const random = generateSecureToken(16);
	const data = `${timestamp}.${random}`;
	const signature = await hmacSha256(secret, data);
	return `${data}.${signature}`;
}

/**
 * 验证 CSRF 令牌
 */
export async function verifyCsrfToken(
	token: string,
	secret: string,
	maxAge = 3600000, // 1小时
): Promise<boolean> {
	try {
		const parts = token.split(".");
		if (parts.length !== 3) {
			return false;
		}

		const [timestamp, random, signature] = parts;
		const data = `${timestamp}.${random}`;

		// 验证签名
		const expectedSignature = await hmacSha256(secret, data);
		if (!timingSafeEqual(signature, expectedSignature)) {
			return false;
		}

		// 验证时间戳
		const tokenTime = Number.parseInt(timestamp, 10);
		if (Number.isNaN(tokenTime) || Date.now() - tokenTime > maxAge) {
			return false;
		}

		return true;
	} catch {
		return false;
	}
}

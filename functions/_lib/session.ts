/**
 * 用户会话与 OAuth 安全工具
 *
 * GitHub OAuth 登录成功后，服务端在 KV 中创建 session 记录：
 *   键：session:<随机 64 位 hex token>
 *   值：{ username, role, githubToken?, provider, createdAt }
 *
 * 客户端只持有不透明的 session token（localStorage "user-token" +
 * httpOnly cookie "blog_session"），GitHub access token 仅存在服务端 KV，
 * 不会出现在博客前端脚本可读的位置（CMS 场景除外，见 auth/callback）。
 *
 * 兼容性：/api/auth/login（用户名密码遗留系统）写入的 session 记录
 * 形状为 { username, role, createdAt }，是本结构的子集，读取逻辑通用。
 */

export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 天
export const SESSION_COOKIE = "blog_session";
export const STATE_COOKIE = "oauth_state";
export const REDIRECT_COOKIE = "auth_redirect";

export interface SessionData {
	username: string;
	role: "admin" | "user" | string;
	/** GitHub access token，仅服务端可见 */
	githubToken?: string;
	provider?: string;
	createdAt: string | number;
}

// ── 随机 token / HMAC ─────────────────────────────────────

export function generateSecureToken(bytes = 32): string {
	const array = new Uint8Array(bytes);
	crypto.getRandomValues(array);
	return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(
	secret: string,
	message: string,
): Promise<string> {
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
	return Array.from(new Uint8Array(signature))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** 常数时间字符串比较，防时序攻击 */
export function timingSafeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

// ── OAuth state（CSRF 防护） ──────────────────────────────

const STATE_TTL_MS = 10 * 60 * 1000; // 10 分钟

/** 生成签名 state：timestamp.random.hmac(secret, timestamp.random) */
export async function createSignedState(secret: string): Promise<string> {
	const payload = `${Date.now()}.${generateSecureToken(32)}`;
	const signature = await hmacSha256Hex(secret, payload);
	return `${payload}.${signature}`;
}

/** 校验 state 的签名与时效 */
export async function verifySignedState(
	secret: string,
	state: string,
): Promise<{ valid: boolean; reason?: string }> {
	const parts = state.split(".");
	if (parts.length !== 3) return { valid: false, reason: "格式不正确" };

	const [timestamp, random, signature] = parts;
	const expected = await hmacSha256Hex(secret, `${timestamp}.${random}`);
	if (!timingSafeEqual(signature, expected)) {
		return { valid: false, reason: "签名不匹配" };
	}

	const stateTime = Number.parseInt(timestamp, 10);
	if (Number.isNaN(stateTime) || Date.now() - stateTime > STATE_TTL_MS) {
		return { valid: false, reason: "已过期" };
	}

	return { valid: true };
}

// ── Cookie 读写 ───────────────────────────────────────────

export function getCookie(request: Request, name: string): string | undefined {
	const header = request.headers.get("Cookie");
	if (!header) return undefined;
	for (const part of header.split(";")) {
		const [key, ...rest] = part.trim().split("=");
		if (key === name) return decodeURIComponent(rest.join("="));
	}
	return undefined;
}

export function serializeCookie(
	name: string,
	value: string,
	maxAgeSeconds: number,
): string {
	return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name: string): string {
	return `${name}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

// ── Session CRUD ──────────────────────────────────────────

export async function createSession(
	kv: KVNamespace,
	data: SessionData,
): Promise<string> {
	const token = generateSecureToken(32);
	await kv.put(`session:${token}`, JSON.stringify(data), {
		expirationTtl: SESSION_TTL_SECONDS,
	});
	return token;
}

export async function getSession(
	kv: KVNamespace,
	token: string,
): Promise<SessionData | null> {
	if (!token) return null;
	const raw = await kv.get(`session:${token}`);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as SessionData;
	} catch (err) {
		console.error("Session record corrupted, deleting:", err);
		await kv.delete(`session:${token}`);
		return null;
	}
}

export async function deleteSession(
	kv: KVNamespace,
	token: string,
): Promise<void> {
	if (!token) return;
	await kv.delete(`session:${token}`);
}

/**
 * 从请求中提取用户 session token。
 * 优先级：body 显式传入 > Authorization: Bearer > blog_session cookie
 */
export function extractSessionToken(
	request: Request,
	bodyToken?: string,
): string {
	if (bodyToken) return bodyToken;
	const authHeader = request.headers.get("Authorization");
	if (authHeader?.startsWith("Bearer ")) return authHeader.slice(7);
	return getCookie(request, SESSION_COOKIE) || "";
}

// ── 站长判定 ──────────────────────────────────────────────

export function resolveOwnerUsername(env: {
	GITHUB_OWNER_USERNAME?: string;
	GITHUB_OWNER?: string;
}): string {
	return env.GITHUB_OWNER_USERNAME || env.GITHUB_OWNER || "";
}

export function isOwner(username: string, ownerUsername: string): boolean {
	return (
		!!username &&
		!!ownerUsername &&
		username.toLowerCase() === ownerUsername.toLowerCase()
	);
}

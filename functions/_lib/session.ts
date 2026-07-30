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

/** state 随签携带的数据（登录发起域与回跳路径） */
export interface StateData {
	/** 登录发起页的 origin，写入前必须经白名单校验 */
	o?: string;
	/** 登录完成后的站内相对路径 */
	r?: string;
}

function base64UrlEncode(s: string): string {
	return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlDecode(s: string): string {
	const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
	return atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
}

/** 生成签名 state：timestamp.random[.base64url(data)].hmac */
export async function createSignedState(
	secret: string,
	data?: StateData,
): Promise<string> {
	let payload = `${Date.now()}.${generateSecureToken(32)}`;
	if (data && Object.keys(data).length > 0) {
		payload += `.${base64UrlEncode(JSON.stringify(data))}`;
	}
	const signature = await hmacSha256Hex(secret, payload);
	return `${payload}.${signature}`;
}

/** 校验 state 的签名与时效，并取出随签数据（兼容不带数据的旧 3 段格式） */
export async function verifySignedState(
	secret: string,
	state: string,
): Promise<{ valid: boolean; reason?: string; data?: StateData }> {
	const parts = state.split(".");
	if (parts.length !== 3 && parts.length !== 4) {
		return { valid: false, reason: "格式不正确" };
	}

	const signature = parts[parts.length - 1];
	const payload = parts.slice(0, -1).join(".");
	const expected = await hmacSha256Hex(secret, payload);
	if (!timingSafeEqual(signature, expected)) {
		return { valid: false, reason: "签名不匹配" };
	}

	const stateTime = Number.parseInt(parts[0], 10);
	if (Number.isNaN(stateTime) || Date.now() - stateTime > STATE_TTL_MS) {
		return { valid: false, reason: "已过期" };
	}

	let data: StateData | undefined;
	if (parts.length === 4) {
		try {
			data = JSON.parse(base64UrlDecode(parts[2])) as StateData;
		} catch {
			return { valid: false, reason: "数据解析失败" };
		}
	}

	return { valid: true, data };
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

// ── 多域名（原站 + 国内加速站）──────────────────────────────

/**
 * 允许发起登录并在登录完成后回跳的站点 origin 白名单。
 * 可用环境变量 ALLOWED_ORIGINS（逗号分隔）覆盖。
 */
const DEFAULT_ALLOWED_ORIGINS = [
	"https://blog.johntime.top",
	"https://blog-cn.johntime.top",
];

export function resolveAllowedOrigins(env: {
	ALLOWED_ORIGINS?: string;
}): string[] {
	const raw = env.ALLOWED_ORIGINS;
	if (!raw) return DEFAULT_ALLOWED_ORIGINS;
	return raw
		.split(",")
		.map((s) => s.trim().replace(/\/$/, ""))
		.filter(Boolean);
}

/** 仅接受白名单内的 origin，其余返回 null（防开放重定向） */
export function sanitizeReturnOrigin(
	raw: string | null | undefined,
	env: { ALLOWED_ORIGINS?: string },
): string | null {
	if (!raw) return null;
	const normalized = raw.trim().replace(/\/$/, "");
	return resolveAllowedOrigins(env).includes(normalized) ? normalized : null;
}

/**
 * 从请求推导发起域：反代改写 Host 时优先取 X-Forwarded-Host，
 * 其次请求自身 origin；两者都必须命中白名单，否则返回 null。
 */
export function resolveRequestOrigin(
	request: Request,
	env: { ALLOWED_ORIGINS?: string },
): string | null {
	const forwardedHost = request.headers.get("X-Forwarded-Host");
	if (forwardedHost) {
		const candidate = sanitizeReturnOrigin(
			`https://${forwardedHost.split(",")[0].trim()}`,
			env,
		);
		if (candidate) return candidate;
	}
	return sanitizeReturnOrigin(new URL(request.url).origin, env);
}

// ── 统一鉴权入口 ──────────────────────────────────────────

export interface AuthInfo {
	username: string;
	role: "admin" | "user" | string;
	/** 凭证来源：KV session / ADMIN_PASSWORD 管理 token / 遗留 GitHub token */
	provider: "session" | "admin-password" | "github-token";
}

interface AuthEnv {
	POST_ENCRYPTION?: KVNamespace;
	GITHUB_OWNER_USERNAME?: string;
	GITHUB_OWNER?: string;
}

/**
 * 全站唯一的身份校验函数。任何需要判断「是谁、是不是管理员」的地方
 * （/api/auth/*、/api/admin/* 中间件）都必须走这里，不要各写各的。
 *
 * 凭证识别顺序：
 * 1. KV `session:<token>`     — GitHub OAuth 登录 / 遗留用户名密码登录的会话
 * 2. KV `admin:token:<token>` — ADMIN_PASSWORD 登录发放的管理 token（视为 admin）
 * 3. GitHub access token      — 兼容旧版前端，直连 GitHub 校验，站长即 admin
 *
 * 返回 null 表示未认证。
 */
export async function authenticate(
	request: Request,
	env: AuthEnv,
	bodyToken?: string,
): Promise<AuthInfo | null> {
	const token = extractSessionToken(request, bodyToken);
	if (!token) return null;

	const kv = env.POST_ENCRYPTION;
	if (kv) {
		const session = await getSession(kv, token);
		if (session) {
			return {
				username: session.username,
				role: session.role || "user",
				provider: "session",
			};
		}

		const adminFlag = await kv.get(`admin:token:${token}`);
		if (adminFlag === "valid") {
			return {
				username: resolveOwnerUsername(env) || "admin",
				role: "admin",
				provider: "admin-password",
			};
		}
	}

	// 遗留路径：token 可能是旧版前端存下的 GitHub access token
	try {
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Firefly-Blog-Auth",
				Accept: "application/vnd.github+json",
			},
		});
		if (!response.ok) return null;

		const user = (await response.json()) as { login?: string };
		if (!user.login) return null;

		return {
			username: user.login,
			role: isOwner(user.login, resolveOwnerUsername(env)) ? "admin" : "user",
			provider: "github-token",
		};
	} catch (err) {
		console.error("GitHub token validation failed:", err);
		return null;
	}
}

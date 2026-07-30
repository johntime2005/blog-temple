/**
 * 客户端统一凭证工具
 *
 * 全站前端只认一种登录态：localStorage "user-token"（不透明 session token）。
 * 所有组件（侧栏用户面板、管理后台、私密内容守卫）都通过这里
 * 读取凭证、校验身份、登出，不要各自直接操作 localStorage 或复制校验逻辑。
 *
 * 服务端对应的唯一鉴权入口是 functions/_lib/session.ts 的 authenticate()。
 */

import { siteConfig } from "@/config";

export const TOKEN_KEY = "user-token";
/** 登录态变化时派发的事件名，同页各 Svelte 岛监听它刷新自身 */
export const AUTH_CHANGED_EVENT = "blog-auth-changed";

export interface AuthState {
	valid: boolean;
	username?: string;
	role?: "admin" | "user" | string;
}

export function getToken(): string {
	return localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(token: string): void {
	localStorage.setItem(TOKEN_KEY, token);
	window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export function clearToken(): void {
	localStorage.removeItem(TOKEN_KEY);
	localStorage.removeItem("netlify-cms-user");
	window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

/**
 * 校验当前登录态。
 * 网络/服务异常返回 null（凭证保留，调用方按"未知"处理，不要误删登录态）。
 */
export async function verifyAuth(token?: string): Promise<AuthState | null> {
	const t = token ?? getToken();
	if (!t) return { valid: false };

	try {
		const res = await fetch("/api/auth/verify/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token: t }),
		});
		return (await res.json()) as AuthState;
	} catch (err) {
		console.error("登录态校验失败（保留本地凭证）:", err);
		return null;
	}
}

/** 登出：撤销服务端 session、清除本地凭证 */
export async function logout(): Promise<void> {
	const token = getToken();
	if (token) {
		try {
			await fetch("/api/auth/logout/", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			});
		} catch (err) {
			console.error("Logout request failed:", err);
		}
	}
	clearToken();
}

/** 跳转到登录页并在登录后回到当前页面 */
export function gotoLogin(): void {
	let currentPath = window.location.pathname;
	if (currentPath !== "/" && !currentPath.endsWith("/")) {
		currentPath += "/";
	}
	window.location.href = `/login/?redirect=${encodeURIComponent(currentPath)}`;
}

/**
 * 构造 OAuth 登录弹窗地址。
 *
 * 认证流程统一走主站（GitHub OAuth App 只注册主站回调，且加速站的
 * /auth/* 不经反代）；从加速站等其他域发起时带上本页 origin（?from=），
 * 服务端经白名单校验后随签名 state 传递，登录完成后回跳发起域。
 */
export function buildAuthUrl(redirect = "/"): string {
	const authBase = siteConfig.site_url.replace(/\/$/, "");
	const params = new URLSearchParams({ redirect });
	if (window.location.origin !== authBase) {
		params.set("from", window.location.origin);
	}
	return `${authBase}/auth/?${params.toString()}`;
}

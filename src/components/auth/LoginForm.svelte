<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import {
	buildAuthUrl,
	clearToken,
	getToken,
	logout,
	setToken,
	verifyAuth,
} from "@/utils/auth-client";

interface Props {
	redirectUrl?: string;
}

let { redirectUrl = "/" }: Props = $props();
let authWindow: Window | null = null;

// 已登录身份；null 表示未登录（或校验中）
let user = $state<{ username?: string; role?: string } | null>(null);

// 从受保护页面跳转来的登录（带具体 redirect）保持"登录完成即送回原页"；
// 直接访问登录页（redirect 为默认首页）则登录后停留，展示仪表盘入口
const hasExplicitRedirect = redirectUrl !== "/";

function handleStorageChange(e: StorageEvent) {
	if (e.key === "user-token" && e.newValue) {
		verifyExistingToken(e.newValue);
	}
}

function handleMessage(e: MessageEvent) {
	if (
		typeof e.data === "string" &&
		e.data.startsWith("authorization:github:success:")
	) {
		try {
			const json = e.data.replace("authorization:github:success:", "");
			const data = JSON.parse(json);
			// 优先使用博客自身的 session token；token 字段在站长场景下
			// 是给 CMS 用的 GitHub token，不作为博客登录凭证
			const token = data.sessionToken || data.token;
			if (token) {
				setToken(token);
				verifyExistingToken(token);
			}
		} catch {}
	} else if (e.data?.sessionToken || e.data?.token) {
		const token = e.data.sessionToken || e.data.token;
		setToken(token);
		verifyExistingToken(token);
	}
}

onMount(() => {
	recheckAuth();
	window.addEventListener("storage", handleStorageChange);
	window.addEventListener("message", handleMessage);
	// 手机上 popup/新标签页完成授权时，本页往往在后台被挂起，
	// postMessage 与 storage 事件都可能错过；回到前台时兜底重查登录态
	document.addEventListener("visibilitychange", recheckAuth);
	window.addEventListener("focus", recheckAuth);
});

onDestroy(() => {
	if (typeof window !== "undefined") {
		window.removeEventListener("storage", handleStorageChange);
		window.removeEventListener("message", handleMessage);
		document.removeEventListener("visibilitychange", recheckAuth);
		window.removeEventListener("focus", recheckAuth);
	}
});

function recheckAuth() {
	if (user) return;
	if (typeof document !== "undefined" && document.hidden) return;
	const token = getToken();
	if (token) {
		verifyExistingToken(token);
	}
}

async function verifyExistingToken(token: string) {
	const auth = await verifyAuth(token);
	if (auth?.valid) {
		if (hasExplicitRedirect) {
			window.location.href = redirectUrl;
			return;
		}
		user = { username: auth.username, role: auth.role };
	} else if (auth) {
		// 仅在服务端明确判定无效时清除；网络/服务异常（auth === null）保留凭证
		clearToken();
		user = null;
	}
}

function openAuthPopup(e: MouseEvent) {
	e.preventDefault();
	const url = buildAuthUrl(redirectUrl);
	const width = 600;
	const height = 700;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;
	authWindow = window.open(
		url,
		"github-auth",
		`width=${width},height=${height},left=${left},top=${top}`,
	);
	// popup 关闭后兜底重查登录态（postMessage 因任何原因丢失时的恢复路径）
	const timer = setInterval(() => {
		if (!authWindow || authWindow.closed) {
			clearInterval(timer);
			recheckAuth();
		}
	}, 800);
}

async function handleLogout() {
	await logout();
	user = null;
}
</script>

<div class="login-container">
	<div class="login-card">
		{#if user}
			<div class="login-header">
				<Icon icon="mdi:account-check" class="login-icon" />
				<h1>已登录</h1>
				<p>
					{user.username ? `${user.username}，` : ""}欢迎回来
				</p>
			</div>

			<div class="login-actions">
				{#if user.role === "admin"}
					<a href="/admin/" class="primary-button">
						<Icon icon="mdi:view-dashboard" />
						<span>进入仪表盘</span>
					</a>
				{:else}
					<a href="/" class="primary-button">
						<Icon icon="mdi:home" />
						<span>返回首页</span>
					</a>
				{/if}
				<button onclick={handleLogout} class="secondary-button">
					<Icon icon="mdi:logout" />
					<span>退出登录</span>
				</button>
			</div>
		{:else}
			<div class="login-header">
				<Icon icon="mdi:account-circle" class="login-icon" />
				<h1>用户登录</h1>
				<p>请使用 GitHub 账号登录以访问受保护的内容</p>
			</div>

			<div class="login-actions">
				<button onclick={openAuthPopup} class="github-login-button">
					<Icon icon="fa6-brands:github" />
					<span>使用 GitHub 登录</span>
				</button>
			</div>
		{/if}
	</div>
</div>

<style>
	.login-container {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem 1rem;
		background: var(--page-bg);
	}

	.login-card {
		width: 100%;
		max-width: 400px;
		background: var(--card-bg);
		border-radius: 12px;
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		animation: slideUp 0.3s ease-out;
	}

	@keyframes slideUp {
		from {
			opacity: 0;
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.login-header {
		padding: 2rem;
		text-align: center;
		background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
		color: white;
	}

	.login-header :global(.login-icon) {
		font-size: 3rem;
		margin-bottom: 0.5rem;
	}

	.login-header h1 {
		font-size: 1.5rem;
		margin: 0.5rem 0;
		font-weight: 600;
	}

	.login-header p {
		font-size: 0.875rem;
		margin: 0;
		opacity: 0.9;
	}

	.login-actions {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.github-login-button,
	.primary-button,
	.secondary-button {
		width: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		text-decoration: none;
	}

	.github-login-button {
		background: #24292e;
		color: white;
	}

	.github-login-button:hover {
		background: #2f363d;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.primary-button {
		background: var(--primary);
		color: white;
	}

	.primary-button:hover {
		opacity: 0.9;
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.secondary-button {
		background: transparent;
		color: var(--text-secondary, #666);
		border: 1px solid var(--line-divider, #ddd);
	}

	.secondary-button:hover {
		color: var(--text-color, #333);
		border-color: var(--text-secondary, #999);
	}
</style>

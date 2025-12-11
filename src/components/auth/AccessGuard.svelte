```html
<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount, type Snippet } from "svelte";
import { decryptContent } from "@/utils/security";

interface Props {
	accessLevel: string; // 访问级别：public | members-only | restricted
	postSlug: string; // 文章slug（用于重定向回来）
	children?: Snippet;
	encryptedContent?: string;
}

let { accessLevel, postSlug, children, encryptedContent }: Props = $props();

// 状态管理
let isChecking = $state(true);
let isAuthenticated = $state(false);
let username = $state("");
let showLoginPrompt = $state(false);
let decryptedHtml = $state("");

onMount(async () => {
	// 如果是public，直接显示内容
	if (accessLevel === "public" || !accessLevel) {
		isChecking = false;
		isAuthenticated = true;
		return;
	}

	// 检查用户登录状态
	const token = localStorage.getItem("user-token");
	if (!token) {
		// 未登录
		isChecking = false;
		showLoginPrompt = true;
		return;
	}

	// 如果有加密内容，尝试获取密钥并解密
	if (encryptedContent) {
		try {
			const response = await fetch("/api/auth/key", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token, slug: postSlug }),
			});

			const data = await response.json();

			if (data.valid && data.key) {
				// 解密
				const content = decryptContent(encryptedContent, data.key);
				if (content) {
					decryptedHtml = content;
					isAuthenticated = true;
					// TODO: Get username separately or include in key response?
					// assuming verify endpoint also returns user info if we want to show "Logged in as X"
					// Modified /api/auth/key to just return key. We can fetch user info or assume validity.
					// For display, let's just show "Member".
					username = "Member";
				} else {
					console.error("Decryption failed");
					showLoginPrompt = true;
					localStorage.removeItem("user-token");
				}
			} else {
				localStorage.removeItem("user-token");
				showLoginPrompt = true;
			}
		} catch (error) {
			console.error("Auth/Key verification failed:", error);
			showLoginPrompt = true;
		} finally {
			isChecking = false;
		}
	} else {
		// Legacy flow (no encryption, just gating)
		try {
			const response = await fetch("/api/auth/verify", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			});

			const data = await response.json();

			if (data.valid) {
				isAuthenticated = true;
				username = data.username;
			} else {
				localStorage.removeItem("user-token");
				showLoginPrompt = true;
			}
		} catch (error) {
			console.error("Auth verification failed:", error);
			showLoginPrompt = true;
		} finally {
			isChecking = false;
		}
	}
});

// 跳转到登录页面
function goToLogin() {
	const currentPath = window.location.pathname;
	window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
}

// 登出
async function logout() {
	const token = localStorage.getItem("user-token");
	if (token) {
		try {
			await fetch("/api/auth/logout", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ token }),
			});
		} catch (error) {
			console.error("Logout failed:", error);
		}
	}
	localStorage.removeItem("user-token");
	window.location.reload();
}
</script>

{#if isChecking}
	<!-- 检查中 -->
	<div class="access-guard checking">
		<Icon icon="mdi:loading" class="spinning" />
		<p>正在验证访问权限...</p>
	</div>
{:else if showLoginPrompt}
	<!-- 需要登录 -->
	<div class="access-guard login-required">
		<div class="prompt-card">
			<Icon icon="mdi:lock" class="lock-icon" />
			<h2>需要登录</h2>
			<p>这篇文章需要登录后才能查看</p>
			<div class="actions">
				<button class="login-btn" onclick={goToLogin}>
					<Icon icon="mdi:login" />
					<span>立即登录</span>
				</button>
				<a href="/" class="back-btn">
					<Icon icon="mdi:arrow-left" />
					<span>返回首页</span>
				</a>
			</div>
		</div>
	</div>
{:else if isAuthenticated}
	<!-- 已登录，显示用户信息 -->
	<div class="auth-status">
		<div class="user-info">
			<Icon icon="mdi:account-check" />
			<span>已登录：{username}</span>
		</div>
		<button class="logout-btn" onclick={logout}>
			<Icon icon="mdi:logout" />
			<span>登出</span>
		</button>
	</div>
    {#if decryptedHtml}
        <div class="markdown-content onload-animation mb-6">
            {@html decryptedHtml}
        </div>
    {:else if children}
        {@render children()}
    {/if}
{/if}

<style>
	.access-guard {
		min-height: 50vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		padding: 3rem 1rem;
	}

	.access-guard.checking {
		color: var(--text-secondary);
	}

	.access-guard.checking :global(.spinning) {
		font-size: 3rem;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.prompt-card {
		background: var(--card-bg);
		border-radius: 16px;
		padding: 3rem 2rem;
		text-align: center;
		max-width: 500px;
		box-shadow: var(--shadow-lg);
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

	.prompt-card :global(.lock-icon) {
		font-size: 4rem;
		color: var(--primary);
		margin-bottom: 1rem;
	}

	.prompt-card h2 {
		font-size: 1.5rem;
		margin: 0 0 0.5rem 0;
		color: var(--text-color);
	}

	.prompt-card p {
		font-size: 1rem;
		margin: 0 0 2rem 0;
		color: var(--text-secondary);
	}

	.actions {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.actions button,
	.actions a {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 1.5rem;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.login-btn {
		background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
		color: white;
		border: none;
	}

	.login-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.4);
	}

	.back-btn {
		background: var(--page-bg);
		color: var(--text-color);
		border: 2px solid var(--line-divider);
	}

	.back-btn:hover {
		background: var(--card-bg);
		border-color: var(--primary);
	}

	.auth-status {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.75rem 1rem;
		background: var(--card-bg);
		border-radius: 8px;
		margin-bottom: 1rem;
		border: 1px solid var(--line-divider);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.user-info :global(svg) {
		font-size: 1.25rem;
		color: var(--primary);
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.375rem 0.75rem;
		background: transparent;
		color: var(--text-secondary);
		border: 1px solid var(--line-divider);
		border-radius: 6px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.logout-btn:hover {
		background: var(--page-bg);
		border-color: var(--primary);
		color: var(--primary);
	}

	.logout-btn :global(svg) {
		font-size: 1rem;
	}
</style>

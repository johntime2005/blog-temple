<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount, type Snippet } from "svelte";
import { decryptContent } from "@/utils/security";

interface Props {
	encryptionId: string;
	postSlug: string;
	children?: Snippet;
	encryptedContent?: string;
}

let { encryptionId, postSlug, children, encryptedContent }: Props = $props();

let password = $state("");
let isVerifying = $state(false);
let errorMessage = $state("");
let isUnlocked = $state(false);
let token = $state("");
let decryptedHtml = $state("");
let debugInfo = $state<any>(null);

// 检查本地存储中是否已有有效令牌（即解密密钥）
onMount(async () => {
	// Debug Fetch
	const userToken = localStorage.getItem("user-token");
	if (userToken) {
		try {
			const res = await fetch("/api/debug-auth/", {
				// Added trailing slash
				method: "POST",
				headers: { Authorization: `Bearer ${userToken}` },
			});
			debugInfo = await res.json();
		} catch (e) {
			console.error("Debug fetch failed", e);
			debugInfo = { status: "Debug Fetch Failed", error: String(e) };
		}
	} else {
		debugInfo = { status: "No Token Found locally" };
	}

	// 尝试获取本地存储的密钥 或 临时Token
	const storedToken = localStorage.getItem(`post-token:${postSlug}`);
	const storedKey = localStorage.getItem(`post-key:${postSlug}`);

	if (storedToken) {
		// 如果有临时 Token，验证并获取密钥
		await fetchAndDecrypt(storedToken, true);
	} else if (storedKey && encryptedContent) {
		// Legacy: 直接存储的 Key
		tryDecrypt(storedKey);
	} else if (userToken) {
		// [NEW] 如果已登录，尝试自动解锁！
		// 因为 /api/auth/key 也会验证 Owner 身份
		console.log("Attempting auto-unlock with User Token...");
		await fetchAndDecrypt(userToken, true);
	}
});

function tryDecrypt(key: string) {
	if (!encryptedContent) return;
	try {
		const content = decryptContent(encryptedContent, key);
		if (content) {
			decryptedHtml = content;
			token = key;
			isUnlocked = true;
		} else {
			throw new Error("Decryption failed");
		}
	} catch (e) {
		localStorage.removeItem(`post-key:${postSlug}`);
	}
}

async function fetchAndDecrypt(authToken: string, _isSession: boolean) {
	try {
		// 使用 Auth Token 获取真实密钥
		const res = await fetch("/api/auth/key/", {
			method: "POST",
			body: JSON.stringify({ token: authToken, slug: postSlug }),
		});

		if (res.ok) {
			const data = await res.json();
			if (data.valid && data.key) {
				if (!encryptedContent) {
					// No content to decrypt, just unlock (unlikely for this component?)
					token = data.key;
					isUnlocked = true;
					return;
				}

				const decrypted = decryptContent(encryptedContent, data.key);
				if (decrypted) {
					decryptedHtml = decrypted;
					isUnlocked = true;
					token = authToken; // Store the AUTH token as our state token
					localStorage.setItem(`post-token:${postSlug}`, authToken);
				} else {
					errorMessage = "解密失败，密钥可能不正确";
					localStorage.removeItem(`post-token:${postSlug}`);
				}
			} else {
				errorMessage = data.message || "无法获取解密密钥";
				localStorage.removeItem(`post-token:${postSlug}`);
			}
		} else {
			try {
				const err = await res.json();
				errorMessage = `验证失败 (${res.status}): ${err.message || res.statusText}`;
			} catch (e) {
				errorMessage = `验证失败 (${res.status}): ${res.statusText}`;
			}
			localStorage.removeItem(`post-token:${postSlug}`);
		}
	} catch (e) {
		console.error("Decryption failed", e);
		errorMessage = `解密出错: ${e instanceof Error ? e.message : String(e)}`;
		localStorage.removeItem(`post-token:${postSlug}`);
	}
}

function handleLogin() {
	// 重定向到 GitHub 登录
	let currentPath = window.location.pathname;
	if (currentPath !== "/" && !currentPath.endsWith("/")) {
		currentPath += "/";
	}
	// Ensure trailing slash for consistent routing / redirection handling
	window.location.href = `/login/?redirect=${encodeURIComponent(currentPath)}`;
}

async function handleSubmit(e: Event) {
	e.preventDefault();
	errorMessage = "";
	isVerifying = true;

	try {
		// 请求 API 验证密码并获取密钥
		const response = await fetch("/api/verify-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				encryptionId,
				password,
			}),
		});

		const data = await response.json();

		if (data.success && data.token) {
			// Check if it's a session token or direct key
			if (data.isSession) {
				// It's a session token (share token). We must fetch the key.
				await fetchAndDecrypt(data.token, true);
			} else {
				// Legacy/Static: It IS the key
				tryDecrypt(data.token);
				// Store it (Legacy behavior)
				if (isUnlocked) {
					localStorage.setItem(`post-key:${postSlug}`, data.token);
				}
			}
		} else {
			errorMessage = data.message || "密码错误，请重试";
			password = "";
		}
	} catch (error) {
		console.error("Password verification error:", error);
		errorMessage = "验证失败，请稍后重试";
	} finally {
		isVerifying = false;
	}
}
</script>


{#if isUnlocked}
    {#if decryptedHtml}
        <div class="markdown-content onload-animation mb-6">
            {@html decryptedHtml}
        </div>
    {:else if children}
        {@render children()}
    {/if}
{/if}






{#if !isUnlocked}
	<div class="encryption-overlay">
		<div class="encryption-container card-base">
			<div class="encryption-icon">
				<Icon icon="material-symbols:lock-outline" class="text-6xl" />
			</div>

			<h2 class="encryption-title">此文章已加密</h2>
			<p class="encryption-description">请输入密码以查看内容</p>

			<form onsubmit={handleSubmit} class="encryption-form">
				<div class="input-wrapper">
					<Icon icon="material-symbols:vpn-key-outline" class="input-icon" />
					<input
						type="password"
						bind:value={password}
						placeholder="请输入密码"
						disabled={isVerifying}
						class="password-input"
						autocomplete="off"
					/>
				</div>

				{#if errorMessage}
					<div class="error-message">
						<Icon icon="material-symbols:error-outline" class="error-icon" />
						<span>{errorMessage}</span>
					</div>
				{/if}

				<button type="submit" disabled={isVerifying || !password} class="submit-button">
					{#if isVerifying}
						<Icon icon="svg-spinners:180-ring" class="spinner" />
						<span>验证中...</span>
					{:else}
						<Icon icon="material-symbols:lock-open-outline" />
						<span>解锁文章</span>
					{/if}
				</button>
			</form>

			<div class="encryption-hint">
				<Icon icon="material-symbols:info-outline" class="hint-icon" />
				<span>如果忘记密码，请联系站长</span>
			</div>

            <div class="divider">
                <span>或者</span>
            </div>

            <button onclick={handleLogin} class="login-button">
                <Icon icon="mdi:github" class="login-icon" />
                <span>我是站长 (GitHub 登录)</span>
            </button>
		</div>
	</div>
{/if}

<style>
	.encryption-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(10px);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 9999;
		padding: 1rem;
	}

	.encryption-container {
		max-width: 480px;
		width: 100%;
		padding: 3rem 2rem;
		text-align: center;
		border-radius: var(--radius-large);
	}

	.encryption-icon {
		color: var(--primary);
		margin-bottom: 1.5rem;
		display: flex;
		justify-content: center;
	}

	.encryption-title {
		font-size: 1.75rem;
		font-weight: 700;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.encryption-description {
		color: var(--text-secondary);
		margin-bottom: 2rem;
	}

	.encryption-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 1rem;
		color: var(--text-tertiary);
		font-size: 1.25rem;
		pointer-events: none;
	}

	.password-input {
		width: 100%;
		padding: 0.875rem 1rem 0.875rem 3rem;
		border: 2px solid var(--line-divider);
		border-radius: var(--radius-medium);
		background: var(--card-bg);
		color: var(--text-primary);
		font-size: 1rem;
		transition: all 0.2s;
	}

	.password-input:focus {
		outline: none;
		border-color: var(--primary);
		box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.1);
	}

	.password-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		border-radius: var(--radius-medium);
		color: #ef4444;
		font-size: 0.875rem;
	}

	.error-icon {
		flex-shrink: 0;
		font-size: 1.125rem;
	}

	.submit-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.875rem 2rem;
		background: var(--primary);
		color: white;
		border: none;
		border-radius: var(--radius-medium);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.submit-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.3);
	}

	.submit-button:active:not(:disabled) {
		transform: translateY(0);
	}

	.submit-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.spinner {
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

	.encryption-hint {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		margin-top: 1.5rem;
		color: var(--text-tertiary);
		font-size: 0.875rem;
	}

	.hint-icon {
		font-size: 1rem;
	}

    .divider {
        display: flex;
        align-items: center;
        text-align: center;
        margin: 1.5rem 0;
        color: var(--text-tertiary);
        font-size: 0.875rem;
    }
    .divider::before, .divider::after {
        content: '';
        flex: 1;
        border-bottom: 1px solid var(--line-divider);
    }
    .divider span {
        padding: 0 10px;
    }

    .login-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        width: 100%;
        padding: 0.875rem 0;
        background: var(--card-bg);
        border: 2px solid var(--line-divider);
        color: var(--text-secondary);
        border-radius: var(--radius-medium);
        font-size: 0.95rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
    }
    .login-button:hover {
        border-color: var(--text-secondary);
        color: var(--text-primary);
        background: var(--page-bg);
    }
    .login-icon {
        font-size: 1.25rem;
    }
</style>

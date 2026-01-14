<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";

interface Props {
	redirectUrl?: string;
}

let { redirectUrl = "/" }: Props = $props();
let authWindow: Window | null = null;

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
			if (data.token) {
				localStorage.setItem("user-token", data.token);
				window.location.href = redirectUrl;
			}
		} catch {}
	} else if (e.data?.token) {
		localStorage.setItem("user-token", e.data.token);
		window.location.href = redirectUrl;
	}
}

onMount(() => {
	const token = localStorage.getItem("user-token");
	if (token) {
		verifyExistingToken(token);
	}
	window.addEventListener("storage", handleStorageChange);
	window.addEventListener("message", handleMessage);
});

onDestroy(() => {
	if (typeof window !== "undefined") {
		window.removeEventListener("storage", handleStorageChange);
		window.removeEventListener("message", handleMessage);
	}
});

async function verifyExistingToken(token: string) {
	try {
		const response = await fetch("/api/auth/verify/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		});
		const data = await response.json();
		if (data.valid) {
			window.location.href = redirectUrl;
		} else {
			localStorage.removeItem("user-token");
		}
	} catch {
		localStorage.removeItem("user-token");
	}
}

function openAuthPopup(e: MouseEvent) {
	e.preventDefault();
	const url = `/auth/?redirect=${encodeURIComponent(redirectUrl)}`;
	const width = 600;
	const height = 700;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;
	authWindow = window.open(
		url,
		"github-auth",
		`width=${width},height=${height},left=${left},top=${top}`,
	);
}
</script>

<div class="login-container">
	<div class="login-card">
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
	}

    .github-login-button {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.875rem 1.5rem;
        background: #24292e;
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
    }

    .github-login-button:hover {
        background: #2f363d;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
</style>

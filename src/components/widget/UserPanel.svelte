<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import {
	AUTH_CHANGED_EVENT,
	getToken,
	gotoLogin,
	logout,
	verifyAuth,
} from "@/utils/auth-client";

// 状态：checking → guest | user | admin
let status = $state<"checking" | "guest" | "user" | "admin">("checking");
let username = $state("");

async function refresh() {
	const token = getToken();
	if (!token) {
		status = "guest";
		return;
	}
	const auth = await verifyAuth(token);
	if (auth === null) {
		// 网络/服务异常：按未登录展示，但不清凭证
		status = "guest";
		return;
	}
	if (!auth.valid) {
		status = "guest";
		return;
	}
	username = auth.username || "";
	status = auth.role === "admin" ? "admin" : "user";
}

async function handleLogout() {
	await logout();
	status = "guest";
	username = "";
}

function handleAuthChanged() {
	refresh();
}

onMount(() => {
	refresh();
	window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
	window.addEventListener("storage", handleAuthChanged);
});

onDestroy(() => {
	if (typeof window !== "undefined") {
		window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChanged);
		window.removeEventListener("storage", handleAuthChanged);
	}
});
</script>

<div class="user-panel border-t border-dashed border-[var(--line-divider)] mt-2 pt-2 transition">
	{#if status === "checking"}
		<div class="flex items-center justify-center gap-2 h-9 text-sm text-[var(--text-secondary)]">
			<Icon icon="svg-spinners:180-ring" />
		</div>
	{:else if status === "guest"}
		<button
			onclick={gotoLogin}
			class="btn-regular w-full rounded-lg h-9 flex items-center justify-center gap-2 text-sm font-bold active:scale-95"
		>
			<Icon icon="fa6-brands:github" />
			<span>登录</span>
		</button>
	{:else}
		<div class="flex items-center gap-2 px-1 mb-1.5 text-sm text-[var(--text-secondary)]">
			<Icon icon="mdi:account-check" class="text-[var(--primary)] text-base shrink-0" />
			<span class="truncate" title={username}>{username}</span>
			<button
				onclick={handleLogout}
				class="ml-auto shrink-0 text-xs hover:text-[var(--primary)] transition"
				aria-label="登出"
				title="登出"
			>
				<Icon icon="mdi:logout" class="text-base" />
			</button>
		</div>
		{#if status === "admin"}
			<a
				href="/admin/"
				class="btn-regular w-full rounded-lg h-9 flex items-center justify-center gap-2 text-sm font-bold active:scale-95"
			>
				<Icon icon="mdi:view-dashboard" />
				<span>仪表盘</span>
			</a>
		{/if}
	{/if}
</div>

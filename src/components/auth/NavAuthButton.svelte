<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import { AUTH_CHANGED_EVENT, getToken, verifyAuth } from "@/utils/auth-client";

// anon=未登录显示"登录"；admin=站长显示"仪表盘"；user=普通用户不显示按钮
type AuthView = "anon" | "admin" | "user";
let view = $state<AuthView>("anon");

async function refresh() {
	const token = getToken();
	if (!token) {
		view = "anon";
		return;
	}
	const auth = await verifyAuth(token);
	if (auth === null) return; // 网络/服务异常：保持现状，不误判为未登录
	if (!auth.valid) {
		view = "anon";
		return;
	}
	view = auth.role === "admin" ? "admin" : "user";
}

function onVisible() {
	if (typeof document !== "undefined" && document.hidden) return;
	refresh();
}

onMount(() => {
	refresh();
	// 同页登录/登出（setToken/clearToken 派发）即时同步；
	// 回到前台兜底覆盖 popup 授权期间本页被挂起错过消息的场景
	window.addEventListener(AUTH_CHANGED_EVENT, refresh);
	window.addEventListener("focus", onVisible);
	document.addEventListener("visibilitychange", onVisible);
});

onDestroy(() => {
	if (typeof window !== "undefined") {
		window.removeEventListener(AUTH_CHANGED_EVENT, refresh);
		window.removeEventListener("focus", onVisible);
		document.removeEventListener("visibilitychange", onVisible);
	}
});
</script>

{#if view === "admin"}
	<a
		href="/admin/"
		class="btn-regular rounded-lg h-9 px-2.5 xl:px-3 flex items-center gap-1.5 text-sm font-bold active:scale-95"
		aria-label="仪表盘"
		title="仪表盘"
	>
		<Icon icon="material-symbols:dashboard" class="text-base" />
		<!-- lg~xl 区间导航栏最挤（搜索框聚焦还会展开），只留图标防重叠 -->
		<span class="hidden xl:inline">仪表盘</span>
	</a>
{:else if view === "anon"}
	<a
		href="/login/"
		class="btn-regular rounded-lg h-9 px-2.5 xl:px-3 flex items-center gap-1.5 text-sm font-bold active:scale-95"
		aria-label="登录"
		title="登录"
	>
		<Icon icon="fa6-brands:github" class="text-base" />
		<span class="hidden xl:inline">登录</span>
	</a>
{/if}

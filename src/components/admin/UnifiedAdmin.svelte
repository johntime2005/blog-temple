<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";
import AdminPanel from "./AdminPanel.svelte";
// 导入现有组件
import CategoryManager from "./CategoryManager.svelte";

// 类型定义
interface CategoryInfo {
	id: string;
	name: string;
	slug: string;
	icon: string;
	description: string;
	showInHome: boolean;
	showInNavbar: boolean;
	syncToPublic: boolean;
	encrypted: boolean;
	order: number;
	color: string;
	customLink?: string;
	postCount: number;
}

interface Post {
	slug: string;
	title: string;
	published: string;
	encrypted: boolean;
	encryptionId: string;
	category: string;
	tags: string[];
}

// Props
interface Props {
	categories: CategoryInfo[];
	posts: Post[];
}

let { categories, posts }: Props = $props();

// 导航标签
type TabId = "posts" | "categories" | "settings" | "encryption";

// 状态
let activeTab = $state<TabId>("posts");
let isLoggedIn = $state(false);
let isLoggingIn = $state(false);
let loginError = $state("");
let adminToken = $state("");
let username = $state("");
let isMobile = $state(true);
let showMobileMenu = $state(false);

// 响应式检测
function checkMobile() {
	if (typeof window !== "undefined") {
		isMobile = window.innerWidth < 768;
	}
}

onMount(() => {
	checkMobile();
	window.addEventListener("resize", checkMobile);

	// 检查已存储的 token
	const storedToken = localStorage.getItem("user-token");
	if (storedToken) {
		verifyStoredToken(storedToken);
	}

	// 监听跨窗口消息
	window.addEventListener("message", handleMessage);
});

onDestroy(() => {
	if (typeof window !== "undefined") {
		window.removeEventListener("resize", checkMobile);
		window.removeEventListener("message", handleMessage);
	}
});

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
				verifyStoredToken(data.token);
			}
		} catch {}
	} else if (e.data?.token) {
		localStorage.setItem("user-token", e.data.token);
		verifyStoredToken(e.data.token);
	}
}

async function verifyStoredToken(token: string) {
	isLoggingIn = true;
	try {
		const response = await fetch("/api/admin/verify-token/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token }),
		});
		const data = await response.json();
		if (data.valid && data.isOwner) {
			adminToken = token;
			username = data.username || "";
			isLoggedIn = true;
		} else if (data.valid && !data.isOwner) {
			loginError = "您不是站长，无权访问管理后台";
			localStorage.removeItem("user-token");
		} else {
			localStorage.removeItem("user-token");
		}
	} catch {
		localStorage.removeItem("user-token");
	} finally {
		isLoggingIn = false;
	}
}

function openAuthPopup() {
	const width = 600;
	const height = 700;
	const left = window.screenX + (window.outerWidth - width) / 2;
	const top = window.screenY + (window.outerHeight - height) / 2;
	window.open(
		"/auth/",
		"github-auth",
		`width=${width},height=${height},left=${left},top=${top}`,
	);
}

function handleLogout() {
	localStorage.removeItem("user-token");
	adminToken = "";
	username = "";
	isLoggedIn = false;
}

function switchTab(tab: TabId) {
	activeTab = tab;
	showMobileMenu = false;
}

// 导航配置
const navItems: { id: TabId; label: string; icon: string }[] = [
	{ id: "posts", label: "文章", icon: "material-symbols:article" },
	{ id: "categories", label: "分类", icon: "material-symbols:folder" },
	{ id: "settings", label: "设置", icon: "material-symbols:settings" },
	{ id: "encryption", label: "加密", icon: "material-symbols:lock" },
];

// 过滤后的文章列表
let searchQuery = $state("");
let filterCategory = $state("all");

const filteredPosts = $derived(() => {
	let result = posts;

	if (filterCategory !== "all") {
		result = result.filter((p) => p.category === filterCategory);
	}

	if (searchQuery) {
		const query = searchQuery.toLowerCase();
		result = result.filter(
			(p) =>
				p.title.toLowerCase().includes(query) ||
				p.slug.toLowerCase().includes(query),
		);
	}

	return result;
});

// 获取分类列表
const categoryList = $derived(() => {
	const cats = new Set<string>();
	posts.forEach((p) => {
		if (p.category) cats.add(p.category);
	});
	return Array.from(cats).sort();
});
</script>

<div class="unified-admin">
	{#if !isLoggedIn}
		<!-- 登录界面 -->
		<div class="login-container">
			<div class="login-box card-base">
				<div class="login-icon">
					<Icon icon="material-symbols:admin-panel-settings" style="font-size: 3.5rem; color: var(--primary)" />
				</div>
				<h1 class="login-title">管理后台</h1>
				<p class="login-subtitle">使用 GitHub 账号登录（仅站长可访问）</p>
				
				{#if loginError}
					<div class="error-message">
						<Icon icon="material-symbols:error-outline" />
						<span>{loginError}</span>
					</div>
				{/if}
				
				<button onclick={openAuthPopup} disabled={isLoggingIn} class="github-login-button">
					{#if isLoggingIn}
						<Icon icon="svg-spinners:180-ring" />
						<span>验证中...</span>
					{:else}
						<Icon icon="mdi:github" />
						<span>使用 GitHub 登录</span>
					{/if}
				</button>
				
				<div class="login-hint">
					<p>登录后可管理文章、分类、加密等功能</p>
				</div>
			</div>
		</div>
	{:else}
		<!-- 已登录 - 显示管理界面 -->
		
		<!-- 桌面端侧边栏 -->
		{#if !isMobile}
			<aside class="sidebar">
				<div class="sidebar-header">
					<h1 class="sidebar-title">
						<Icon icon="material-symbols:admin-panel-settings" />
						<span>管理后台</span>
					</h1>
					{#if username}
						<div class="user-info">
							<Icon icon="mdi:github" />
							<span>{username}</span>
						</div>
					{/if}
				</div>
				
				<nav class="sidebar-nav">
					{#each navItems as item}
						<button
							class="nav-item"
							class:active={activeTab === item.id}
							onclick={() => switchTab(item.id)}
						>
							<Icon icon={item.icon} />
							<span>{item.label}</span>
						</button>
					{/each}
				</nav>
				
				<div class="sidebar-footer">
					<button onclick={handleLogout} class="logout-btn">
						<Icon icon="material-symbols:logout" />
						<span>退出登录</span>
					</button>
					<a href="/" class="back-btn">
						<Icon icon="material-symbols:home" />
						<span>返回博客</span>
					</a>
				</div>
			</aside>
		{/if}
		
		<!-- 主内容区 -->
		<main class="main-content" class:mobile={isMobile}>
			<!-- 移动端顶部栏 -->
			{#if isMobile}
				<header class="mobile-header">
					<h1 class="mobile-title">管理后台</h1>
					<button onclick={handleLogout} class="mobile-logout">
						<Icon icon="material-symbols:logout" />
					</button>
				</header>
			{/if}
			
			<!-- 内容面板 -->
			<div class="content-panel">
				{#if activeTab === "posts"}
					<!-- 文章管理 -->
					<div class="posts-manager">
						<div class="panel-header">
							<h2>
								<Icon icon="material-symbols:article" />
								文章管理
							</h2>
							<a href="/admin/cms/" target="_blank" class="open-editor-btn">
								<Icon icon="material-symbols:edit" />
								<span>打开编辑器</span>
							</a>
						</div>
						
						<!-- 搜索和筛选 -->
						<div class="search-bar">
							<div class="search-input-wrapper">
								<Icon icon="material-symbols:search" class="search-icon" />
								<input
									type="text"
									bind:value={searchQuery}
									placeholder="搜索文章..."
									class="search-input"
								/>
							</div>
								<select bind:value={filterCategory} class="category-filter">
									<option value="all">全部分类</option>
									{#each categoryList() as cat}
										<option value={cat}>{cat}</option>
									{/each}
								</select>
						</div>
						
						<!-- 文章列表 -->
						<div class="posts-list">
							{#each filteredPosts() as post}
								<div class="post-item">
									<div class="post-info">
										<h3 class="post-title">{post.title}</h3>
										<p class="post-meta">
											<span class="post-category">{post.category || "未分类"}</span>
											<span class="post-date">{new Date(post.published).toLocaleDateString()}</span>
											{#if post.encrypted}
												<span class="encrypted-badge">
													<Icon icon="material-symbols:lock" />
													已加密
												</span>
											{/if}
										</p>
									</div>
									<div class="post-actions">
										<a href="/posts/{post.slug}" target="_blank" class="action-btn view">
											<Icon icon="material-symbols:visibility" />
										</a>
									</div>
								</div>
							{/each}
							
							{#if filteredPosts().length === 0}
								<div class="empty-state">
									<Icon icon="material-symbols:article-outline" style="font-size: 3rem" />
									<p>暂无文章</p>
								</div>
							{/if}
						</div>
						
						<div class="stats-bar">
							<span>共 {filteredPosts().length} 篇文章</span>
						</div>
					</div>
					
				{:else if activeTab === "categories"}
					<!-- 分类管理 -->
					<div class="categories-panel">
						<div class="panel-header">
							<h2>
								<Icon icon="material-symbols:folder" />
								分类管理
							</h2>
						</div>
						<CategoryManager categories={categories} />
					</div>
					
				{:else if activeTab === "settings"}
					<!-- 设置 -->
					<div class="settings-panel">
						<div class="panel-header">
							<h2>
								<Icon icon="material-symbols:settings" />
								站点设置
							</h2>
						</div>
						<div class="settings-content">
							<div class="settings-section">
								<h3>快速链接</h3>
								<div class="settings-links">
									<a href="/admin/cms/" target="_blank" class="settings-link">
										<Icon icon="material-symbols:edit-square" />
										<span>Sveltia CMS 编辑器</span>
										<Icon icon="material-symbols:open-in-new" class="external-icon" />
									</a>
									<div class="settings-link current">
										<Icon icon="material-symbols:admin-panel-settings" />
										<span>统一管理后台</span>
										<Icon icon="material-symbols:check" class="current-icon" />
									</div>
								</div>
							</div>
							<div class="settings-section">
								<h3>数据统计</h3>
								<div class="stats-grid">
									<div class="stat-card">
										<Icon icon="material-symbols:article" style="font-size: 1.5rem; color: var(--primary)" />
										<span class="stat-value">{posts.length}</span>
										<span class="stat-label">文章总数</span>
									</div>
									<div class="stat-card">
										<Icon icon="material-symbols:folder" style="font-size: 1.5rem; color: var(--primary)" />
										<span class="stat-value">{categories.length}</span>
										<span class="stat-label">分类总数</span>
									</div>
									<div class="stat-card">
										<Icon icon="material-symbols:lock" style="font-size: 1.5rem; color: var(--primary)" />
										<span class="stat-value">{posts.filter(p => p.encrypted).length}</span>
										<span class="stat-label">加密文章</span>
									</div>
								</div>
							</div>
						</div>
					</div>
					
				{:else if activeTab === "encryption"}
					<!-- 加密管理 -->
					<div class="encryption-panel">
						<div class="panel-header">
							<h2>
								<Icon icon="material-symbols:lock" />
								加密管理
							</h2>
						</div>
						<AdminPanel posts={posts} />
					</div>
				{/if}
			</div>
		</main>
		
		<!-- 移动端底部导航 -->
		{#if isMobile}
			<nav class="mobile-nav">
				{#each navItems as item}
					<button
						class="mobile-nav-item"
						class:active={activeTab === item.id}
						onclick={() => switchTab(item.id)}
					>
						<Icon icon={item.icon} />
						<span>{item.label}</span>
					</button>
				{/each}
			</nav>
		{/if}
	{/if}
</div>

<style>
	/* 登录界面 */
	.login-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 100vh;
		padding: 1rem;
	}

	.login-box {
		max-width: 400px;
		width: 100%;
		padding: 2rem;
		text-align: center;
	}

	.login-icon {
		margin-bottom: 1rem;
	}

	.login-title {
		font-size: 1.5rem;
		font-weight: 700;
		margin: 0 0 0.5rem;
		color: var(--text-color);
	}

	.login-subtitle {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem;
		margin-bottom: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border-radius: 8px;
		color: #ef4444;
		font-size: 0.875rem;
	}

	.github-login-button {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.875rem;
		background: #24292e;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.github-login-button:hover:not(:disabled) {
		background: #2f363d;
	}

	.github-login-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.login-hint {
		margin-top: 1.5rem;
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* 统一管理布局 */
	.unified-admin {
		display: flex;
		min-height: 100vh;
		background: var(--page-bg);
	}

	/* 桌面端侧边栏 */
	.sidebar {
		width: 260px;
		background: var(--card-bg);
		border-right: 1px solid var(--line-divider);
		display: flex;
		flex-direction: column;
		position: fixed;
		top: 0;
		left: 0;
		bottom: 0;
		z-index: 100;
	}

	.sidebar-header {
		padding: 1.5rem;
		border-bottom: 1px solid var(--line-divider);
	}

	.sidebar-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0 0 0.75rem;
	}

	.sidebar-title :global(svg) {
		color: var(--primary);
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.sidebar-nav {
		flex: 1;
		padding: 1rem 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		border: none;
		background: transparent;
		border-radius: 8px;
		color: var(--text-secondary);
		font-size: 0.9375rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: left;
	}

	.nav-item:hover {
		background: var(--hover-bg);
		color: var(--text-color);
	}

	.nav-item.active {
		background: var(--primary);
		color: white;
	}

	.nav-item :global(svg) {
		font-size: 1.25rem;
	}

	.sidebar-footer {
		padding: 1rem;
		border-top: 1px solid var(--line-divider);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.logout-btn,
	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.625rem;
		border-radius: 8px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
	}

	.logout-btn {
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
		border: none;
	}

	.logout-btn:hover {
		background: rgba(239, 68, 68, 0.2);
	}

	.back-btn {
		background: var(--page-bg);
		color: var(--text-secondary);
		border: 1px solid var(--line-divider);
	}

	.back-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	/* 主内容区 */
	.main-content {
		flex: 1;
		margin-left: 260px;
		padding: 1.5rem;
		padding-bottom: 2rem;
	}

	.main-content.mobile {
		margin-left: 0;
		padding: 0;
	}

	/* 移动端顶部栏 */
	.mobile-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--card-bg);
		border-bottom: 1px solid var(--line-divider);
	}

	.mobile-title {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0;
	}

	.mobile-logout {
		padding: 0.5rem;
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
	}

	/* 内容面板 */
	.content-panel {
		padding: 1rem;
	}

	.panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.75rem;
	}

	.panel-header h2 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0;
	}

	.panel-header h2 :global(svg) {
		color: var(--primary);
	}

	.open-editor-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 1rem;
		background: var(--primary);
		color: white;
		border-radius: 8px;
		font-size: 0.875rem;
		text-decoration: none;
		transition: all 0.2s;
	}

	.open-editor-btn:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	/* 搜索栏 */
	.search-bar {
		display: flex;
		gap: 0.75rem;
		margin-bottom: 1rem;
		flex-wrap: wrap;
	}

	.search-input-wrapper {
		flex: 1;
		min-width: 200px;
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		color: var(--text-tertiary);
		font-size: 1.25rem;
	}

	.search-input {
		width: 100%;
		padding: 0.625rem 0.75rem 0.625rem 2.5rem;
		border: 1px solid var(--line-divider);
		border-radius: 8px;
		background: var(--card-bg);
		color: var(--text-color);
		font-size: 0.9375rem;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.category-filter {
		padding: 0.625rem 0.75rem;
		border: 1px solid var(--line-divider);
		border-radius: 8px;
		background: var(--card-bg);
		color: var(--text-color);
		font-size: 0.875rem;
		cursor: pointer;
	}

	/* 文章列表 */
	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.post-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem;
		background: var(--card-bg);
		border-radius: 12px;
		border: 1px solid var(--line-divider);
		gap: 1rem;
	}

	.post-info {
		flex: 1;
		min-width: 0;
	}

	.post-title {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0 0 0.375rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.75rem;
		color: var(--text-tertiary);
		margin: 0;
		flex-wrap: wrap;
	}

	.post-category {
		padding: 0.125rem 0.5rem;
		background: var(--hover-bg);
		border-radius: 4px;
	}

	.encrypted-badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		color: var(--primary);
	}

	.post-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 8px;
		border: 1px solid var(--line-divider);
		background: var(--page-bg);
		color: var(--text-secondary);
		text-decoration: none;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover {
		border-color: var(--primary);
		color: var(--primary);
	}

	.empty-state {
		padding: 3rem;
		text-align: center;
		color: var(--text-tertiary);
	}

	.empty-state p {
		margin-top: 0.75rem;
	}

	.stats-bar {
		margin-top: 1rem;
		padding: 0.75rem;
		text-align: center;
		font-size: 0.875rem;
		color: var(--text-tertiary);
	}

	/* 设置面板 */
	.settings-content {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.settings-section h3 {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0 0 0.75rem;
	}

	.settings-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.settings-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.875rem 1rem;
		background: var(--card-bg);
		border: 1px solid var(--line-divider);
		border-radius: 8px;
		color: var(--text-color);
		text-decoration: none;
		font-size: 0.9375rem;
		transition: all 0.2s;
	}

	.settings-link:hover {
		border-color: var(--primary);
	}
	.settings-link.current {
		opacity: 0.7;
		cursor: default;
		border-color: var(--primary);
	}

	.settings-link :global(svg:first-child) {
		color: var(--primary);
	}

	.external-icon,
	.current-icon {
		margin-left: auto;
		font-size: 1rem;
		color: var(--text-tertiary);
	}

	.current-icon {
		color: var(--primary);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
		gap: 0.75rem;
	}

	.stat-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.375rem;
		padding: 1rem;
		background: var(--card-bg);
		border: 1px solid var(--line-divider);
		border-radius: 12px;
	}

	.stat-value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-color);
	}

	.stat-label {
		font-size: 0.75rem;
		color: var(--text-tertiary);
	}

	/* 移动端底部导航 */
	.mobile-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		display: flex;
		justify-content: space-around;
		padding: 0.5rem;
		background: var(--card-bg);
		border-top: 1px solid var(--line-divider);
		z-index: 100;
	}

	.mobile-nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.5rem 1rem;
		background: transparent;
		border: none;
		color: var(--text-tertiary);
		font-size: 0.6875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.mobile-nav-item.active {
		color: var(--primary);
	}

	.mobile-nav-item :global(svg) {
		font-size: 1.375rem;
	}

	/* 响应式 */
	@media (max-width: 640px) {
		.post-item {
			flex-direction: column;
			align-items: flex-start;
		}

		.post-actions {
			width: 100%;
			justify-content: flex-end;
			margin-top: 0.75rem;
		}

		.panel-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.open-editor-btn {
			width: 100%;
			justify-content: center;
		}
	}
</style>

<script lang="ts">
import Icon from "@iconify/svelte";
import { onDestroy, onMount } from "svelte";

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

interface Props {
	categories: CategoryInfo[];
}

let { categories }: Props = $props();

// Auth state
let isLoggedIn = $state(false);
let isLoggingIn = $state(false);
let loginError = $state("");
let adminToken = $state("");
let username = $state("");

// Category state
let localCategories = $state<CategoryInfo[]>([]);
let editingId = $state<string | null>(null);
let editDraft = $state<CategoryInfo | null>(null);
let isCreating = $state(false);
let newCategoryDraft = $state<CategoryInfo>(makeEmptyCategory());

// UI state
let isProcessing = $state(false);
let toastMessage = $state("");
let toastType = $state<"success" | "error">("success");
let deleteConfirmId = $state<string | null>(null);

let sortedCategories = $derived(
	[...localCategories].sort((a, b) => a.order - b.order),
);

let totalPosts = $derived(
	localCategories.reduce((sum, c) => sum + c.postCount, 0),
);

// Init local state from props
localCategories = categories.map((c) => ({ ...c }));

function makeEmptyCategory(): CategoryInfo {
	return {
		id: "",
		name: "",
		slug: "",
		icon: "material-symbols:folder",
		description: "",
		showInHome: true,
		showInNavbar: false,
		syncToPublic: false,
		encrypted: false,
		order: localCategories.length + 1,
		color: "#3b82f6",
		customLink: "",
		postCount: 0,
	};
}

// ──────────────────────────────────
// Auth (same pattern as AdminPanel)
// ──────────────────────────────────
onMount(() => {
	const storedToken = localStorage.getItem("user-token");
	if (storedToken) verifyStoredToken(storedToken);
	window.addEventListener("message", handleMessage);
});

onDestroy(() => {
	if (typeof window !== "undefined") {
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

// ──────────────────────────────────
// Toast
// ──────────────────────────────────
function showToast(message: string, type: "success" | "error" = "success") {
	toastMessage = message;
	toastType = type;
	setTimeout(() => {
		toastMessage = "";
	}, 4000);
}

// ──────────────────────────────────
// API helpers
// ──────────────────────────────────
async function apiCall(
	action: string,
	payload: Record<string, unknown> = {},
): Promise<{ success: boolean; message?: string; data?: unknown }> {
	try {
		const response = await fetch("/api/admin/categories", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ action, token: adminToken, ...payload }),
		});
		return await response.json();
	} catch {
		return {
			success: false,
			message:
				"网络错误，请检查 API 是否可用（开发模式下 Cloudflare Functions 不可用）",
		};
	}
}

// ──────────────────────────────────
// CRUD operations
// ──────────────────────────────────
function startEditing(category: CategoryInfo) {
	editingId = category.id;
	editDraft = { ...category };
}

function cancelEditing() {
	editingId = null;
	editDraft = null;
}

async function saveCategory() {
	if (!editDraft) return;
	isProcessing = true;
	const result = await apiCall("update", {
		categoryId: editDraft.id,
		category: editDraft,
	});
	if (result.success) {
		const idx = localCategories.findIndex((c) => c.id === editDraft?.id);
		if (idx !== -1) localCategories[idx] = { ...editDraft };
		showToast("分类已更新");
		cancelEditing();
	} else {
		showToast(result.message || "保存失败，请尝试在 CMS 中编辑", "error");
	}
	isProcessing = false;
}

function startCreating() {
	isCreating = true;
	newCategoryDraft = makeEmptyCategory();
	newCategoryDraft.order = localCategories.length + 1;
}

function cancelCreating() {
	isCreating = false;
}

async function createCategory() {
	if (!newCategoryDraft.name.trim()) {
		showToast("分类名称不能为空", "error");
		return;
	}
	isProcessing = true;
	const slug =
		newCategoryDraft.slug ||
		newCategoryDraft.name.toLowerCase().replace(/\s+/g, "-");
	const category = { ...newCategoryDraft, slug, id: slug };
	const result = await apiCall("create", { category });
	if (result.success) {
		localCategories = [...localCategories, category];
		showToast("分类已创建");
		cancelCreating();
	} else {
		showToast(result.message || "创建失败", "error");
	}
	isProcessing = false;
}

async function deleteCategory(id: string) {
	isProcessing = true;
	const result = await apiCall("delete", { categoryId: id });
	if (result.success) {
		localCategories = localCategories.filter((c) => c.id !== id);
		showToast("分类已删除");
	} else {
		showToast(result.message || "删除失败", "error");
	}
	deleteConfirmId = null;
	isProcessing = false;
}

// ──────────────────────────────────
// Toggle helpers (quick-save)
// ──────────────────────────────────
async function toggleField(
	category: CategoryInfo,
	field: "showInHome" | "showInNavbar" | "syncToPublic" | "encrypted",
) {
	const updated = { ...category, [field]: !category[field] };
	const idx = localCategories.findIndex((c) => c.id === category.id);
	if (idx !== -1) localCategories[idx] = updated;

	// Also update editDraft if we're editing this category
	if (editDraft && editDraft.id === category.id) {
		editDraft = { ...editDraft, [field]: !editDraft[field] };
	}

	const result = await apiCall("update", {
		categoryId: category.id,
		category: updated,
	});
	if (!result.success) {
		// Revert on failure
		if (idx !== -1) localCategories[idx] = category;
		if (editDraft && editDraft.id === category.id) {
			editDraft = { ...editDraft, [field]: category[field] };
		}
		showToast(`保存失败：${result.message || "API 不可用"}`, "error");
	}
}

function getIconColor(color: string) {
	return color || "#3b82f6";
}
</script>

{#if !isLoggedIn}
	<!-- Login -->
	<div class="login-container">
		<div class="login-box card-base">
			<div class="login-icon">
				<Icon
					icon="material-symbols:category"
					style="font-size: 3.5rem; color: var(--primary)"
				/>
			</div>
			<h1 class="login-title">内容集合管理</h1>
			<p class="login-subtitle">使用 GitHub 账号登录以管理分类</p>
			{#if loginError}
				<div class="error-message">
					<Icon icon="material-symbols:error-outline" />
					<span>{loginError}</span>
				</div>
			{/if}
			<button
				onclick={openAuthPopup}
				disabled={isLoggingIn}
				class="github-login-button"
			>
				{#if isLoggingIn}
					<Icon icon="svg-spinners:180-ring" />
					<span>验证中...</span>
				{:else}
					<Icon icon="mdi:github" />
					<span>使用 GitHub 登录</span>
				{/if}
			</button>
		</div>
	</div>
{:else}
	<!-- Manager -->
	<div class="category-manager">
		<!-- Toast -->
		{#if toastMessage}
			<div class="toast toast-{toastType}">
				<Icon
					icon={toastType === "success"
						? "material-symbols:check-circle-outline"
						: "material-symbols:error-outline"}
				/>
				<span>{toastMessage}</span>
			</div>
		{/if}

		<!-- Header -->
		<div class="manager-header card-base">
			<div class="header-content">
				<h1 class="header-title">
					<Icon icon="material-symbols:category" />
					<span>内容集合管理</span>
				</h1>
				<div class="header-stats">
					<span class="stat-item">
						<Icon icon="material-symbols:folder" />
						{localCategories.length} 个分类
					</span>
					<span class="stat-item">
						<Icon icon="material-symbols:article" />
						{totalPosts} 篇文章
					</span>
				</div>
			</div>
			<div class="header-actions">
				{#if username}
					<span class="username-badge">
						<Icon icon="mdi:github" />
						{username}
					</span>
				{/if}
				<button onclick={handleLogout} class="logout-btn">
					<Icon icon="material-symbols:logout" />
					<span>登出</span>
				</button>
			</div>
		</div>

		<!-- Category Grid -->
		<div class="categories-grid">
			{#each sortedCategories as category (category.id)}
				{@const isEditing = editingId === category.id}
				{@const draft = isEditing && editDraft ? editDraft : category}
				<div
					class="category-card card-base"
					class:editing={isEditing}
				>
					<!-- Card Header -->
					<div class="card-header">
						<div
							class="category-icon"
							style="background-color: {getIconColor(draft.color)}20; color: {getIconColor(draft.color)}"
						>
							<Icon
								icon={draft.icon || "material-symbols:folder"}
							/>
						</div>
						<div class="category-info">
							{#if isEditing}
								<input
									type="text"
									class="edit-input edit-name"
									bind:value={editDraft.name}
									placeholder="分类名称"
								/>
							{:else}
								<h3 class="category-name">{draft.name}</h3>
							{/if}
							{#if isEditing}
								<input
									type="text"
									class="edit-input edit-desc"
									bind:value={editDraft.description}
									placeholder="分类描述"
								/>
							{:else}
								<p class="category-description">
									{draft.description}
								</p>
							{/if}
						</div>
						<div
							class="post-count"
							style="color: {getIconColor(draft.color)}"
						>
							{draft.postCount}
						</div>
					</div>

					<!-- Toggles -->
					<div class="card-toggles">
						<label class="toggle-row">
							<span class="toggle-label">
								<Icon icon="material-symbols:home" />
								主页显示
							</span>
							<button
								class="toggle-switch"
								class:active={draft.showInHome}
								onclick={() => isEditing ? (editDraft.showInHome = !editDraft.showInHome) : toggleField(category, "showInHome")}
								type="button"
							>
								<span class="toggle-knob"></span>
							</button>
						</label>
						<label class="toggle-row">
							<span class="toggle-label">
								<Icon icon="material-symbols:menu" />
								导航栏
							</span>
							<button
								class="toggle-switch"
								class:active={draft.showInNavbar}
								onclick={() => isEditing ? (editDraft.showInNavbar = !editDraft.showInNavbar) : toggleField(category, "showInNavbar")}
								type="button"
							>
								<span class="toggle-knob"></span>
							</button>
						</label>
						<label class="toggle-row">
							<span class="toggle-label">
								<Icon icon="material-symbols:sync" />
								公开同步
							</span>
							<button
								class="toggle-switch"
								class:active={draft.syncToPublic}
								onclick={() => isEditing ? (editDraft.syncToPublic = !editDraft.syncToPublic) : toggleField(category, "syncToPublic")}
								type="button"
							>
								<span class="toggle-knob"></span>
							</button>
						</label>
						<label class="toggle-row">
							<span class="toggle-label">
								<Icon icon="material-symbols:lock" />
								加密
							</span>
							<button
								class="toggle-switch"
								class:active={draft.encrypted}
								onclick={() => isEditing ? (editDraft.encrypted = !editDraft.encrypted) : toggleField(category, "encrypted")}
								type="button"
							>
								<span class="toggle-knob"></span>
							</button>
						</label>
					</div>

					<!-- Edit fields -->
					{#if isEditing && editDraft}
						<div class="edit-fields">
							<div class="field-row">
								<label class="field-label">图标</label>
								<input
									type="text"
									class="edit-input"
									bind:value={editDraft.icon}
									placeholder="material-symbols:folder"
								/>
							</div>
							<div class="field-row">
								<label class="field-label">颜色</label>
								<div class="color-field">
									<input
										type="color"
										class="color-picker"
										bind:value={editDraft.color}
									/>
									<span class="color-hex"
										>{editDraft.color}</span
									>
								</div>
							</div>
							<div class="field-row">
								<label class="field-label">排序</label>
								<input
									type="number"
									class="edit-input edit-narrow"
									bind:value={editDraft.order}
									min="0"
								/>
							</div>
							<div class="field-row">
								<label class="field-label">自定义链接</label>
								<input
									type="text"
									class="edit-input"
									bind:value={editDraft.customLink}
									placeholder="/custom/path/"
								/>
							</div>
						</div>
					{/if}

					<!-- Actions -->
					<div class="card-actions">
						{#if isEditing}
							<button
								class="action-btn save-btn"
								onclick={saveCategory}
								disabled={isProcessing}
							>
								<Icon icon="material-symbols:save" />
								<span>保存</span>
							</button>
							<button
								class="action-btn cancel-btn"
								onclick={cancelEditing}
							>
								<Icon icon="material-symbols:close" />
								<span>取消</span>
							</button>
						{:else}
							<button
								class="action-btn edit-btn"
								onclick={() => startEditing(category)}
							>
								<Icon icon="material-symbols:edit" />
								<span>编辑</span>
							</button>
							<a
								href={category.customLink ||
									`/categories/${encodeURIComponent(category.name)}/`}
								class="action-btn view-btn"
							>
								<Icon icon="material-symbols:visibility" />
								<span>查看</span>
							</a>
							{#if deleteConfirmId === category.id}
								<button
									class="action-btn danger-btn"
									onclick={() => deleteCategory(category.id)}
									disabled={isProcessing}
								>
									<Icon icon="material-symbols:check" />
									<span>确认删除</span>
								</button>
								<button
									class="action-btn cancel-btn"
									onclick={() => (deleteConfirmId = null)}
								>
									<Icon icon="material-symbols:close" />
								</button>
							{:else}
								<button
									class="action-btn danger-btn"
									onclick={() =>
										(deleteConfirmId = category.id)}
								>
									<Icon icon="material-symbols:delete" />
								</button>
							{/if}
						{/if}
						<span class="order-badge" title="排序权重">
							#{category.order}
						</span>
					</div>
				</div>
			{/each}
		</div>

		<!-- Create new category -->
		{#if isCreating}
			<div class="create-form card-base">
				<h3 class="create-title">
					<Icon icon="material-symbols:add-circle" />
					创建新分类
				</h3>
				<div class="edit-fields">
					<div class="field-row">
						<label class="field-label">名称 *</label>
						<input
							type="text"
							class="edit-input"
							bind:value={newCategoryDraft.name}
							placeholder="分类名称"
						/>
					</div>
					<div class="field-row">
						<label class="field-label">Slug</label>
						<input
							type="text"
							class="edit-input"
							bind:value={newCategoryDraft.slug}
							placeholder="自动从名称生成"
						/>
					</div>
					<div class="field-row">
						<label class="field-label">描述</label>
						<input
							type="text"
							class="edit-input"
							bind:value={newCategoryDraft.description}
							placeholder="分类描述"
						/>
					</div>
					<div class="field-row">
						<label class="field-label">图标</label>
						<input
							type="text"
							class="edit-input"
							bind:value={newCategoryDraft.icon}
							placeholder="material-symbols:folder"
						/>
					</div>
					<div class="field-row">
						<label class="field-label">颜色</label>
						<div class="color-field">
							<input
								type="color"
								class="color-picker"
								bind:value={newCategoryDraft.color}
							/>
							<span class="color-hex"
								>{newCategoryDraft.color}</span
							>
						</div>
					</div>
					<div class="field-row">
						<label class="field-label">排序</label>
						<input
							type="number"
							class="edit-input edit-narrow"
							bind:value={newCategoryDraft.order}
							min="0"
						/>
					</div>
				</div>
				<div class="card-toggles">
					<label class="toggle-row">
						<span class="toggle-label">
							<Icon icon="material-symbols:home" />
							主页显示
						</span>
						<button
							class="toggle-switch"
							class:active={newCategoryDraft.showInHome}
							onclick={() =>
								(newCategoryDraft.showInHome =
									!newCategoryDraft.showInHome)}
							type="button"
						>
							<span class="toggle-knob"></span>
						</button>
					</label>
					<label class="toggle-row">
						<span class="toggle-label">
							<Icon icon="material-symbols:menu" />
							导航栏
						</span>
						<button
							class="toggle-switch"
							class:active={newCategoryDraft.showInNavbar}
							onclick={() =>
								(newCategoryDraft.showInNavbar =
									!newCategoryDraft.showInNavbar)}
							type="button"
						>
							<span class="toggle-knob"></span>
						</button>
					</label>
					<label class="toggle-row">
						<span class="toggle-label">
							<Icon icon="material-symbols:sync" />
							公开同步
						</span>
						<button
							class="toggle-switch"
							class:active={newCategoryDraft.syncToPublic}
							onclick={() =>
								(newCategoryDraft.syncToPublic =
									!newCategoryDraft.syncToPublic)}
							type="button"
						>
							<span class="toggle-knob"></span>
						</button>
					</label>
					<label class="toggle-row">
						<span class="toggle-label">
							<Icon icon="material-symbols:lock" />
							加密
						</span>
						<button
							class="toggle-switch"
							class:active={newCategoryDraft.encrypted}
							onclick={() =>
								(newCategoryDraft.encrypted =
									!newCategoryDraft.encrypted)}
							type="button"
						>
							<span class="toggle-knob"></span>
						</button>
					</label>
				</div>
				<div class="create-actions">
					<button
						class="action-btn save-btn"
						onclick={createCategory}
						disabled={isProcessing}
					>
						<Icon icon="material-symbols:add" />
						<span>创建</span>
					</button>
					<button class="action-btn cancel-btn" onclick={cancelCreating}>
						<Icon icon="material-symbols:close" />
						<span>取消</span>
					</button>
				</div>
			</div>
		{:else}
			<div class="add-category card-base">
				<button class="add-btn" onclick={startCreating}>
					<Icon icon="material-symbols:add-circle" />
					<span>添加新分类</span>
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	/* ─── Login ─── */
	.login-container {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 60vh;
		padding: 2rem 1rem;
	}

	.login-box {
		max-width: 480px;
		width: 100%;
		padding: 3rem 2rem;
		text-align: center;
	}

	.login-icon {
		margin-bottom: 1.5rem;
	}

	.login-title {
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-color);
		margin: 0 0 0.5rem 0;
	}

	.login-subtitle {
		color: var(--text-secondary);
		margin-bottom: 2rem;
	}

	.error-message {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		margin-bottom: 1rem;
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
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
		padding: 0.875rem 2rem;
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
		transform: translateY(-2px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
	}

	.github-login-button:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* ─── Manager ─── */
	.category-manager {
		max-width: 1200px;
		margin: 0 auto;
		position: relative;
	}

	/* ─── Toast ─── */
	.toast {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		border-radius: 8px;
		font-weight: 500;
		font-size: 0.875rem;
		z-index: 1000;
		animation: slideIn 0.3s ease;
	}

	.toast-success {
		background: rgba(34, 197, 94, 0.15);
		border: 1px solid rgba(34, 197, 94, 0.4);
		color: #22c55e;
	}

	.toast-error {
		background: rgba(239, 68, 68, 0.15);
		border: 1px solid rgba(239, 68, 68, 0.4);
		color: #ef4444;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translateX(1rem);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	/* ─── Header ─── */
	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
		gap: 1rem;
	}

	.header-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0;
	}

	.header-title :global(svg) {
		font-size: 1.75rem;
		color: var(--primary);
	}

	.header-stats {
		display: flex;
		gap: 1rem;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.stat-item {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.username-badge {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		background: var(--page-bg);
		border-radius: 6px;
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.logout-btn {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--page-bg);
		border: 1px solid var(--line-divider);
		border-radius: 6px;
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.logout-btn:hover {
		border-color: #ef4444;
		color: #ef4444;
	}

	/* ─── Grid ─── */
	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	/* ─── Card ─── */
	.category-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.875rem;
		transition: all 0.2s ease;
	}

	.category-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
	}

	.category-card.editing {
		border: 2px solid var(--primary);
		box-shadow: 0 0 0 3px rgba(var(--primary-rgb, 59, 130, 246), 0.15);
	}

	.card-header {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
	}

	.category-icon {
		width: 48px;
		height: 48px;
		border-radius: 12px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.category-icon :global(svg) {
		font-size: 1.5rem;
	}

	.category-info {
		flex: 1;
		min-width: 0;
	}

	.category-name {
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0 0 0.25rem 0;
	}

	.category-description {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.post-count {
		font-size: 1.5rem;
		font-weight: 700;
		flex-shrink: 0;
	}

	/* ─── Toggles ─── */
	.card-toggles {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.toggle-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.375rem 0.5rem;
		border-radius: 6px;
		background: var(--page-bg);
		cursor: pointer;
	}

	.toggle-label {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.toggle-label :global(svg) {
		font-size: 0.875rem;
	}

	.toggle-switch {
		position: relative;
		width: 36px;
		height: 20px;
		background: var(--line-divider);
		border: none;
		border-radius: 10px;
		cursor: pointer;
		transition: background 0.2s;
		flex-shrink: 0;
		padding: 0;
	}

	.toggle-switch.active {
		background: var(--primary);
	}

	.toggle-knob {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 16px;
		height: 16px;
		background: white;
		border-radius: 50%;
		transition: transform 0.2s;
	}

	.toggle-switch.active .toggle-knob {
		transform: translateX(16px);
	}

	/* ─── Edit fields ─── */
	.edit-fields {
		display: flex;
		flex-direction: column;
		gap: 0.625rem;
		padding-top: 0.5rem;
	}

	.field-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.field-label {
		flex-shrink: 0;
		width: 5rem;
		font-size: 0.8rem;
		color: var(--text-secondary);
		text-align: right;
	}

	.edit-input {
		flex: 1;
		padding: 0.5rem 0.75rem;
		border: 1px solid var(--line-divider);
		border-radius: 6px;
		background: var(--page-bg);
		color: var(--text-color);
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	.edit-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.edit-name {
		font-size: 1rem;
		font-weight: 600;
	}

	.edit-desc {
		font-size: 0.8rem;
	}

	.edit-narrow {
		max-width: 80px;
	}

	.color-field {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex: 1;
	}

	.color-picker {
		width: 36px;
		height: 36px;
		padding: 0;
		border: 2px solid var(--line-divider);
		border-radius: 6px;
		cursor: pointer;
		background: none;
	}

	.color-hex {
		font-size: 0.8rem;
		font-family: monospace;
		color: var(--text-secondary);
	}

	/* ─── Actions ─── */
	.card-actions {
		display: flex;
		gap: 0.5rem;
		border-top: 1px solid var(--line-divider);
		padding-top: 0.875rem;
		align-items: center;
	}

	.action-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.375rem;
		padding: 0.5rem 0.75rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.8rem;
		font-weight: 500;
		border: 1px solid var(--line-divider);
		background: var(--page-bg);
		color: var(--text-color);
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-btn:hover:not(:disabled) {
		transform: translateY(-1px);
	}

	.edit-btn:hover {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.view-btn:hover {
		background: var(--text-color);
		border-color: var(--text-color);
		color: var(--page-bg);
	}

	.save-btn {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.save-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.cancel-btn:hover {
		background: var(--hover-bg);
	}

	.danger-btn {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.danger-btn:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.2);
		border-color: #ef4444;
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.order-badge {
		margin-left: auto;
		font-size: 0.75rem;
		color: var(--text-secondary);
		background: var(--page-bg);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	/* ─── Create form ─── */
	.create-form {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.create-title {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--text-color);
		margin: 0;
	}

	.create-title :global(svg) {
		color: var(--primary);
	}

	.create-actions {
		display: flex;
		gap: 0.5rem;
		padding-top: 0.5rem;
	}

	/* ─── Add button ─── */
	.add-category {
		padding: 1.5rem;
		text-align: center;
	}

	.add-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.5rem;
		background: var(--page-bg);
		color: var(--primary);
		border: 2px dashed var(--line-divider);
		border-radius: 8px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
	}

	.add-btn:hover {
		border-color: var(--primary);
	}

	.add-btn :global(svg) {
		font-size: 1.25rem;
	}

	/* ─── Responsive ─── */
	@media (max-width: 640px) {
		.manager-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.header-actions {
			width: 100%;
			justify-content: flex-end;
		}

		.categories-grid {
			grid-template-columns: 1fr;
		}

		.card-toggles {
			grid-template-columns: 1fr;
		}
	}
</style>

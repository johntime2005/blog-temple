<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";
import { getToken } from "@/utils/auth-client";

interface Post {
	slug: string;
	title: string;
	published: string;
	encrypted: boolean;
	encryptionId: string;
	category: string;
	tags: string[];
}

interface Props {
	posts: Post[];
}

let { posts }: Props = $props();

// 文章列表状态
let searchQuery = $state("");
let filterEncrypted = $state<"all" | "encrypted" | "unencrypted">("all");
let selectedPosts = $state(new Set<string>());

// 密码管理状态
let encryptedPasswords = $state<
	Map<string, { password?: string; createdAt?: string }>
>(new Map());
let showPasswordFor = $state<string | null>(null);

// 操作状态
let isProcessing = $state(false);
let successMessage = $state("");
let errorMessage = $state("");
let shareResult = $state<{ password: string; expiresAt: number } | null>(null);

// 鉴权由父组件 UnifiedAdmin 统一处理（进入本组件即已是管理员）；
// 服务端 /api/admin/* 由 _middleware.ts 统一校验凭证。
onMount(() => {
	loadEncryptedPasswords();
});

// 加载所有加密密码
async function loadEncryptedPasswords() {
	try {
		const response = await fetch("/api/admin/manage-passwords", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "list",
				token: getToken(),
			}),
		});

		const data = await response.json();
		if (data.success) {
			const newMap = new Map();
			for (const item of data.passwords) {
				newMap.set(item.encryptionId, {
					createdAt: item.createdAt,
				});
			}
			encryptedPasswords = newMap;
		}
	} catch (error) {
		console.error("Failed to load passwords:", error);
	}
}

// 启用加密（生成密码）
async function enableEncryption(slug: string) {
	isProcessing = true;
	errorMessage = "";
	successMessage = "";

	try {
		const encryptionId = slug.replace(/\//g, "-");

		const response = await fetch("/api/admin/manage-passwords", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "generate",
				token: getToken(),
				encryptionId,
				passwordLength: 16,
				slug,
			}),
		});

		const data = await response.json();

		if (data.success) {
			successMessage = `密码生成成功！密码：${data.password}（已永久保存，可随时在后台查看）`;
			encryptedPasswords.set(encryptionId, {
				password: data.password,
				createdAt: new Date().toISOString(),
			});

			alert(
				"✅ 密码已生成并保存在系统！\n\n" +
					"📝 系统正自动将您的配置推送到 Git 仓库...\n" +
					"等待几分钟的重新编译后，您的文章加密即将在前台生效。\n" +
					`🔑 生成密码：${data.password}\n\n` +
					"💡 密码已保存到后台，遗失时可随时查看",
			);
		} else {
			errorMessage = data.message || "生成密码失败";
		}
	} catch (error) {
		console.error("Enable encryption error:", error);
		errorMessage = "操作失败，请稍后重试";
	} finally {
		isProcessing = false;
	}
}

// 禁用加密（删除密码）
async function disableEncryption(encryptionId: string, slug: string) {
	if (
		!confirm(
			`确定要删除文章 "${encryptionId}" 的密码吗？用户将无法访问加密内容。`,
		)
	) {
		return;
	}

	isProcessing = true;
	errorMessage = "";
	successMessage = "";

	try {
		const response = await fetch("/api/admin/manage-passwords", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				action: "delete",
				token: getToken(),
				encryptionId,
				slug,
			}),
		});

		const data = await response.json();

		if (data.success) {
			successMessage = "密码已删除，Git 已更新";
			encryptedPasswords.delete(encryptionId);
			alert(
				"密码已删除！系统正自动撤销文章的 Git 加密标签，请等待几分钟以重新编译前台页面。",
			);
		} else {
			errorMessage = data.message || "删除失败";
		}
	} catch (error) {
		console.error("Disable encryption error:", error);
		errorMessage = "操作失败，请稍后重试";
	} finally {
		isProcessing = false;
	}
}

// 查看密码
async function viewPassword(encryptionId: string) {
	try {
		const response = await fetch("/api/admin/get-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: getToken(),
				encryptionId,
			}),
		});

		const data = await response.json();

		if (data.success) {
			const current = encryptedPasswords.get(encryptionId) || {};
			encryptedPasswords.set(encryptionId, {
				...current,
				password: data.password,
			});
			showPasswordFor = encryptionId;
		} else {
			alert("获取密码失败：密码可能未生成或已被删除");
		}
	} catch (error) {
		console.error("View password error:", error);
		alert("获取密码失败");
	}
}

// 复制密码
async function copyPassword(password: string) {
	try {
		await navigator.clipboard.writeText(password);
		successMessage = "密码已复制到剪贴板";
		setTimeout(() => (successMessage = ""), 3000);
	} catch (error) {
		alert("复制失败，请手动复制");
	}
}

// 创建临时分享链接
async function createShareLink(slug: string) {
	const minutes = prompt("请输入有效期（分钟），默认60分钟：", "60, 10");
	if (minutes === null) return;

	const expiresInMinutes = Number.parseInt(minutes, 10) || 60;

	isProcessing = true;
	errorMessage = "";
	successMessage = "";
	shareResult = null;

	try {
		const response = await fetch("/api/share/create", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				token: getToken(),
				slug,
				expiresInMinutes,
			}),
		});

		const data = await response.json();

		if (data.success) {
			shareResult = {
				password: data.password,
				expiresAt: data.expiresAt,
			};
			successMessage = `临时密码生成成功！有效期至 ${new Date(data.expiresAt).toLocaleString()}`;
			alert(
				`🔗 临时密码：${data.password}\n\n⏱️ 有效期：${expiresInMinutes}分钟\n\n过期后所有使用此密码的访问将立即失效。`,
			);
		} else {
			errorMessage = data.message || "生成失败";
		}
	} catch (error) {
		console.error("Share creation failed:", error);
		errorMessage = "生成失败，请稍后重试";
	} finally {
		isProcessing = false;
	}
}

// 过滤后的文章列表
const filteredPosts = $derived(() => {
	let result = posts;

	// 按加密状态过滤
	if (filterEncrypted === "encrypted") {
		result = result.filter((p) => p.encrypted);
	} else if (filterEncrypted === "unencrypted") {
		result = result.filter((p) => !p.encrypted);
	}

	// 按搜索关键词过滤
	if (searchQuery) {
		const query = searchQuery.toLowerCase();
		result = result.filter(
			(p) =>
				p.title.toLowerCase().includes(query) ||
				p.slug.toLowerCase().includes(query) ||
				p.category?.toLowerCase().includes(query),
		);
	}

	return result;
});
</script>

<!-- 鉴权由父组件 UnifiedAdmin 保证，这里直接渲染面板 -->
	<!-- 管理面板 -->
	<div class="admin-panel">
		<div class="admin-header card-base">
			<div class="header-content">
				<h1 class="header-title">
					<Icon icon="material-symbols:lock-outline" />
					<span>文章加密管理</span>
				</h1>
			</div>
		</div>

		{#if successMessage}
			<div class="success-banner">
				<Icon icon="material-symbols:check-circle-outline" />
				<span>{successMessage}</span>
			</div>
		{/if}

		{#if errorMessage}
			<div class="error-banner">
				<Icon icon="material-symbols:error-outline" />
				<span>{errorMessage}</span>
			</div>
		{/if}

		<div class="filters card-base">
			<div class="search-box">
				<Icon icon="material-symbols:search" class="search-icon" />
				<input
					type="text"
					bind:value={searchQuery}
					placeholder="搜索文章标题、路径、分类..."
					class="search-input"
				/>
			</div>

			<div class="filter-tabs">
				<button
					class:active={filterEncrypted === "all"}
					onclick={() => (filterEncrypted = "all")}
				>
					全部 ({posts.length})
				</button>
				<button
					class:active={filterEncrypted === "encrypted"}
					onclick={() => (filterEncrypted = "encrypted")}
				>
					已加密 ({posts.filter((p) => p.encrypted).length})
				</button>
				<button
					class:active={filterEncrypted === "unencrypted"}
					onclick={() => (filterEncrypted = "unencrypted")}
				>
					未加密 ({posts.filter((p) => !p.encrypted).length})
				</button>
			</div>
		</div>

		<div class="posts-list">
			{#each filteredPosts() as post (post.slug)}
				<div class="post-item card-base">
					<div class="post-info">
						<h3 class="post-title">{post.title}</h3>
						<p class="post-meta">
							<span class="post-slug">{post.slug}</span>
							{#if post.category}
								<span class="post-category">{post.category}</span>
							{/if}
						</p>
					</div>

					<div class="post-actions">
						{#if post.encrypted && post.encryptionId}
							<div class="encrypted-badge">
								<Icon icon="material-symbols:lock" />
								<span>已加密</span>
							</div>

							<button
								onclick={() => viewPassword(post.encryptionId)}
								class="action-button view-button"
								disabled={isProcessing}
							>
								<Icon icon="material-symbols:visibility-outline" />
								<span>查看密码</span>
							</button>

							{#if showPasswordFor === post.encryptionId}
								{@const pwd = encryptedPasswords.get(post.encryptionId)?.password}
								{#if pwd}
									<div class="password-display">
										<code>{pwd}</code>
										<button
											onclick={() => copyPassword(pwd)}
											class="copy-button"
											title="复制密码"
										>
											<Icon icon="material-symbols:content-copy" />
										</button>
									</div>
								{/if}
							{/if}

							<button
								onclick={() => disableEncryption(post.encryptionId, post.slug)}
								class="action-button danger-button"
								disabled={isProcessing}
							>
								<Icon icon="material-symbols:lock-open-outline" />
								<span>禁用加密</span>
							</button>
						{:else}
							<button
								onclick={() => enableEncryption(post.slug)}
								class="action-button primary-button"
								disabled={isProcessing}
							>
								<Icon icon="material-symbols:lock-outline" />
								<span>启用加密</span>
							</button>
						{/if}

						<button
							onclick={() => createShareLink(post.slug)}
							class="action-button share-button"
							disabled={isProcessing}
							title="生成临时访问密码"
						>
							<Icon icon="material-symbols:share" />
							<span>临时分享</span>
						</button>
					</div>
				</div>
			{/each}

			{#if filteredPosts().length === 0}
				<div class="empty-state">
					<Icon icon="material-symbols:article-outline" class="empty-icon" />
					<p>没有找到匹配的文章</p>
				</div>
			{/if}
		</div>
	</div>

<style>
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

	.error-icon {
		flex-shrink: 0;
		font-size: 1.125rem;
	}

	/* 管理面板样式 */
	.admin-panel {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.admin-header {
		padding: 1.5rem 2rem;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-title {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.success-banner,
	.error-banner {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		border-radius: var(--radius-medium);
		font-weight: 500;
	}

	.success-banner {
		background: rgba(34, 197, 94, 0.1);
		border: 1px solid rgba(34, 197, 94, 0.3);
		color: #22c55e;
	}

	.error-banner {
		background: rgba(239, 68, 68, 0.1);
		border: 1px solid rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.filters {
		padding: 1.5rem 2rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-box {
		position: relative;
		display: flex;
		align-items: center;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		color: var(--text-tertiary);
		font-size: 1.25rem;
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 3rem;
		border: 2px solid var(--line-divider);
		border-radius: var(--radius-medium);
		background: var(--page-bg);
		color: var(--text-primary);
		font-size: 1rem;
		transition: all 0.2s;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--primary);
	}

	.filter-tabs {
		display: flex;
		gap: 0.5rem;
	}

	.filter-tabs button {
		padding: 0.5rem 1rem;
		background: var(--page-bg);
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-medium);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s;
		font-size: 0.875rem;
	}

	.filter-tabs button.active {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.filter-tabs button:not(.active):hover {
		background: var(--hover-bg);
		border-color: var(--primary);
	}

	.posts-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.post-item {
		padding: 1.5rem 2rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1.5rem;
		transition: transform 0.2s;
	}

	.post-item:hover {
		transform: translateY(-2px);
	}

	.post-info {
		flex: 1;
		min-width: 0;
	}

	.post-title {
		font-size: 1.125rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.post-meta {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.875rem;
		color: var(--text-tertiary);
	}

	.post-slug {
		font-family: monospace;
	}

	.post-category {
		padding: 0.25rem 0.5rem;
		background: var(--hover-bg);
		border-radius: var(--radius-small);
	}

	.post-actions {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.encrypted-badge {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: rgba(var(--primary-rgb), 0.1);
		border: 1px solid rgba(var(--primary-rgb), 0.3);
		border-radius: var(--radius-medium);
		color: var(--primary);
		font-size: 0.875rem;
		font-weight: 500;
	}

	.action-button {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		border-radius: var(--radius-medium);
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid;
	}

	.primary-button {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.primary-button:hover:not(:disabled) {
		transform: translateY(-2px);
		box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.3);
	}

	.view-button {
		background: var(--page-bg);
		border-color: var(--line-divider);
		color: var(--text-secondary);
	}

	.view-button:hover:not(:disabled) {
		background: var(--hover-bg);
		border-color: var(--primary);
		color: var(--primary);
	}

	.danger-button {
		background: rgba(239, 68, 68, 0.1);
		border-color: rgba(239, 68, 68, 0.3);
		color: #ef4444;
	}

	.danger-button:hover:not(:disabled) {
		background: rgba(239, 68, 68, 0.2);
		border-color: #ef4444;
	}

	.action-button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.password-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 1rem;
		background: var(--page-bg);
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-medium);
	}

	.password-display code {
		font-family: monospace;
		font-size: 0.875rem;
		color: var(--text-primary);
	}

	.copy-button {
		padding: 0.25rem 0.5rem;
		background: var(--hover-bg);
		border: 1px solid var(--line-divider);
		border-radius: var(--radius-small);
		color: var(--text-secondary);
		cursor: pointer;
		transition: all 0.2s;
	}

	.copy-button:hover {
		background: var(--primary);
		border-color: var(--primary);
		color: white;
	}

	.empty-state {
		padding: 4rem 2rem;
		text-align: center;
		color: var(--text-tertiary);
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
		opacity: 0.5;
	}
</style>

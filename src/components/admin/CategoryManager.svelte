<script lang="ts">
import Icon from "@iconify/svelte";

interface CategoryInfo {
	id: string;
	name: string;
	slug: string;
	icon: string;
	description: string;
	showInHome: boolean;
	showInNavbar: boolean;
	syncToPublic: boolean;
	order: number;
	color: string;
	customLink?: string;
	postCount: number;
}

interface Props {
	categories: CategoryInfo[];
}

let { categories }: Props = $props();

let sortedCategories = $derived(
	[...categories].sort((a, b) => a.order - b.order),
);

let totalPosts = $derived(categories.reduce((sum, c) => sum + c.postCount, 0));

function getIconColor(color: string) {
	return color || "#3b82f6";
}
</script>

<div class="category-manager">
	<div class="manager-header card-base">
		<div class="header-content">
			<h1 class="header-title">
				<Icon name="material-symbols:category" />
				<span>分类管理</span>
			</h1>
			<div class="header-stats">
				<span class="stat-item">
					<Icon name="material-symbols:folder" />
					{categories.length} 个分类
				</span>
				<span class="stat-item">
					<Icon name="material-symbols:article" />
					{totalPosts} 篇文章
				</span>
			</div>
		</div>
		<a href="/admin/" class="cms-link">
			<Icon name="material-symbols:edit" />
			<span>在CMS中管理</span>
		</a>
	</div>

	<div class="categories-grid">
		{#each sortedCategories as category (category.id)}
			<div class="category-card card-base">
				<div class="card-header">
					<div
						class="category-icon"
						style="background-color: {getIconColor(category.color)}20; color: {getIconColor(category.color)}"
					>
						<Icon name={category.icon || "material-symbols:folder"} />
					</div>
					<div class="category-info">
						<h3 class="category-name">{category.name}</h3>
						<p class="category-description">{category.description}</p>
					</div>
					<div class="post-count" style="color: {getIconColor(category.color)}">
						{category.postCount}
					</div>
				</div>

				<div class="card-meta">
					<div class="meta-badges">
						{#if category.showInHome}
							<span class="badge badge-home" title="在主页显示">
								<Icon name="material-symbols:home" />
								主页
							</span>
						{/if}
						{#if category.showInNavbar}
							<span class="badge badge-nav" title="在导航栏显示">
								<Icon name="material-symbols:menu" />
								导航
							</span>
						{/if}
						{#if category.syncToPublic}
							<span class="badge badge-sync" title="同步到公共仓库">
								<Icon name="material-symbols:sync" />
								公开
							</span>
						{/if}
					</div>
					<span class="order-badge" title="排序权重">
						#{category.order}
					</span>
				</div>

				<div class="card-actions">
					<a
						href="/admin/#/collections/categories/entries/{category.slug}"
						class="action-btn edit-btn"
						title="编辑分类"
					>
						<Icon name="material-symbols:edit" />
						<span>编辑</span>
					</a>
					<a
						href={category.customLink || `/categories/${encodeURIComponent(category.name)}/`}
						class="action-btn view-btn"
						title="查看文章"
					>
						<Icon name="material-symbols:visibility" />
						<span>查看</span>
					</a>
				</div>
			</div>
		{/each}
	</div>

	<div class="add-category card-base">
		<a href="/admin/#/collections/categories/new" class="add-btn">
			<Icon name="material-symbols:add-circle" />
			<span>添加新分类</span>
		</a>
	</div>
</div>

<style>
	.category-manager {
		max-width: 1200px;
		margin: 0 auto;
	}

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

	.cms-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1.25rem;
		background: var(--primary);
		color: white;
		border-radius: 8px;
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.cms-link:hover {
		opacity: 0.9;
		transform: translateY(-1px);
	}

	.categories-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1rem;
		margin-bottom: 1.5rem;
	}

	.category-card {
		padding: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
		transition: all 0.2s ease;
	}

	.category-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
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

	.card-meta {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.meta-badges {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.badge {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.badge :global(svg) {
		font-size: 0.875rem;
	}

	.badge-home {
		background: #10b98120;
		color: #10b981;
	}

	.badge-nav {
		background: #3b82f620;
		color: #3b82f6;
	}

	.badge-sync {
		background: #8b5cf620;
		color: #8b5cf6;
	}

	.order-badge {
		font-size: 0.75rem;
		color: var(--text-secondary);
		background: var(--page-bg);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	.card-actions {
		display: flex;
		gap: 0.5rem;
		border-top: 1px solid var(--line-divider);
		padding-top: 1rem;
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		padding: 0.5rem;
		border-radius: 6px;
		text-decoration: none;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.edit-btn {
		background: var(--page-bg);
		color: var(--text-color);
	}

	.edit-btn:hover {
		background: var(--primary);
		color: white;
	}

	.view-btn {
		background: var(--page-bg);
		color: var(--text-color);
	}

	.view-btn:hover {
		background: var(--text-color);
		color: var(--page-bg);
	}

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
		text-decoration: none;
		font-weight: 500;
		transition: all 0.2s ease;
	}

	.add-btn:hover {
		border-color: var(--primary);
	}

	.add-btn :global(svg) {
		font-size: 1.25rem;
	}

	@media (max-width: 640px) {
		.manager-header {
			flex-direction: column;
			align-items: flex-start;
		}

		.cms-link {
			width: 100%;
			justify-content: center;
		}

		.categories-grid {
			grid-template-columns: 1fr;
		}
	}
</style>

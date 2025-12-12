<script lang="ts">
import Icon from "@iconify/svelte";
import { onMount } from "svelte";

interface Post {
	id: string;
	data: {
		title: string;
		published: string;
		description: string;
		tags: string[];
		category?: string;
		image?: string;
		visibility: string;
	};
	slug: string;
}

let posts: Post[] = [];
let isLoading = true;
let errorMessage = "";
let hasToken = false;
let showAll = false;

function formatDate(dateStr: string) {
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	return `${year}-${month}-${day}`;
}

onMount(async () => {
	const token = localStorage.getItem("user-token");
	if (!token) {
		isLoading = false;
		return;
	}
	hasToken = true;

	try {
		const res = await fetch("/api/posts/", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});
		if (res.ok) {
			const data = await res.json();
			posts = data.posts || [];
		} else {
			try {
				const errData = await res.json();
				errorMessage = `Failed to load posts: ${res.status} ${errData.error || res.statusText}`;
			} catch (e) {
				errorMessage = `Failed to load posts: ${res.status} ${res.statusText}`;
			}
		}
	} catch (e) {
		console.error("Failed to fetch private posts", e);
		errorMessage = `Network error: ${e instanceof Error ? e.message : String(e)}`;
	} finally {
		isLoading = false;
	}
});
</script>


{#if hasToken}
  <div class="private-posts-section mb-6">
    <div class="flex items-center gap-2 mb-4 px-4">
      <Icon
        icon="mdi:lock-open-variant"
        class="text-xl text-[var(--primary)]"
      />
      <h2 class="text-xl font-bold text-[var(--primary)]">Private Content</h2>
    </div>

    {#if isLoading}
      <div class="p-6 text-center text-[var(--text-secondary)]">
        Loading private content...
      </div>
    {:else if errorMessage}
      <div
        class="p-6 rounded-[var(--radius-large)] bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400"
      >
        <p class="font-bold">Error loading private posts:</p>
        <p class="text-sm mt-1">{errorMessage}</p>
      </div>
    {:else if posts.length > 0}
      <div class="space-y-4">
        {#each showAll ? posts : posts.slice(0, 5) as post}
          <div
            class="card-base p-6 rounded-[var(--radius-large)] relative transition hover:scale-[1.01]"
          >
            <div class="flex flex-col gap-2">
              <div
                class="flex items-center gap-2 text-sm text-[var(--text-secondary)]"
              >
                <span>{formatDate(post.data.published)}</span>
                {#if post.data.category}
                  <span>·</span>
                  <span class="text-[var(--primary)]">{post.data.category}</span>
                {/if}
                <span
                  class="ml-auto px-2 py-0.5 rounded bg-red-100 text-red-600 text-xs font-bold dark:bg-red-900/30 dark:text-red-400"
                >
                  PRIVATE
                </span>
              </div>

              <a
                href={`/posts/${post.slug}`}
                class="text-2xl font-bold text-[var(--text-main)] hover:text-[var(--primary)] transition max-w-[90%]"
              >
                {post.data.title}
              </a>

              {#if post.data.description}
                <p class="text-[var(--text-secondary)] line-clamp-2">
                  {post.data.description}
                </p>
              {/if}

              {#if post.data.tags && post.data.tags.length > 0}
                <div class="flex flex-wrap gap-2 mt-2">
                  {#each post.data.tags as tag}
                    <span
                      class="text-xs px-2 py-1 rounded bg-[var(--btn-regular-bg)] text-[var(--text-secondary)]"
                    >
                      #{tag}
                    </span>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      {#if posts.length > 5}
        <div class="flex justify-center mt-4">
          <button
            class="btn-regular px-6 py-2 rounded-full text-[var(--primary)] font-bold hover:bg-[var(--primary)] hover:text-white transition"
            on:click={() => (showAll = !showAll)}
          >
            {showAll ? "Collapse" : `Show All (${posts.length})`}
          </button>
        </div>
      {/if}
    {:else}
      <div
        class="p-6 text-center text-[var(--text-secondary)] bg-[var(--card-bg)] rounded-[var(--radius-large)] border border-dashed border-[var(--line-divider)]"
      >
        No private posts found. verify permissions or content visibility
        settings.
      </div>
    {/if}

    <div class="border-b border-dashed border-[var(--line-divider)] my-8"></div>
  </div>
{/if}

<style>
    /* Add any specific overrides here if needed */
</style>

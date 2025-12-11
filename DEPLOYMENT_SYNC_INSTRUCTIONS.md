# 🚀 Deployment and Public Sync Instructions

## 1. Cloudflare Encryption Setup (For your Private Blog)

1.  **KV Namespace**: Ensure you have a KV Namespace named `POST_ENCRYPTION` in Cloudflare.
2.  **Update `wrangler.toml`**: Check that the `id` in `wrangler.toml` matches your KV Namespace ID.
3.  **Set Passwords**: Run `pnpm manage-password set <article-filename> <password>` for your diary posts.

## 2. Public Repository Sync (For `blog-temple`)

I have configured the workflow to automatically sync to **[https://github.com/johntime2005/blog-temple](https://github.com/johntime2005/blog-temple)**.

### Action Items:

1.  **Configure Secrets**: In your **Private (current)** repository, go to **Settings > Secrets and variables > Actions** and add these secrets:
    *   `PAT_TOKEN`: A GitHub Personal Access Token (PAT) with `repo` and `workflow` scopes.
    *   `GIT_EMAIL`: Your GitHub email address.
    *   `GIT_USERNAME`: `johntime2005`
    *   *(Note: `PUBLIC_REPO_OWNER` and `PUBLIC_REPO_NAME` are no longer needed as I hardcoded them to `johntime2005/blog-temple`)*

2.  **Trigger Sync**: Push a commit to your private `main` branch, or manually trigger the "Sync Public Version" workflow in the Actions tab.

## 3. What Gets Synced?

*   **INCLUDED**: All source code, `src/content/posts/tutorials`, and the "Deploy to Cloudflare" button (automatically added to README).
*   **EXCLUDED**: `src/content/posts/diary`, `.env` files, and private workflow files.

## 4. One-Click Deploy Logic

The "Deploy to Cloudflare" button I added to the public README allows anyone to click and deploy their own copy of your blog template.

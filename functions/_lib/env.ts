/**
 * Cloudflare Pages Functions 环境类型定义
 *
 * 所有 functions/ 下的 API 共享此类型。
 * Secrets（ADMIN_PASSWORD, GITHUB_PAT, DEPLOY_HOOK_URL）
 * 需在 Cloudflare Dashboard 中设置，不要写在 wrangler.toml。
 */

export interface Env {
	// ── KV 绑定 ──────────────────────────────────────────
	/** 主 KV 命名空间：存储密码、配置、token 等 */
	POST_ENCRYPTION: KVNamespace;

	// ── Secrets（在 Dashboard 设置） ──────────────────────
	/** 管理员登录密码 */
	ADMIN_PASSWORD: string;
	/** GitHub Fine-grained PAT（需要 Contents: Read and Write 权限） */
	GITHUB_PAT: string;
	/** Cloudflare Deploy Hook URL（在 Pages Settings → Builds 中创建） */
	DEPLOY_HOOK_URL: string;

	// ── 环境变量（在 wrangler.toml 或 Dashboard 设置） ────
	/** GitHub 仓库 owner */
	GITHUB_OWNER: string;
	/** GitHub 仓库名 */
	GITHUB_REPO: string;
	/** GitHub 分支名（默认 main） */
	GITHUB_BRANCH: string;
}

/**
 * KV 存储键常量
 * 与 src/types/admin.ts 中的 KV_KEYS 保持一致
 */
export const KV_KEYS = {
	/** 类别配置 */
	CATEGORIES: "config:categories",
	/** 自定义页面配置 */
	CUSTOM_PAGES: "config:custom_pages",
	/** 导航栏配置覆盖 */
	NAVBAR_OVERRIDE: "config:navbar_override",
	/** 站点配置覆盖 */
	SITE_OVERRIDE: "config:site_override",
	/** 公告配置 */
	ANNOUNCEMENT: "config:announcement",
	/** 友链配置 */
	FRIENDS: "config:friends",
	/** 用户资料配置 */
	PROFILE: "config:profile",
} as const;

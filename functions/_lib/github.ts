/**
 * GitHub Contents API 封装
 *
 * 用于通过 GitHub API 对仓库文件进行 CRUD 操作。
 * 设计用于 Cloudflare Workers/Pages Functions 环境（无 Node.js Buffer）。
 */

const GITHUB_API = "https://api.github.com";
const API_VERSION = "2022-11-28";

interface GitHubFileResponse {
	sha: string;
	content: string;
	encoding: "base64";
	size: number;
	name: string;
	path: string;
}

interface GitHubCommitResponse {
	commit: {
		sha: string;
		message: string;
	};
	content: {
		sha: string;
		path: string;
	};
}

export interface GitHubConfig {
	owner: string;
	repo: string;
	branch: string;
	token: string;
}

// ── Base64 编码/解码（Workers 兼容，支持中文） ─────────────────

export function toBase64(str: string): string {
	const bytes = new TextEncoder().encode(str);
	let binary = "";
	for (const b of bytes) {
		binary += String.fromCharCode(b);
	}
	return btoa(binary);
}

export function fromBase64(b64: string): string {
	const binary = atob(b64);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}

// ── 通用请求封装 ───────────────────────────────────────────

function githubHeaders(token: string): Record<string, string> {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": API_VERSION,
		"Content-Type": "application/json",
		"User-Agent": "Blog-Admin-Bot/1.0",
	};
}

// ── 获取文件 SHA（更新/删除的前置条件） ───────────────────────

export async function getFileSHA(
	config: GitHubConfig,
	path: string,
): Promise<{ sha: string; content: string } | null> {
	const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;

	const res = await fetch(url, {
		headers: githubHeaders(config.token),
	});

	if (res.status === 404) return null;

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`GitHub API error (${res.status}): ${err}`);
	}

	const data = (await res.json()) as GitHubFileResponse;
	return { sha: data.sha, content: data.content };
}

// ── 读取文件内容 ──────────────────────────────────────────

export async function readFile(
	config: GitHubConfig,
	path: string,
): Promise<string | null> {
	const file = await getFileSHA(config, path);
	if (!file) return null;

	// GitHub 返回的 base64 可能包含换行符，需要先清理
	const cleanBase64 = file.content.replace(/\n/g, "");
	return fromBase64(cleanBase64);
}

// ── 创建或更新文件（Upsert） ──────────────────────────────

export async function upsertFile(
	config: GitHubConfig,
	path: string,
	content: string,
	message: string,
): Promise<{ commitSha: string; fileSha: string }> {
	// 先获取现有 SHA（不存在则为新建）
	const existing = await getFileSHA(config, path);
	const encoded = toBase64(content);

	const body: Record<string, unknown> = {
		message,
		content: encoded,
		branch: config.branch,
		committer: {
			name: "Blog Admin Bot",
			email: "admin@blog.local",
		},
	};

	// 更新时必须带 sha，否则 422 Conflict
	if (existing) {
		body.sha = existing.sha;
	}

	const res = await fetch(
		`${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}`,
		{
			method: "PUT",
			headers: githubHeaders(config.token),
			body: JSON.stringify(body),
		},
	);

	if (res.status === 409) {
		throw new Error("SHA conflict: 文件已被并发修改，请刷新后重试");
	}

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`GitHub upsert failed (${res.status}): ${err}`);
	}

	const data = (await res.json()) as GitHubCommitResponse;
	return {
		commitSha: data.commit.sha,
		fileSha: data.content.sha,
	};
}

// ── 删除文件 ──────────────────────────────────────────────

export async function deleteFile(
	config: GitHubConfig,
	path: string,
	message: string,
): Promise<void> {
	const existing = await getFileSHA(config, path);
	if (!existing) return; // 文件不存在，幂等处理

	const res = await fetch(
		`${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}`,
		{
			method: "DELETE",
			headers: githubHeaders(config.token),
			body: JSON.stringify({
				message,
				sha: existing.sha,
				branch: config.branch,
				committer: {
					name: "Blog Admin Bot",
					email: "admin@blog.local",
				},
			}),
		},
	);

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`GitHub delete failed (${res.status}): ${err}`);
	}
}

// ── 列出目录内容 ──────────────────────────────────────────

interface GitHubDirEntry {
	name: string;
	path: string;
	sha: string;
	size: number;
	type: "file" | "dir";
}

export async function listDirectory(
	config: GitHubConfig,
	path: string,
): Promise<GitHubDirEntry[]> {
	const url = `${GITHUB_API}/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;

	const res = await fetch(url, {
		headers: githubHeaders(config.token),
	});

	if (res.status === 404) return [];

	if (!res.ok) {
		const err = await res.text();
		throw new Error(`GitHub list failed (${res.status}): ${err}`);
	}

	const data = (await res.json()) as GitHubDirEntry[];
	return Array.isArray(data) ? data : [];
}

// ── 触发 Deploy Hook ──────────────────────────────────────

export async function triggerDeploy(
	hookUrl: string,
): Promise<{ success: boolean; id?: string }> {
	if (!hookUrl) {
		return { success: false };
	}

	const res = await fetch(hookUrl, { method: "POST" });

	if (!res.ok) {
		return { success: false };
	}

	try {
		const data = (await res.json()) as { id?: string };
		return { success: true, id: data.id };
	} catch {
		return { success: true };
	}
}

// ── 构建 GitHubConfig 从环境变量 ──────────────────────────

export function getGitHubConfig(env: {
	GITHUB_PAT?: string;
	GITHUB_OWNER?: string;
	GITHUB_REPO?: string;
	GITHUB_BRANCH?: string;
}): GitHubConfig | null {
	if (!env.GITHUB_PAT || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
		return null;
	}
	return {
		owner: env.GITHUB_OWNER,
		repo: env.GITHUB_REPO,
		branch: env.GITHUB_BRANCH || "main",
		token: env.GITHUB_PAT,
	};
}

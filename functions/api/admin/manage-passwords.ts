/**
 * POST /api/admin/manage-passwords — 文章密码管理（列表 / 生成 / 删除）
 *
 * 鉴权由 /api/admin/_middleware.ts 统一处理（管理员）。
 *
 * KV 约定（与 verify-password、scripts/manage-password.mjs 一致）：
 *   post:<encryptionId>:password   — SHA-256 哈希（校验用）
 *   admin:password:<encryptionId>  — 明文（仅站长经 get-password 查看）
 *
 * generate/delete 时若带 slug，会尝试通过 GITHUB_PAT 同步文章 frontmatter
 * 的 encrypted/encryptionId 字段；Git 更新失败不影响密码操作本身。
 */

import type { Env } from "../../_lib/env";
import { getGitHubConfig, readFile, upsertFile } from "../../_lib/github";
import { error, methodNotAllowed, serverError } from "../../_lib/response";

interface ManagePasswordRequest {
	action: "generate" | "list" | "delete";
	token?: string;
	encryptionId?: string;
	passwordLength?: number;
	slug?: string;
}

// Git submodule 目录无法通过主仓库的 GitHub API 写入（与 admin/config.yml.ts 一致）
const SUBMODULE_DIRS = ["diary"];

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

function updateFrontmatter(
	content: string,
	isEncrypted: boolean,
	encryptionId?: string,
): string {
	const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
	const match = content.match(frontmatterRegex);
	if (!match) return content;

	let frontmatter = match[1];

	if (isEncrypted) {
		if (!frontmatter.includes("encrypted:")) {
			frontmatter += "\nencrypted: true";
		} else {
			frontmatter = frontmatter.replace(
				/encrypted:\s*(true|false)/,
				"encrypted: true",
			);
		}

		if (encryptionId) {
			if (!frontmatter.includes("encryptionId:")) {
				frontmatter += `\nencryptionId: "${encryptionId}"`;
			} else {
				frontmatter = frontmatter.replace(
					/encryptionId:\s*['"]?[^'"\n]*['"]?/,
					`encryptionId: "${encryptionId}"`,
				);
			}
		}
	} else if (frontmatter.includes("encrypted:")) {
		frontmatter = frontmatter.replace(
			/encrypted:\s*(true|false)/,
			"encrypted: false",
		);
	} else {
		frontmatter += "\nencrypted: false";
	}

	return content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
}

/** 同步文章 frontmatter；返回 null 表示成功，否则为需要提示用户的原因 */
async function syncFrontmatter(
	env: Env,
	slug: string,
	isEncrypted: boolean,
	encryptionId?: string,
): Promise<string | null> {
	if (SUBMODULE_DIRS.some((d) => slug === d || slug.startsWith(`${d}/`))) {
		return "该文章位于子模块仓库，请手动修改 frontmatter";
	}

	const config = getGitHubConfig(env);
	if (!config) {
		return "未配置 GITHUB_PAT，请手动修改 frontmatter";
	}

	const path = `src/content/posts/${
		/\.(md|mdx)$/i.test(slug) ? slug : `${slug}.md`
	}`;

	const content = await readFile(config, path);
	if (content === null) {
		return `未找到文章文件 ${path}，请手动修改 frontmatter`;
	}

	const updated = updateFrontmatter(content, isEncrypted, encryptionId);
	await upsertFile(
		config,
		path,
		updated,
		`chore: ${isEncrypted ? "启用" : "关闭"}文章加密 (${slug})`,
	);
	return null;
}

function generateStrongPassword(length = 16): string {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);

	let password = "";
	for (let i = 0; i < length; i++) {
		password += charset[array[i] % charset.length];
	}

	const hasUpper = /[A-Z]/.test(password);
	const hasLower = /[a-z]/.test(password);
	const hasDigit = /[0-9]/.test(password);
	const hasSpecial = /[!@#$%^&*]/.test(password);

	if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
		return generateStrongPassword(length);
	}

	return password;
}

async function hashPassword(password: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(password);
	const hashBuffer = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hashBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as ManagePasswordRequest;
	const { action, encryptionId, passwordLength, slug } = body;

	const kv = env.POST_ENCRYPTION;
	if (!kv) {
		if (action === "list") return json({ success: true, passwords: [] });
		return serverError("KV 存储不可用");
	}

	if (action === "list") {
		const list = await kv.list({ prefix: "post:" });
		const passwords = list.keys
			.map((key) => ({
				match: key.name.match(/^post:(.+):password$/),
				key,
			}))
			.filter((item) => item.match !== null)
			.map(({ match, key }) => ({
				encryptionId: (match as RegExpMatchArray)[1],
				createdAt: (() => {
					const metadata = key.metadata;
					if (!metadata || typeof metadata !== "object") return undefined;
					if (!("createdAt" in metadata)) return undefined;
					const value = (metadata as { createdAt?: unknown }).createdAt;
					return typeof value === "string" ? value : undefined;
				})(),
			}));
		return json({ success: true, passwords });
	}

	if (action === "generate") {
		if (!encryptionId) return error("缺少 encryptionId");

		const password = generateStrongPassword(passwordLength || 16);
		const hashedPassword = await hashPassword(password);

		await kv.put(`post:${encryptionId}:password`, hashedPassword, {
			metadata: { createdAt: new Date().toISOString() },
		});
		// 明文另存一份供站长找回（get-password），仅统一鉴权后的管理员可读
		await kv.put(`admin:password:${encryptionId}`, password);

		if (slug) {
			try {
				const warn = await syncFrontmatter(env, slug, true, encryptionId);
				if (warn) {
					return json({
						success: true,
						password,
						message: `密码已生成，但 ${warn}`,
					});
				}
			} catch (ghError) {
				console.error("GitHub update file error on generate:", ghError);
				return json({
					success: true,
					password,
					message: "密码已生成，但更新 Git 失败，请手动修改 frontmatter",
				});
			}
		}

		return json({ success: true, password });
	}

	if (action === "delete") {
		if (!encryptionId) return error("缺少 encryptionId");

		await kv.delete(`post:${encryptionId}:password`);
		await kv.delete(`admin:password:${encryptionId}`);

		if (slug) {
			try {
				const warn = await syncFrontmatter(env, slug, false);
				if (warn) {
					return json({ success: true, message: `密码已删除，但 ${warn}` });
				}
			} catch (ghError) {
				console.error("GitHub update file error on delete:", ghError);
				return json({
					success: true,
					message: "密码已删除，但更新 Git 失败，请手动修改 frontmatter",
				});
			}
		}

		return json({ success: true });
	}

	return error("未知操作");
};

export const onRequest: PagesFunction<Env> = async (context) => {
	if (context.request.method === "POST") {
		return context.next();
	}
	return methodNotAllowed();
};

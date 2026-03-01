import type { APIContext } from "astro";
import { getEnv } from "@/utils/env-utils";

export const prerender = false;

interface ManagePasswordRequest {
	action: "generate" | "list" | "delete";
	token: string;
	encryptionId?: string;
	passwordLength?: number;
	slug?: string;
}

function utf8ToBase64(str: string): string {
	const encoder = new TextEncoder();
	const bytes = encoder.encode(str);
	let binary = "";
	const len = bytes.byteLength;
	for (let i = 0; i < len; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

function base64ToUtf8(str: string): string {
	const binary = atob(str);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	const decoder = new TextDecoder("utf-8");
	return decoder.decode(bytes);
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
	} else {
		if (frontmatter.includes("encrypted:")) {
			frontmatter = frontmatter.replace(
				/encrypted:\s*(true|false)/,
				"encrypted: false",
			);
		} else {
			frontmatter += "\nencrypted: false";
		}
	}

	return content.replace(frontmatterRegex, `---\n${frontmatter}\n---`);
}

async function updateGitHubFile(
	token: string,
	owner: string,
	repo: string,
	path: string,
	isEncrypted: boolean,
	encryptionId?: string,
) {
	const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
	const headers = {
		Authorization: `Bearer ${token}`,
		"User-Agent": "Astro-Blog",
		Accept: "application/vnd.github.v3+json",
	};

	const res = await fetch(url, { headers });
	if (!res.ok) {
		throw new Error(`GitHub get file failed: ${res.statusText}`);
	}

	const data = await res.json();
	const currentSha = data.sha;
	const contentStr = base64ToUtf8(data.content.replace(/\n/g, ""));
	const newContent = updateFrontmatter(contentStr, isEncrypted, encryptionId);
	const newBase64 = utf8ToBase64(newContent);

	const updateRes = await fetch(url, {
		method: "PUT",
		headers,
		body: JSON.stringify({
			message: `Update encryption status (${isEncrypted ? "lock" : "unlock"}) for ${path}`,
			content: newBase64,
			sha: currentSha,
		}),
	});

	if (!updateRes.ok) {
		throw new Error(`GitHub update file failed: ${updateRes.statusText}`);
	}
}

async function verifyGitHubToken(
	token: string,
	ownerUsername: string,
): Promise<boolean> {
	if (!token || !ownerUsername) return false;

	try {
		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${token}`,
				"User-Agent": "Astro-Blog",
			},
		});

		if (!response.ok) return false;

		const user = await response.json();
		return user.login?.toLowerCase() === ownerUsername.toLowerCase();
	} catch (error) {
		console.error("GitHub token verification error:", error);
		return false;
	}
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
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST({ request, locals }: APIContext): Promise<Response> {
	try {
		const body = (await request.json()) as ManagePasswordRequest;
		const { action, token, encryptionId, passwordLength, slug } = body;

		const ownerUsername = getEnv(locals, "GITHUB_OWNER_USERNAME");
		const isOwner = await verifyGitHubToken(token, ownerUsername || "");

		const GITHUB_REPO =
			getEnv(locals, "GITHUB_REPO") ||
			locals.runtime?.env?.GITHUB_REPO ||
			"blog";

		if (!isOwner) {
			return new Response(
				JSON.stringify({ success: false, message: "未授权" }),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}

		const POST_ENCRYPTION = locals.runtime?.env?.POST_ENCRYPTION;

		if (!POST_ENCRYPTION) {
			if (action === "list") {
				return new Response(JSON.stringify({ success: true, passwords: [] }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			}
			return new Response(
				JSON.stringify({ success: false, message: "KV 存储不可用" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		if (action === "list") {
			const list = await POST_ENCRYPTION.list({ prefix: "post:" });
			const passwords = list.keys.map((key) => ({
				encryptionId: key.name.replace("post:", ""),
				createdAt: (() => {
					const metadata = key.metadata;
					if (!metadata || typeof metadata !== "object") return undefined;
					if (!("createdAt" in metadata)) return undefined;
					const value = (metadata as { createdAt?: unknown }).createdAt;
					return typeof value === "string" ? value : undefined;
				})(),
			}));
			return new Response(JSON.stringify({ success: true, passwords }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (action === "generate") {
			if (!encryptionId) {
				return new Response(
					JSON.stringify({ success: false, message: "缺少 encryptionId" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			const password = generateStrongPassword(passwordLength || 16);
			const hashedPassword = await hashPassword(password);

			await POST_ENCRYPTION.put(`post:${encryptionId}`, hashedPassword, {
				metadata: { createdAt: new Date().toISOString() },
			});

			if (slug) {
				try {
					await updateGitHubFile(
						token,
						ownerUsername || "",
						GITHUB_REPO as string,
						`src/content/posts/${slug}`,
						true,
						encryptionId,
					);
				} catch (ghError) {
					console.error("GitHub update file error on generate:", ghError);
					return new Response(
						JSON.stringify({
							success: true,
							password,
							message: "密码已生成，但更新 Git 失败，请手动修改 frontmatter",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}
			}

			return new Response(JSON.stringify({ success: true, password }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		if (action === "delete") {
			if (!encryptionId) {
				return new Response(
					JSON.stringify({ success: false, message: "缺少 encryptionId" }),
					{ status: 400, headers: { "Content-Type": "application/json" } },
				);
			}

			await POST_ENCRYPTION.delete(`post:${encryptionId}`);

			if (slug) {
				try {
					await updateGitHubFile(
						token,
						ownerUsername || "",
						GITHUB_REPO as string,
						`src/content/posts/${slug}`,
						false,
					);
				} catch (ghError) {
					console.error("GitHub update file error on delete:", ghError);
					return new Response(
						JSON.stringify({
							success: true,
							message: "密码已删除，但更新 Git 失败，请手动修改 frontmatter",
						}),
						{ status: 200, headers: { "Content-Type": "application/json" } },
					);
				}
			}

			return new Response(JSON.stringify({ success: true }), {
				status: 200,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(
			JSON.stringify({ success: false, message: "未知操作" }),
			{ status: 400, headers: { "Content-Type": "application/json" } },
		);
	} catch (error) {
		console.error("Manage passwords error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器错误" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

import { getEnv } from "@/utils/env-utils";

export const prerender = false;

interface ManagePasswordRequest {
	action: "generate" | "list" | "delete";
	token: string;
	encryptionId?: string;
	passwordLength?: number;
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
	} catch {
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

export async function POST({ request, locals }) {
	try {
		const body = (await request.json()) as ManagePasswordRequest;
		const { action, token, encryptionId, passwordLength } = body;

		const ownerUsername = getEnv(locals, "GITHUB_OWNER_USERNAME");
		const isOwner = await verifyGitHubToken(token, ownerUsername || "");

		if (!isOwner) {
			return new Response(
				JSON.stringify({ success: false, message: "未授权" }),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}

		const runtime = locals.runtime as any;
		const POST_ENCRYPTION = runtime?.env?.POST_ENCRYPTION;

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
			const passwords = list.keys.map((key: any) => ({
				encryptionId: key.name.replace("post:", ""),
				createdAt: key.metadata?.createdAt,
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

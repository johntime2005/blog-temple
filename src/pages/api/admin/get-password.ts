import type { APIContext } from "astro";
import { getEnv } from "@/utils/env-utils";

export const prerender = false;

interface GetPasswordRequest {
	token: string;
	encryptionId: string;
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

export async function POST({ request, locals }: APIContext): Promise<Response> {
	try {
		const body = (await request.json()) as GetPasswordRequest;
		const { token, encryptionId } = body;

		if (!encryptionId) {
			return new Response(
				JSON.stringify({ success: false, message: "缺少 encryptionId" }),
				{ status: 400, headers: { "Content-Type": "application/json" } },
			);
		}

		const ownerUsername = getEnv(locals, "GITHUB_OWNER_USERNAME");
		const isOwner = await verifyGitHubToken(token, ownerUsername || "");

		if (!isOwner) {
			return new Response(
				JSON.stringify({ success: false, message: "未授权" }),
				{ status: 401, headers: { "Content-Type": "application/json" } },
			);
		}

		const POST_ENCRYPTION = locals.runtime?.env?.POST_ENCRYPTION;

		if (!POST_ENCRYPTION) {
			return new Response(
				JSON.stringify({ success: false, message: "KV 存储不可用" }),
				{ status: 500, headers: { "Content-Type": "application/json" } },
			);
		}

		// 获取明文密码
		const password = await POST_ENCRYPTION.get(
			`admin:password:${encryptionId}`,
		);

		if (!password) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "密码不可用（可能未生成或已被删除）",
				}),
				{ status: 404, headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response(
			JSON.stringify({
				success: true,
				password,
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Cache-Control": "no-store",
				},
			},
		);
	} catch (error) {
		console.error("Get password error:", error);
		return new Response(
			JSON.stringify({ success: false, message: "服务器内部错误" }),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
}

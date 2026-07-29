/**
 * 私密文章清单加载（客户端）
 *
 * 与构建端 src/pages/api/private-manifest.json.ts、
 * 运行时 functions/api/auth/key.ts 三方约定：
 * 清单密文的解密密钥 = hmacSha256(主密钥, "system:private-manifest")，
 * 凭登录 token 调 /api/auth/key（仅站长放行）换取密钥后本地解密。
 */

import { decryptContent } from "@/utils/security";

export const PRIVATE_MANIFEST_SLUG = "system:private-manifest";

export interface PrivatePostMeta {
	id: string;
	slug: string;
	data: {
		title: string;
		published: string;
		description: string;
		tags: string[];
		category?: string;
		visibility: string;
		accessLevel?: string;
		encrypted?: boolean;
	};
}

export type PrivateManifestResult =
	| { status: "ok"; posts: PrivatePostMeta[] }
	| { status: "unauthorized" }
	| { status: "error"; message: string };

export async function loadPrivateManifest(
	token: string,
): Promise<PrivateManifestResult> {
	try {
		const keyRes = await fetch("/api/auth/key/", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ token, slug: PRIVATE_MANIFEST_SLUG }),
		});
		const keyData = await keyRes.json();

		if (!keyData.valid || !keyData.key) {
			return { status: "unauthorized" };
		}

		const manifestRes = await fetch("/api/private-manifest.json");
		if (!manifestRes.ok) {
			return {
				status: "error",
				message: `清单加载失败 (${manifestRes.status})`,
			};
		}

		const manifest = await manifestRes.json();
		if (!manifest.data) {
			return {
				status: "error",
				message: "私密文章清单未生成，请检查构建时的加密主密钥配置。",
			};
		}

		const plaintext = decryptContent(manifest.data, keyData.key);
		if (!plaintext) {
			return { status: "error", message: "清单解密失败" };
		}

		return { status: "ok", posts: JSON.parse(plaintext) };
	} catch (e) {
		console.error("Failed to load private manifest:", e);
		return { status: "error", message: "私密内容加载失败，请刷新重试。" };
	}
}

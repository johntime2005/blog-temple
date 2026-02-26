import type { APIContext } from "astro";
import type {
	AdminAPIResponse,
	Category,
	CategoryAPIRequest,
	CategoryConfigMap,
} from "@/types/admin";
import { KV_KEYS } from "@/types/admin";
import { getEnv } from "@/utils/env-utils";

export const prerender = false;

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

function jsonResponse<T>(data: AdminAPIResponse<T>, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
		},
	});
}

export async function POST({ request, locals }: APIContext): Promise<Response> {
	try {
		const body = (await request.json()) as CategoryAPIRequest;
		const { action, token, category, categoryId, categories, batchUpdate } =
			body;

		const ownerUsername = getEnv(locals, "GITHUB_OWNER_USERNAME");
		const isOwner = await verifyGitHubToken(token, ownerUsername || "");

		if (!isOwner) {
			return jsonResponse({ success: false, message: "未授权" }, 401);
		}

		const POST_ENCRYPTION = locals.runtime?.env?.POST_ENCRYPTION;

		if (!POST_ENCRYPTION) {
			if (action === "list") {
				return jsonResponse({ success: true, data: [] });
			}
			return jsonResponse({ success: false, message: "KV 存储不可用" }, 500);
		}

		const configJson = await POST_ENCRYPTION.get(KV_KEYS.CATEGORIES);
		const config: CategoryConfigMap = configJson ? JSON.parse(configJson) : {};

		switch (action) {
			case "list": {
				const categoriesList = Object.values(config).sort(
					(a, b) => a.order - b.order,
				);
				return jsonResponse<Category[]>({
					success: true,
					data: categoriesList,
				});
			}

			case "create": {
				if (!category) {
					return jsonResponse({ success: false, message: "缺少类别数据" }, 400);
				}

				if (config[category.id]) {
					return jsonResponse(
						{
							success: false,
							message: `类别 ID "${category.id}" 已存在`,
						},
						400,
					);
				}

				config[category.id] = {
					...category,
					slug: category.slug || category.id,
				};

				await POST_ENCRYPTION.put(KV_KEYS.CATEGORIES, JSON.stringify(config));

				return jsonResponse<Category>({
					success: true,
					message: "类别创建成功",
					data: category,
				});
			}

			case "update": {
				if (!category || !categoryId) {
					return jsonResponse(
						{ success: false, message: "缺少类别数据或类别 ID" },
						400,
					);
				}

				// Upsert: 如果 KV 中不存在该分类，自动创建（支持从构建时数据初始化）
				config[categoryId] = {
					...(config[categoryId] || {}),
					...category,
					id: categoryId,
					slug: category.slug || config[categoryId]?.slug || categoryId,
				};

				await POST_ENCRYPTION.put(KV_KEYS.CATEGORIES, JSON.stringify(config));
				return jsonResponse<Category>({
					success: true,
					message: "类别更新成功",
					data: config[categoryId],
				});
			}

			case "delete": {
				if (!categoryId) {
					return jsonResponse({ success: false, message: "缺少类别 ID" }, 400);
				}

				if (!config[categoryId]) {
					return jsonResponse(
						{
							success: false,
							message: `类别 "${categoryId}" 不存在`,
						},
						404,
					);
				}

				delete config[categoryId];

				await POST_ENCRYPTION.put(KV_KEYS.CATEGORIES, JSON.stringify(config));

				return jsonResponse({
					success: true,
					message: "类别删除成功",
				});
			}

			case "reorder": {
				if (!categories) {
					return jsonResponse({ success: false, message: "缺少类别列表" }, 400);
				}

				const newConfig: CategoryConfigMap = {};
				categories.forEach((cat, index) => {
					newConfig[cat.id] = {
						...cat,
						order: index,
					};
				});

				await POST_ENCRYPTION.put(
					KV_KEYS.CATEGORIES,
					JSON.stringify(newConfig),
				);

				return jsonResponse<Category[]>({
					success: true,
					message: "类别顺序更新成功",
					data: Object.values(newConfig).sort((a, b) => a.order - b.order),
				});
			}

			case "batch-update": {
				return jsonResponse({
					success: true,
					message: "找到 0 篇文章需要更新",
					data: {
						postsToUpdate: [],
						note: "请使用文章管理 API 进行批量更新,或触发重新构建",
					},
				});
			}

			default: {
				return jsonResponse({ success: false, message: "未知的操作" }, 400);
			}
		}
	} catch (error) {
		console.error("Category management error:", error);
		return jsonResponse({ success: false, message: "服务器内部错误" }, 500);
	}
}

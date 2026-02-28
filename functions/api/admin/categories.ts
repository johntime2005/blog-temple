/**
 * 类别管理 API
 *
 * POST /api/admin/categories
 *
 * 操作: list / create / update / delete / reorder
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";
import { error, ok, unauthorized } from "../../_lib/response";

interface Category {
	id: string;
	name: string;
	icon?: string;
	description?: string;
	showInHome: boolean;
	showInNavbar?: boolean;
	encrypted?: boolean;
	order: number;
	color?: string;
	slug?: string;
}

type CategoryMap = Record<string, Category>;

async function getCategories(kv: KVNamespace): Promise<CategoryMap> {
	const data = await kv.get(KV_KEYS.CATEGORIES, "json");
	return (data as CategoryMap) || {};
}

async function saveCategories(
	kv: KVNamespace,
	config: CategoryMap,
): Promise<void> {
	await kv.put(KV_KEYS.CATEGORIES, JSON.stringify(config));
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		category?: Category;
		categoryId?: string;
		categories?: Category[];
	};

	const token = extractToken(context.request, body);
	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	const config = await getCategories(env.POST_ENCRYPTION);

	switch (body.action) {
		case "list": {
			const list = Object.values(config).sort((a, b) => a.order - b.order);
			return ok(list);
		}

		case "create": {
			if (!body.category) return error("缺少类别数据");
			if (config[body.category.id])
				return error(`类别 ID "${body.category.id}" 已存在`);

			config[body.category.id] = {
				...body.category,
				slug: body.category.slug || body.category.id,
			};
			await saveCategories(env.POST_ENCRYPTION, config);
			return ok(body.category, "类别创建成功");
		}

		case "update": {
			if (!body.category || !body.categoryId) return error("缺少类别数据或 ID");
			if (!config[body.categoryId])
				return error(`类别 "${body.categoryId}" 不存在`, 404);

			config[body.categoryId] = {
				...config[body.categoryId],
				...body.category,
				id: body.categoryId,
			};
			await saveCategories(env.POST_ENCRYPTION, config);
			return ok(config[body.categoryId], "类别更新成功");
		}

		case "delete": {
			if (!body.categoryId) return error("缺少类别 ID");
			if (!config[body.categoryId])
				return error(`类别 "${body.categoryId}" 不存在`, 404);

			delete config[body.categoryId];
			await saveCategories(env.POST_ENCRYPTION, config);
			return ok(null, "类别删除成功");
		}

		case "reorder": {
			if (!body.categories) return error("缺少类别列表");

			const newConfig: CategoryMap = {};
			body.categories.forEach((cat, index) => {
				newConfig[cat.id] = { ...cat, order: index };
			});
			await saveCategories(env.POST_ENCRYPTION, newConfig);
			return ok(
				Object.values(newConfig).sort((a, b) => a.order - b.order),
				"类别顺序更新成功",
			);
		}

		default:
			return error(`未知操作: ${body.action}`);
	}
};

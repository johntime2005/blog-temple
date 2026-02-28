/**
 * 友链配置管理 API
 *
 * POST /api/admin/friends
 *
 * 操作: get / update / add / remove / reorder
 */

import { extractToken, verifyAdminToken } from "../../_lib/auth";
import type { Env } from "../../_lib/env";
import { KV_KEYS } from "../../_lib/env";
import { error, ok, unauthorized } from "../../_lib/response";

interface FriendLink {
	title: string;
	imgurl: string;
	desc: string;
	siteurl: string;
	tags?: string[];
	weight: number;
	enabled: boolean;
}

async function getFriends(kv: KVNamespace): Promise<FriendLink[]> {
	const data = await kv.get(KV_KEYS.FRIENDS, "json");
	return (data as FriendLink[]) || [];
}

async function saveFriends(
	kv: KVNamespace,
	friends: FriendLink[],
): Promise<void> {
	await kv.put(KV_KEYS.FRIENDS, JSON.stringify(friends));
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
	const { env } = context;
	const body = (await context.request.json()) as {
		token?: string;
		action: string;
		friend?: FriendLink;
		index?: number;
		friends?: FriendLink[];
	};

	const token = extractToken(context.request, body);
	if (!(await verifyAdminToken(env.POST_ENCRYPTION, token))) {
		return unauthorized();
	}

	const friends = await getFriends(env.POST_ENCRYPTION);

	switch (body.action) {
		case "get": {
			// 按权重排序，启用的在前
			const sorted = [...friends].sort((a, b) => b.weight - a.weight);
			return ok(sorted);
		}

		case "update": {
			// 完整替换友链列表
			if (!body.friends) return error("缺少友链数据");
			await saveFriends(env.POST_ENCRYPTION, body.friends);
			return ok(body.friends, "友链已更新（即时生效）");
		}

		case "add": {
			if (!body.friend) return error("缺少友链数据");
			friends.push(body.friend);
			await saveFriends(env.POST_ENCRYPTION, friends);
			return ok(friends, "友链添加成功");
		}

		case "remove": {
			if (
				body.index === undefined ||
				body.index < 0 ||
				body.index >= friends.length
			) {
				return error("无效的索引");
			}
			friends.splice(body.index, 1);
			await saveFriends(env.POST_ENCRYPTION, friends);
			return ok(friends, "友链删除成功");
		}

		case "reorder": {
			if (!body.friends) return error("缺少友链数据");
			await saveFriends(env.POST_ENCRYPTION, body.friends);
			return ok(body.friends, "友链顺序已更新");
		}

		case "reset": {
			await env.POST_ENCRYPTION.delete(KV_KEYS.FRIENDS);
			return ok(null, "友链已重置为默认值");
		}

		default:
			return error(`未知操作: ${body.action}`);
	}
};

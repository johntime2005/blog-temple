/**
 * 动态配置加载器
 *
 * 运行时从 /api/config/[name] 获取 KV 中的配置覆盖。
 * 如果 API 不可用或未设置覆盖，返回 null（使用构建时静态值）。
 *
 * 用法：
 *   import { loadDynamicConfig } from '@/utils/dynamic-config';
 *   const announcement = await loadDynamicConfig('announcement');
 *   if (announcement) { // 使用动态值 } else { // 使用静态值 }
 */

type ConfigName =
	| "announcement"
	| "friends"
	| "profile"
	| "site-config"
	| "navbar"
	| "categories";

interface ConfigResponse<T> {
	success: boolean;
	data: T | null;
	source: "kv" | "default";
}

// 内存缓存，避免同一页面重复请求
const cache = new Map<string, { data: unknown; ts: number }>();
const CACHE_MS = 60_000; // 1 分钟客户端缓存

/**
 * 从 API 加载动态配置
 * @param name 配置名
 * @param cacheTtlMs 客户端缓存时间（毫秒），默认 60 秒
 * @returns 配置数据，如果未设置覆盖或请求失败则返回 null
 */
export async function loadDynamicConfig<T = unknown>(
	name: ConfigName,
	cacheTtlMs = CACHE_MS,
): Promise<T | null> {
	// 检查内存缓存
	const cached = cache.get(name);
	if (cached && Date.now() - cached.ts < cacheTtlMs) {
		return cached.data as T | null;
	}

	try {
		const res = await fetch(`/api/config/${name}`, {
			headers: { Accept: "application/json" },
		});

		if (!res.ok) return null;

		const json = (await res.json()) as ConfigResponse<T>;

		// 缓存结果
		cache.set(name, { data: json.data, ts: Date.now() });

		return json.data;
	} catch {
		// API 不可用时静默降级
		return null;
	}
}

/**
 * 清除指定配置的客户端缓存
 */
export function clearConfigCache(name?: ConfigName): void {
	if (name) {
		cache.delete(name);
	} else {
		cache.clear();
	}
}

import { coverImageConfig } from "@/config/coverImageConfig";

const randomCoverImage = coverImageConfig.randomCoverImage;

/**
 * 处理文章封面图
 * 当image字段为"api"时，从配置的随机图API获取图片
 * @param image - 文章frontmatter中的image字段值
 * @param seed - 用于生成随机图的种子（通常使用文章slug或id）
 * @returns 处理后的图片URL
 */
export async function processCoverImage(
	image: string | undefined,
	seed?: string,
): Promise<string> {
	// 如果image不存在或为空
	if (!image || image === "") {
		// 如果启用默认使用随机图，则继续处理（视为 "api"）
		if (randomCoverImage.enable) {
			// 接下来的逻辑会处理随机图生成
		} else {
			return "";
		}
	} else if (image !== "api") {
		// 如果image不是"api"且不为空，直接返回原始值
		return image;
	}

	// 如果未启用随机图功能，直接返回空字符串（不显示封面，也不显示备用图）
	if (
		!randomCoverImage.enable ||
		!randomCoverImage.apis ||
		randomCoverImage.apis.length === 0
	) {
		return "";
	}

	try {
		// 返回第一个API，客户端脚本会依次尝试所有API
		const firstApi = randomCoverImage.apis[0];

		// 生成seed值：使用文章slug或时间戳
		const seedValue = seed || Date.now().toString();

		// 如果API中包含{seed}占位符，替换它
		let apiUrl = firstApi.replace(/{seed}/g, seedValue);

		// 如果API中没有{seed}占位符，需要添加随机参数确保每篇文章获取不同图片
		if (!firstApi.includes("{seed}")) {
			// 将seed转换为数字hash（确保每个不同的slug产生不同的hash）
			const hash = seedValue.split("").reduce((acc, char) => {
				return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
			}, 0);

			// 添加查询参数来确保每篇文章获取不同的图片
			const separator = apiUrl.includes("?") ? "&" : "?";
			// 使用hash确保每篇文章有不同的URL（稳定且唯一，基于文章slug）
			// 注意：如果API不支持查询参数来获取不同图片，可能需要配置支持seed占位符的API
			apiUrl = `${apiUrl}${separator}v=${Math.abs(hash)}`;
		}

		return apiUrl;
	} catch (error) {
		console.warn("Failed to process random image API:", error);
		// 即使出错，如果enable为false也不返回fallback，直接返回空字符串
		if (!randomCoverImage.enable) {
			return "";
		}
		return randomCoverImage.fallback || "";
	}
}

export function processCoverImageSync(
	image: string | undefined,
	seed?: string,
): string {
	if (!image || image === "") {
		if (randomCoverImage.enable) {
		} else {
			return "";
		}
	} else if (image !== "api") {
		return image;
	}

	if (
		!randomCoverImage.enable ||
		!randomCoverImage.apis ||
		randomCoverImage.apis.length === 0
	) {
		return "";
	}

	try {
		const firstApi = randomCoverImage.apis[0];
		const seedValue = seed || Date.now().toString();
		let apiUrl = firstApi.replace(/{seed}/g, seedValue);

		if (!firstApi.includes("{seed}")) {
			const hash = seedValue.split("").reduce((acc, char) => {
				return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
			}, 0);
			const separator = apiUrl.includes("?") ? "&" : "?";
			apiUrl = `${apiUrl}${separator}v=${Math.abs(hash)}`;
		}

		return apiUrl;
	} catch (_error) {
		if (!randomCoverImage.enable) {
			return "";
		}
		return randomCoverImage.fallback || "";
	}
}

/**
 * 生成所有API URL列表（用于客户端重试）
 */
export function generateApiUrls(seed?: string): string[] {
	if (
		!randomCoverImage.enable ||
		!randomCoverImage.apis ||
		randomCoverImage.apis.length === 0
	) {
		return [];
	}

	const seedValue = seed || Date.now().toString();
	const hash = seedValue.split("").reduce((acc, char) => {
		return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
	}, 0);

	return randomCoverImage.apis.map((api) => {
		let apiUrl = api.replace(/{seed}/g, seedValue);

		if (!api.includes("{seed}")) {
			const separator = apiUrl.includes("?") ? "&" : "?";
			apiUrl = `${apiUrl}${separator}v=${Math.abs(hash)}`;
		}

		return apiUrl;
	});
}

/**
 * HTTP 响应工具
 *
 * 统一的 JSON 响应格式和 CORS 头处理。
 */

interface ApiResponse<T = unknown> {
	success: boolean;
	message?: string;
	data?: T;
}

const CORS_HEADERS: Record<string, string> = {
	"Access-Control-Allow-Origin": "*",
	"Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
	"Access-Control-Allow-Headers": "Content-Type, Authorization",
	"Access-Control-Max-Age": "86400",
};

/**
 * 成功响应
 */
export function ok<T>(data?: T, message?: string): Response {
	const body: ApiResponse<T> = { success: true };
	if (data !== undefined) body.data = data;
	if (message) body.message = message;

	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-store",
			...CORS_HEADERS,
		},
	});
}

/**
 * 错误响应
 */
export function error(message: string, status = 400): Response {
	const body: ApiResponse = { success: false, message };
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			"Content-Type": "application/json",
			...CORS_HEADERS,
		},
	});
}

/**
 * 401 未授权
 */
export function unauthorized(message = "未授权: 无效的管理员 token"): Response {
	return error(message, 401);
}

/**
 * 404 未找到
 */
export function notFound(message = "资源不存在"): Response {
	return error(message, 404);
}

/**
 * 405 方法不允许
 */
export function methodNotAllowed(): Response {
	return error("Method not allowed", 405);
}

/**
 * 500 内部错误
 */
export function serverError(message = "服务器内部错误"): Response {
	return error(message, 500);
}

/**
 * CORS 预检响应
 */
export function corsPreflightResponse(): Response {
	return new Response(null, {
		status: 204,
		headers: CORS_HEADERS,
	});
}

/**
 * 给已有响应添加 CORS 头
 */
export function withCors(response: Response): Response {
	const newHeaders = new Headers(response.headers);
	for (const [key, value] of Object.entries(CORS_HEADERS)) {
		newHeaders.set(key, value);
	}
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers: newHeaders,
	});
}

// OAuth 授权端点 - 使用加密安全的 state 参数
import {
	generateSecureToken,
	getSecureCookieOptions,
	hmacSha256,
	securityHeaders,
} from "@/utils/security";

export const prerender = false;

export async function GET({ request, redirect, locals, cookies }) {
	try {
		const runtime = locals.runtime as any;
		const clientId = runtime?.env?.GITHUB_CLIENT_ID;
		const clientSecret = runtime?.env?.GITHUB_CLIENT_SECRET;

		// 详细的环境变量检查
		if (!clientId) {
			console.error("[OAuth] GITHUB_CLIENT_ID 未配置");
			return new Response(
				buildErrorPage(
					"配置错误",
					"GitHub OAuth 未配置。请在 Cloudflare Pages 环境变量中设置 GITHUB_CLIENT_ID。",
					[
						"1. 访问 Cloudflare Pages 控制台",
						"2. 进入项目设置 → Environment variables",
						"3. 添加 GITHUB_CLIENT_ID 和 GITHUB_CLIENT_SECRET",
						"4. 重新部署项目",
					],
				),
				{
					status: 500,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
						...securityHeaders,
					},
				},
			);
		}

		const url = new URL(request.url);
		const authUrl = new URL("https://github.com/login/oauth/authorize");

		// 生成加密安全的随机 state（32字节 = 256位熵）
		const stateRandom = generateSecureToken(32);
		const timestamp = Date.now().toString();
		const stateData = `${timestamp}.${stateRandom}`;

		// 使用 HMAC-SHA256 签名 state，防止篡改
		const stateSignature = clientSecret
			? await hmacSha256(clientSecret, stateData)
			: stateRandom;

		const state = `${stateData}.${stateSignature}`;

		// 将 state 存储到 httpOnly cookie 中（10分钟有效期）
		cookies.set("oauth_state", state, getSecureCookieOptions(600));

		// Store redirect URL if present
		const redirectParam = url.searchParams.get("redirect");
		if (redirectParam) {
			cookies.set("auth_redirect", redirectParam, getSecureCookieOptions(600));
		}

		const redirectUri = `${url.origin}/auth/callback/`;
		console.log(`[OAuth] Using redirect_uri: ${redirectUri}`);

		authUrl.searchParams.set("client_id", clientId);
		authUrl.searchParams.set("redirect_uri", redirectUri);
		authUrl.searchParams.set("scope", "public_repo"); // 最小权限原则
		authUrl.searchParams.set("state", state);

		console.log("[OAuth] 重定向到 GitHub 授权页面");
		return redirect(authUrl.toString(), 302);
	} catch (error) {
		console.error("[OAuth] 授权请求失败:", error);
		return new Response(
			buildErrorPage("授权失败", "无法启动 GitHub 授权流程。", [
				"请刷新页面重试",
				"如果问题持续，请联系管理员",
			]),
			{
				status: 500,
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...securityHeaders,
				},
			},
		);
	}
}

function buildErrorPage(
	title: string,
	message: string,
	steps: string[],
	detail?: string,
): string {
	return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - 博客管理后台</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 600px;
      padding: 40px;
      text-align: center;
    }
    h1 {
      color: #e74c3c;
      font-size: 24px;
      margin-bottom: 16px;
    }
    .message {
      color: #555;
      font-size: 16px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .steps {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 24px;
      text-align: left;
    }
    .steps h3 {
      color: #333;
      font-size: 14px;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .steps ol {
      margin-left: 20px;
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .detail {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 24px;
      font-size: 12px;
      color: #856404;
      word-break: break-all;
    }
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }
    button, a {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s;
      font-size: 14px;
      border: none;
    }
    .primary {
      background: #667eea;
      color: white;
    }
    .primary:hover {
      background: #5568d3;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    .secondary {
      background: #e9ecef;
      color: #495057;
    }
    .secondary:hover {
      background: #dee2e6;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>❌ ${title}</h1>
    <p class="message">${message}</p>
    ${
			steps.length > 0
				? `
    <div class="steps">
      <h3>解决步骤：</h3>
      <ol>
        ${steps.map((step) => `<li>${step}</li>`).join("")}
      </ol>
    </div>
    `
				: ""
		}
    ${
			detail
				? `<div class="detail"><strong>详细信息：</strong><br>${detail}</div>`
				: ""
		}
    <div class="actions">
      <button class="primary" onclick="window.location.reload()">刷新重试</button>
      <a href="/admin" class="secondary">返回后台</a>
    </div>
  </div>
</body>
</html>
  `;
}

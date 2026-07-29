/**
 * OAuth 流程的 HTML 页面模板（错误页 / 成功页）
 *
 * 只展示对用户友好的提示；具体原因通过 console.error 写入
 * Cloudflare Pages Functions 日志（Dashboard → Functions → Real-time Logs）。
 */

const PAGE_STYLE = `
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
      max-width: 520px;
      padding: 40px;
      text-align: center;
    }
    h1 { font-size: 22px; margin-bottom: 16px; }
    .error h1 { color: #e74c3c; }
    .success h1 { color: #27ae60; }
    .message { color: #555; font-size: 15px; margin-bottom: 24px; line-height: 1.7; }
    .steps {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 16px 20px;
      margin-bottom: 24px;
      text-align: left;
      color: #666;
      font-size: 14px;
      line-height: 1.8;
    }
    .steps ol { margin-left: 20px; }
    .actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
    .actions a, .actions button {
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      font-size: 14px;
      border: none;
    }
    .primary { background: #667eea; color: white; }
    .secondary { background: #e9ecef; color: #495057; }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
`;

export const securityHeaders: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "no-referrer",
	"Cache-Control": "no-store",
};

export function htmlResponse(
	body: string,
	status: number,
	extraHeaders?: HeadersInit,
): Response {
	const headers = new Headers({
		"Content-Type": "text/html; charset=utf-8",
		...securityHeaders,
	});
	if (extraHeaders) {
		for (const [key, value] of new Headers(extraHeaders).entries()) {
			headers.append(key, value);
		}
	}
	return new Response(body, { status, headers });
}

export function buildErrorPage(
	title: string,
	message: string,
	steps: string[] = [],
): string {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>${title} - 登录</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <div class="container error">
    <h1>❌ ${title}</h1>
    <p class="message">${message}</p>
    ${
			steps.length
				? `<div class="steps"><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol></div>`
				: ""
		}
    <div class="actions">
      <a href="/auth/login/" class="primary">重新登录</a>
      <a href="/" class="secondary">返回首页</a>
    </div>
  </div>
</body>
</html>`;
}

export interface AuthResultPayload {
	/** Decap/Sveltia CMS 兼容字段：站长时为 GitHub access token */
	token: string;
	/** 博客自身的不透明 session token */
	sessionToken: string;
	username: string;
	role: string;
	provider: "github";
	backend: "github";
}

/**
 * 登录成功页。
 * - 写入 localStorage："user-token" = session token；
 *   站长额外写 "netlify-cms-user"（Decap/Sveltia CMS 需要真实 GitHub token）。
 * - popup 场景：向 opener 重放 Decap 协议消息后自动关闭。
 * - 直开场景：跳回 redirectUrl。
 */
export function buildSuccessPage(
	payload: AuthResultPayload,
	redirectUrl: string,
): string {
	return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex">
  <title>登录成功</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <div class="container success">
    <h1>✅ 登录成功</h1>
    <p class="message">正在返回，请稍候…</p>
    <div class="spinner"></div>
    <div class="steps">窗口未自动关闭？回到原页面刷新即可看到登录状态。</div>
  </div>
  <script>
    (function () {
      var payload = ${JSON.stringify(payload)};
      var redirectUrl = ${JSON.stringify(redirectUrl)};

      try {
        localStorage.setItem("user-token", payload.sessionToken);
        if (payload.role === "admin" && payload.token !== payload.sessionToken) {
          localStorage.setItem("netlify-cms-user", JSON.stringify({
            token: payload.token,
            provider: "github",
            backend: "github",
            login: payload.username,
            role: payload.role
          }));
        }
      } catch (e) {
        console.error("[OAuth] LocalStorage 写入失败", e);
      }

      if (window.opener) {
        var attempts = 0;
        var timer = setInterval(function () {
          attempts++;
          try {
            window.opener.postMessage("authorizing:github", "*");
            window.opener.postMessage(
              "authorization:github:success:" + JSON.stringify(payload),
              "*"
            );
            window.opener.postMessage(payload, "*");
          } catch (e) {
            console.error("[OAuth] postMessage 失败", e);
          }
          if (attempts >= 5) {
            clearInterval(timer);
            setTimeout(function () { window.close(); }, 1500);
          }
        }, 600);
      } else {
        setTimeout(function () { window.location.href = redirectUrl; }, 1200);
      }
    })();
  </script>
</body>
</html>`;
}

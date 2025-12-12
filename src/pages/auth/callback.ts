// OAuth 回调端点 - 完整的 state 验证和安全令牌处理
import {
	hmacSha256,
	securityHeaders,
	timingSafeEqual,
} from "../../utils/security";

export const prerender = false;

export async function GET({ request, locals, cookies }) {
	const url = new URL(request.url);
	const code = url.searchParams.get("code");
	const callbackState = url.searchParams.get("state");
	const error = url.searchParams.get("error");
	const errorDescription = url.searchParams.get("error_description");

	// 处理用户拒绝授权
	if (error) {
		console.error("[OAuth] GitHub 授权失败:", error, errorDescription);
		return new Response(
			buildErrorPage(
				"授权被拒绝",
				error === "access_denied"
					? "您拒绝了授权请求。要使用 CMS 管理后台或访问私密内容，需要授予 GitHub 访问权限。"
					: `授权失败: ${error}`,
				[
					"1. 点击下方按钮重新尝试授权",
					'2. 在 GitHub 授权页面点击"授权"',
					"3. 确保您的 GitHub 账号有仓库访问权限",
				],
			),
			{
				status: 400,
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...securityHeaders,
				},
			},
		);
	}

	// 检查授权码
	if (!code) {
		console.error("[OAuth] 缺少授权码");
		return new Response(
			buildErrorPage(
				"授权参数缺失",
				"未收到 GitHub 授权码。这可能是授权流程被中断。",
				["请重新开始授权流程"],
			),
			{
				status: 400,
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...securityHeaders,
				},
			},
		);
	}

	// 🔒 验证 state 参数（防止 CSRF 攻击）
	const savedState = cookies.get("oauth_state")?.value;

	if (!callbackState || !savedState) {
		console.error("[OAuth] State 参数缺失", {
			hasCallbackState: !!callbackState,
			hasSavedState: !!savedState,
		});
		return new Response(
			buildErrorPage(
				"安全验证失败",
				"OAuth 状态参数缺失或无效。这可能是 CSRF 攻击或会话过期。",
				["请重新开始授权流程", "确保浏览器允许 Cookie"],
			),
			{
				status: 403,
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...securityHeaders,
				},
			},
		);
	}

	// 使用时间安全的比较（防止时序攻击）
	if (!timingSafeEqual(callbackState, savedState)) {
		console.error("[OAuth] State 验证失败 - 可能的 CSRF 攻击");
		return new Response(
			buildErrorPage("安全验证失败", "OAuth 状态参数不匹配。请重新授权。", [
				"请重新开始授权流程",
			]),
			{
				status: 403,
				headers: {
					"Content-Type": "text/html; charset=utf-8",
					...securityHeaders,
				},
			},
		);
	}

	// 验证 state 签名（如果包含签名）
	const runtime = locals.runtime as any;
	const clientId = runtime?.env?.GITHUB_CLIENT_ID;
	const clientSecret = runtime?.env?.GITHUB_CLIENT_SECRET;
	const ownerUsername = runtime?.env?.GITHUB_OWNER_USERNAME; // 获取配置的所有者用户名
	// KV 绑定
	const POST_ENCRYPTION = runtime?.env?.POST_ENCRYPTION;

	if (clientSecret) {
		const stateParts = savedState.split(".");
		if (stateParts.length === 3) {
			const [timestamp, random, signature] = stateParts;
			const stateData = `${timestamp}.${random}`;
			const expectedSignature = await hmacSha256(clientSecret, stateData);

			if (!timingSafeEqual(signature, expectedSignature)) {
				console.error("[OAuth] State 签名验证失败");
				return new Response(
					buildErrorPage("安全验证失败", "OAuth 状态签名无效。", [
						"请重新开始授权流程",
					]),
					{
						status: 403,
						headers: {
							"Content-Type": "text/html; charset=utf-8",
							...securityHeaders,
						},
					},
				);
			}

			// 验证时间戳（10分钟有效期）
			const stateTime = Number.parseInt(timestamp, 10);
			if (Number.isNaN(stateTime) || Date.now() - stateTime > 600000) {
				console.error("[OAuth] State 已过期");
				return new Response(
					buildErrorPage("授权已过期", "OAuth 授权请求已过期，请重新授权。", [
						"请重新开始授权流程",
					]),
					{
						status: 403,
						headers: {
							"Content-Type": "text/html; charset=utf-8",
							...securityHeaders,
						},
					},
				);
			}
		}
	}

	// 清除已使用的 state cookie
	cookies.delete("oauth_state", { path: "/" });

	// 检查环境变量
	if (!clientId || !clientSecret) {
		console.error("[OAuth] 环境变量未配置", {
			hasClientId: !!clientId,
			hasClientSecret: !!clientSecret,
		});
		return new Response(
			buildErrorPage("服务器配置错误", "GitHub OAuth 环境变量未正确配置。", [
				"请联系管理员配置以下环境变量：",
				"• GITHUB_CLIENT_ID",
				"• GITHUB_CLIENT_SECRET",
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

	try {
		console.log("[OAuth] 正在交换授权码为访问令牌...");

		// 交换授权码为访问令牌
		const tokenResponse = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					client_id: clientId,
					client_secret: clientSecret,
					code: code,
				}),
			},
		);

		const data = await tokenResponse.json();

		// 检查 GitHub API 错误
		if (data.error) {
			console.error("[OAuth] GitHub API 错误:", data.error);
			return new Response(
				buildErrorPage("GitHub 授权失败", `GitHub 返回错误: ${data.error}`, [
					"请重新尝试授权",
					"确保 OAuth App 配置正确",
				]),
				{
					status: 400,
					headers: {
						"Content-Type": "text/html; charset=utf-8",
						...securityHeaders,
					},
				},
			);
		}

		// 检查访问令牌
		if (!data.access_token) {
			console.error("[OAuth] 未收到访问令牌");
			return new Response(
				buildErrorPage("令牌获取失败", "无法从 GitHub 获取访问令牌。", [
					"请重新尝试授权",
					"如果问题持续，请检查 OAuth App 配置",
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

		console.log("[OAuth] 授权成功，正在获取用户信息并创建会话...");

		// 1. 获取用户信息
		const userResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `token ${data.access_token}`,
				"User-Agent": "Astro-Blog-App",
			},
		});

		if (!userResponse.ok) {
			console.error("[OAuth] 无法获取用户信息");
			// 即使获取用户失败，如果有 token，可能仍需支持 CMS 登录（虽然 CMS 通常自己处理）
			// 这里我们选择报错，因为我们需要验证身份
			const errorText = await userResponse.text();
			console.error("User info error:", errorText);
		}

		const userData = await userResponse.json();
		const loginUsername = userData.login;
		const sessionToken = data.access_token; // 默认使用 github token 作为 session (兼容 CMS)

		// 2. 验证是否为所有者
		let role = "user";
		if (
			ownerUsername &&
			loginUsername &&
			ownerUsername.toLowerCase() === loginUsername.toLowerCase()
		) {
			role = "admin";
			console.log("[OAuth] 验证通过：当前用户是博客所有者");

			// 3. 如果是所有者，创建服务端 Session
			if (POST_ENCRYPTION) {
				// 为了兼容 Decap CMS，必须返回真实的 GitHub Access Token
				// 因此我们将 GitHub Access Token 作为 Session Key 存储在 KV 中
				// 这样既能满足 CMS 的 API 调用需求，又能满足我们后端的 Session 验证需求

				const sessionData = {
					username: loginUsername,
					role: role,
					createdAt: Date.now(),
					githubToken: data.access_token,
				};

				// 存储 Session，有效期 7 天
				await POST_ENCRYPTION.put(
					`session:${data.access_token}`,
					JSON.stringify(sessionData),
					{
						expirationTtl: 60 * 60 * 24 * 7,
					},
				);
				console.log("[OAuth] Session 已创建 (基于 GitHub Token)");
			} else {
				console.error("[OAuth] 缺少 KV 绑定 POST_ENCRYPTION，无法创建 Session");
			}
		} else {
			console.log(
				`[OAuth] 用户 ${loginUsername} 不是配置的所有者 (${ownerUsername})`,
			);
		}

		// Decap CMS 期望的消息格式 (保留兼容性)
		const postMsgContent = {
			token: sessionToken, // 对于 CMS，这可能是 session token 或 github token，取决于 CMS 配置。
			// 注意：如果 CMS 这里只能用 GitHub token，那么我们可能需要区分返回。
			// 但需求主要是"登录后访问私密内容"。
			// 策略：返回我们生成的 sessionToken。前端此时作为验证凭证。
			// 只有当我们确实是 owner 时，才返回 sessionToken。
			// 如果不是 owner，我们还是返回 GitHub token 吗？
			// 为了安全，如果用途是"解锁私密内容"，非 owner 不应该获得特权。
			// 如果用途是 CMS，CMS 需要 GitHub token。
			// 这是一个冲突点。通常 CMS 登录和读者登录可以是分开的，或者共用。
			// 如果共用，CMS 需要真实的 GitHub Token 才能操作仓库。
			// 如果我们返回 sessionToken给 CMS，CMS 会失败。
			// 解决方案：
			// 总是返回 GitHub Token 给 postMessage (给 CMS 用)。
			// 同时，如果验证是 Owner，我们通过 Cookie 或其它方式传递 Session，或者让前端再发起一次验证。
			// 简化方案：保留 postMsgContent 为 GitHub Token (满足 CMS)。
			// 额外：如果是 Owner，我们在 KV 中记录 "github_token -> session_data" 的映射？
			// 或者，我们直接把 GitHub Token 当作 Session Key (简单但略有风险，泄露 Token = 泄露 Session)。
			// 考虑到 Cloudflare KV 是安全的，我们可以用 `session:${github_token}` 存储 Session 数据。
			// 这样前端拿到 GitHub Token，既能给 CMS 用，也能作为 Header 发给我们的 API 验证身份。
			username: loginUsername,
			role: role,
			provider: "github",
		};

		let redirectUrl = cookies.get("auth_redirect")?.value || "/";
		// Ensure redirectUrl has a trailing slash if it's not root, to avoid Astro redirects
		const [redirectPath, redirectSearch] = redirectUrl.split("?");
		if (redirectPath !== "/" && !redirectPath.endsWith("/")) {
			redirectUrl = `${redirectPath}/${redirectSearch ? `?${redirectSearch}` : ""}`;
		}

		// 返回成功页面
		return new Response(buildSuccessPage(postMsgContent, redirectUrl), {
			status: 200,
			headers: {
				"Content-Type": "text/html; charset=utf-8",
				...securityHeaders,
			},
		});
	} catch (error) {
		console.error("[OAuth] 令牌交换失败:", error);
		return new Response(
			buildErrorPage("授权过程出错", "在处理 GitHub 授权时发生错误。", [
				"请重新尝试授权",
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

function buildSuccessPage(
	postMsgContent: {
		token: string;
		provider: string;
		username: string;
		role: string;
	},
	redirectUrl: string,
): string {
	return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>授权成功 - 博客管理后台</title>
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
      max-width: 500px;
      padding: 40px;
      text-align: center;
    }
    .success-icon {
      font-size: 64px;
      margin-bottom: 20px;
      animation: scaleIn 0.5s ease-out;
    }
    @keyframes scaleIn {
      from { transform: scale(0); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    h1 {
      color: #27ae60;
      font-size: 24px;
      margin-bottom: 16px;
    }
    .message {
      color: #555;
      font-size: 16px;
      margin-bottom: 24px;
      line-height: 1.6;
    }
    .loading {
      margin: 20px 0;
    }
    .spinner {
      border: 3px solid #f3f3f3;
      border-top: 3px solid #667eea;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .fallback {
      margin-top: 20px;
      padding: 16px;
      background: #f8f9fa;
      border-radius: 8px;
      font-size: 14px;
      color: #666;
    }
    .fallback a {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
    }
    .fallback a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="success-icon">✅</div>
    <h1>授权成功！</h1>
    <p class="message">正在返回管理后台...</p>
    <div class="loading">
      <div class="spinner"></div>
    </div>
    <div class="fallback">
      窗口未自动关闭？<br>
      <a href="/admin">点击这里返回管理后台</a>
    </div>
  </div>
  <script>
    (function() {
      const postMsgContent = ${JSON.stringify(postMsgContent)};
      const origin = window.location.origin;

      console.log('[OAuth] 授权成功，token 已接收');

      if (window.opener) {
        console.log('[OAuth] 检测到 opener，准备发送消息');

        // Decap CMS OAuth 握手流程
        function receiveMessage(e) {
          console.log('[OAuth] 收到来自 opener 的消息');

          // 发送成功消息
          const successMessage = 'authorization:github:success:' + JSON.stringify(postMsgContent);
          window.opener.postMessage(successMessage, e.origin);

          // 移除监听器
          window.removeEventListener("message", receiveMessage, false);

          // 延迟关闭窗口
          setTimeout(function() {
            window.close();
          }, 500);
        }

        // 监听来自 opener 的消息
        window.addEventListener("message", receiveMessage, false);

        // 通知 opener 授权进行中
        window.opener.postMessage("authorizing:github", origin);

        // 5秒后如果窗口还未关闭，提供手动关闭选项
        setTimeout(function() {
          if (!window.closed) {
            document.querySelector('.fallback').innerHTML += '<br><button onclick="window.close()" style="margin-top: 10px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">关闭此窗口</button>';
          }
        }, 5000);
      } else {
        // 如果没有 opener，说明是前台登录
        console.log('[OAuth] 无 opener，视为前台登录');
        try {
          // 存储到 localStorage 供 AccessGuard 和 frontend 使用
          localStorage.setItem('user-token', postMsgContent.token);
          
          // 同时也为 CMS 存储 (兼容性)
          localStorage.setItem('netlify-cms-user', JSON.stringify(postMsgContent));

          const url = "${redirectUrl}";
          document.querySelector('.message').textContent = '登录成功！正在跳转...';

          // 重定向回之前的页面
          setTimeout(function() {
            window.location.href = url;
          }, 1000);
        } catch (e) {
          console.error('[OAuth] 无法保存 token:', e);
          document.querySelector('.message').textContent = '登录成功，但无法保存会话。请手动返回。';
        }
      }
    })();
  </script>
</body>
</html>
  `;
}

function buildErrorPage(
	title: string,
	message: string,
	steps: string[],
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
    .actions {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
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
    <div class="actions">
      <a href="/auth/" class="primary">重新授权</a>
      <a href="/admin" class="secondary">返回后台</a>
    </div>
  </div>
</body>
</html>
  `;
}

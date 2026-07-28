import type { APIRoute } from "astro";

// 说明：不再屏蔽 /_astro/，搜索引擎需要抓取 CSS/JS 才能正确渲染页面并评估
// 移动端友好度与 Core Web Vitals；改为屏蔽后台与接口等非内容路径。
const robotsTxt = `
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /auth/
Disallow: /setup/
Disallow: /login/

Sitemap: ${new URL("sitemap-index.xml", import.meta.env.SITE).href}
`.trim();

export const GET: APIRoute = () => {
	return new Response(robotsTxt, {
		headers: {
			"Content-Type": "text/plain; charset=utf-8",
		},
	});
};

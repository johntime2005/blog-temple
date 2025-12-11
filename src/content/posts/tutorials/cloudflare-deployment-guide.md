---
title: 基于 Astro + Firefly 的博客部署到 Cloudflare Pages 完整指南
published: 2025-11-12
pinned: false
description: 详细记录如何将基于 Astro 和 Firefly 主题的个人博客从本地开发到成功部署至 Cloudflare Pages 的完整流程，包括适配器配置、构建优化、GitHub Actions 自动化部署以及内容管理系统集成。
tags: [Astro, Cloudflare, 部署, CI/CD, Firefly, 博客]
category: 博客教程
draft: false
hideFromHome: true
---

## 📖 前言

在现代 Web 开发中，选择合适的部署平台对于博客的性能和用户体验至关重要。Cloudflare Pages 作为一个全球分布式边缘计算平台，提供了出色的性能、可靠性和免费的额度，非常适合部署静态网站和 JAMstack 应用。

本文将详细记录我如何将基于 **Astro 5.14.7** 和 **Firefly 主题**的个人博客从本地开发环境成功部署到 Cloudflare Pages 的全过程，包括遇到的问题和解决方案。

## 🎯 技术栈概览

在开始之前，先了解一下本博客项目使用的技术栈：

- **前端框架**: Astro 5.14.7
- **博客主题**: Firefly (基于 Fuwari)
- **UI 框架**: Tailwind CSS + Svelte 5.41.1
- **包管理器**: pnpm 9.14.4
- **部署平台**: Cloudflare Pages + Workers
- **CI/CD**: GitHub Actions
- **内容管理**: Decap CMS (原 Netlify CMS)
- **搜索功能**: Pagefind

## 🔧 项目配置详解

### 1. Cloudflare 适配器配置

首先需要安装并配置 Cloudflare 适配器，使 Astro 能够在 Cloudflare Workers 环境中运行。

**安装依赖：**

```bash
pnpm add @astrojs/cloudflare
```

**在 `astro.config.mjs` 中配置适配器：**

```javascript
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://blog-4qk.pages.dev/",
  base: "/",
  trailingSlash: "always",

  // 添加 Cloudflare 适配器
  adapter: cloudflare(),

  // 其他配置...
});
```

**关键配置说明：**

- `site`: 部署后的完整 URL，用于生成正确的 sitemap 和 RSS 链接
- `trailingSlash: "always"`: 确保所有 URL 都以斜杠结尾，避免重定向问题
- `adapter: cloudflare()`: 使用 Cloudflare 适配器，自动处理 SSR 和边缘函数

### 2. 构建配置优化

在 `package.json` 中配置构建脚本：

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build && pagefind --site dist && node scripts/fix-routes.js",
    "preview": "astro preview",
    "check": "astro check || true"
  }
}
```

**构建流程解析：**

1. `astro build`: 构建静态资源和边缘函数
2. `pagefind --site dist`: 为博客生成全文搜索索引
3. `node scripts/fix-routes.js`: 修复路由规则（如有需要）

### 3. Wrangler 配置（可选）

虽然 Cloudflare Pages 可以自动检测 Astro 项目，但创建 `wrangler.jsonc` 可以提供更细粒度的控制：

```jsonc
{
  "name": "blog",
  "compatibility_date": "2025-11-12",
  "pages_build_output_dir": "./dist"
}
```

## 🚀 部署流程

### 方式一：通过 Cloudflare Dashboard 手动部署

#### Step 1: 构建项目

在本地完成开发后，执行构建命令：

```bash
pnpm build
```

构建成功后会在项目根目录生成 `dist` 文件夹。

#### Step 2: 安装 Wrangler CLI

```bash
pnpm add -D wrangler
```

#### Step 3: 登录 Cloudflare

```bash
pnpm wrangler login
```

这会打开浏览器窗口，完成 OAuth 认证。

#### Step 4: 部署到 Cloudflare Pages

```bash
pnpm wrangler pages deploy dist --project-name=blog
```

首次部署会自动创建项目，后续部署会更新现有项目。

**部署成功输出示例：**

```
✨ Success! Uploaded 245 files (3.2 sec)
✨ Deployment complete! Take a peek over at https://blog-4qk.pages.dev
```

### 方式二：GitHub Actions 自动部署（推荐）

自动化部署能够在每次推送代码时自动触发构建和部署，大大提高效率。

#### Step 1: 创建 GitHub Actions 工作流

在项目根目录创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main  # 或者你的默认分支名称

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9.14.4

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: blog
          directory: dist
          gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

#### Step 2: 配置 GitHub Secrets

在 GitHub 仓库设置中添加以下 Secrets：

1. **获取 Cloudflare API Token**
   - 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
   - 点击 "Create Token"
   - 选择 "Edit Cloudflare Workers" 模板
   - 确保包含权限：`Account - Cloudflare Pages (Edit)`
   - 复制生成的 Token

2. **获取 Cloudflare Account ID**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 在右侧栏可以看到 "Account ID"
   - 复制该 ID

3. **在 GitHub 中配置**
   - 进入仓库 Settings → Secrets and variables → Actions
   - 添加两个 Repository secrets：
     - `CLOUDFLARE_API_TOKEN`: 粘贴 API Token
     - `CLOUDFLARE_ACCOUNT_ID`: 粘贴 Account ID

#### Step 3: 推送代码触发部署

```bash
git add .
git commit -m "feat: 配置 GitHub Actions 自动部署"
git push origin main
```

推送后，GitHub Actions 会自动触发构建和部署流程，你可以在仓库的 "Actions" 标签页查看部署进度。

## 🎨 内容管理系统集成

为了方便非技术用户编辑博客内容，我集成了 Decap CMS（原 Netlify CMS）。

### Decap CMS 配置

在 `public/admin/config.yml` 中配置：

```yaml
backend:
  name: github
  repo: johntime2005/blog
  branch: main
  base_url: https://blog-4qk.pages.dev
  auth_endpoint: /api/auth

media_folder: "public/assets/uploads"
public_folder: "/assets/uploads"

collections:
  - name: "posts"
    label: "博客文章"
    folder: "src/content/posts"
    create: true
    slug: "{{slug}}"
    fields:
      - {label: "标题", name: "title", widget: "string"}
      - {label: "发布日期", name: "published", widget: "datetime"}
      - {label: "描述", name: "description", widget: "text"}
      - {label: "标签", name: "tags", widget: "list"}
      - {label: "分类", name: "category", widget: "string"}
      - {label: "草稿", name: "draft", widget: "boolean", default: false}
      - {label: "正文", name: "body", widget: "markdown"}
```

### OAuth 认证处理

在 Cloudflare Pages Functions 中实现 GitHub OAuth：

**`functions/api/auth.ts`:**

```typescript
export async function onRequestGet(context) {
  const { searchParams } = new URL(context.request.url);
  const code = searchParams.get('code');

  if (!code) {
    return new Response('Missing code parameter', { status: 400 });
  }

  // 交换 access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: context.env.GITHUB_CLIENT_ID,
      client_secret: context.env.GITHUB_CLIENT_SECRET,
      code: code,
    }),
  });

  const data = await tokenResponse.json();

  // 返回 HTML 页面，通过 postMessage 将 token 发送回父窗口
  return new Response(`
    <!DOCTYPE html>
    <html>
      <head>
        <script>
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify(data)}',
            '*'
          );
          window.close();
        </script>
      </head>
      <body>认证成功，正在关闭窗口...</body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html' },
  });
}
```

**配置环境变量：**

在 Cloudflare Pages 项目设置中添加：
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

## 🐛 常见问题与解决方案

### 1. pnpm 版本冲突

**问题**：项目中 `package.json` 和 `pnpm-lock.yaml` 指定的 pnpm 版本不一致。

**解决方案**：

```bash
# 在 package.json 中统一指定版本
{
  "packageManager": "pnpm@9.14.4"
}
```

同时移除 `.npmrc` 或其他配置文件中的重复版本声明。

### 2. Biome 代码格式检查失败

**问题**：提交时代码格式不符合 Biome 规范。

**解决方案**：

```bash
# 自动修复格式问题
pnpm format

# 修复 lint 问题
pnpm lint
```

### 3. Cloudflare Pages 构建超时

**问题**：依赖安装或构建过程耗时过长。

**解决方案**：

- 使用 `pnpm install --frozen-lockfile` 避免重新解析依赖
- 在 GitHub Actions 中启用 pnpm 缓存
- 优化 `astro.config.mjs` 中的插件配置

### 4. CMS OAuth 认证失败

**问题**：Decap CMS 登录时无法完成 OAuth 流程。

**解决方案**：

- 确保 GitHub OAuth App 的回调 URL 配置正确
- 检查 `config.yml` 中的 `base_url` 和 `auth_endpoint` 路径
- 验证 Cloudflare Pages Functions 环境变量是否设置

## 📊 性能优化建议

### 1. 图片优化

使用 Astro 的图片组件自动优化：

```astro
---
import { Image } from 'astro:assets';
import coverImage from './cover.jpg';
---

<Image src={coverImage} alt="封面图" width={800} height={400} />
```

### 2. 代码分割

Astro 默认进行代码分割，但可以进一步优化：

```javascript
// astro.config.mjs
export default defineConfig({
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              return 'vendor';
            }
          }
        }
      }
    }
  }
});
```

### 3. 缓存策略

在 `_headers` 文件中配置 Cloudflare 缓存：

```
# public/_headers
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable
```

## 🔗 相关资源

- **博客地址**: https://blog-4qk.pages.dev
- **源码仓库**: https://github.com/johntime2005/blog
- **Astro 官方文档**: https://docs.astro.build
- **Cloudflare Pages 文档**: https://developers.cloudflare.com/pages
- **Firefly 主题**: https://github.com/CuteLeaf/Firefly
- **Decap CMS 文档**: https://decapcms.org/docs/

## 🎉 总结

通过本文的详细步骤，我们成功实现了：

✅ 将 Astro + Firefly 博客部署到 Cloudflare Pages
✅ 配置 GitHub Actions 实现 CI/CD 自动化
✅ 集成 Decap CMS 实现可视化内容管理
✅ 解决了部署过程中的各种常见问题

Cloudflare Pages 的全球 CDN、无限带宽和快速部署能力，让静态博客的性能达到了极致。配合 GitHub Actions 的自动化工作流，整个发布流程变得非常流畅。

如果你也在考虑将博客迁移到 Cloudflare Pages，希望这篇文章能够帮助到你！

---

**欢迎在评论区分享你的部署经验或遇到的问题！**

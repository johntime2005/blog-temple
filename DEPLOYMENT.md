# 部署说明

## 🎉 项目已完成初始化！

您的Firefly主题博客已经成功配置并部署到Cloudflare Pages！

### 📦 已完成的工作

1. ✅ 集成Firefly主题到本地项目
2. ✅ 配置Cloudflare Workers适配器
3. ✅ 安装所有依赖（1093个包）
4. ✅ 本地开发服务器测试通过
5. ✅ 项目构建成功
6. ✅ 首次部署到Cloudflare Pages
7. ✅ 创建GitHub Actions自动部署工作流

### 🌐 部署地址

**生产环境：** https://blog-4qk.pages.dev

### 📤 推送代码到GitHub

由于需要GitHub认证，请手动执行以下命令推送代码：

```bash
# 方式1：使用HTTPS（需要输入GitHub用户名和Personal Access Token）
git push -u origin master

# 方式2：使用SSH（推荐，需要配置SSH密钥）
git remote set-url origin git@github.com:johntime2005/blog.git
git push -u origin master
```

### 🔧 配置GitHub Actions自动部署

推送代码后，需要在GitHub仓库中配置以下Secrets：

1. 访问：https://github.com/johntime2005/blog/settings/secrets/actions
2. 添加以下Secrets：

   - **CLOUDFLARE_API_TOKEN**
     - 获取方式：https://dash.cloudflare.com/profile/api-tokens
     - 点击"Create Token" → 使用"Edit Cloudflare Workers"模板
     - 权限需要：Account - Cloudflare Pages (Edit)

   - **CLOUDFLARE_ACCOUNT_ID**
     - 获取方式：https://dash.cloudflare.com/
     - 在右侧可以看到"Account ID"
     - 当前账号ID：`9655863cf8bdb46771f8546d8aec9d40`

配置完成后，每次推送到master分支都会自动部署到Cloudflare Pages！

### 🚀 日常开发流程

#### 本地开发

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:4321
```

#### 构建测试

```bash
# 构建项目
pnpm build

# 预览构建结果
pnpm preview
```

#### 手动部署

```bash
# 部署到Cloudflare Pages
pnpm wrangler pages deploy dist --project-name=blog
```

### 📝 内容管理

博客文章位于 `src/content/posts/` 目录：

```bash
# 创建新文章
src/content/posts/my-new-post/
├── index.md          # 文章内容
└── cover.jpg         # 封面图（可选）
```

文章Front Matter格式：

```yaml
---
title: 文章标题
published: 2025-10-27
description: 文章描述
tags: [标签1, 标签2]
category: 分类
draft: false
---
```

### 🎨 主题配置

主要配置文件：

- `src/config.ts` - 网站基本信息、导航、社交链接等
- `astro.config.mjs` - Astro配置、插件、适配器
- `wrangler.jsonc` - Cloudflare Workers配置

### 🔗 重要链接

- **博客地址：** https://blog-4qk.pages.dev
- **GitHub仓库：** https://github.com/johntime2005/blog
- **Cloudflare Dashboard：** https://dash.cloudflare.com/
- **Firefly主题文档：** https://github.com/johntime2005/Firefly

### ⚙️ 技术栈

- **框架：** Astro 5.14.7
- **主题：** Firefly (基于Fuwari)
- **包管理：** pnpm 9.14.4
- **部署：** Cloudflare Pages + Workers
- **CI/CD：** GitHub Actions
- **搜索：** Pagefind

### 🆘 常见问题

**Q: 如何更新主题？**
A: 从Firefly仓库拉取最新代码，手动合并到您的项目中。

**Q: 如何自定义域名？**
A: 在Cloudflare Pages项目设置中添加自定义域名。

**Q: 构建失败怎么办？**
A: 检查 `.github/workflows/deploy.yml` 中的配置，确保Secrets正确设置。

**Q: 如何修改网站标题和描述？**
A: 编辑 `src/config.ts` 文件中的 `siteConfig` 部分。

---

## 🔐 私有内容管理（Git 子模块）

### 项目结构

本博客使用 **Git 子模块** 来管理私有日记内容：

- **主仓库（公开）**：`blog/` - 博客框架和公开文章
- **日记仓库（私有）**：`blog-diary-private/` - 个人日记内容

```
blog/ (公开仓库)
├── src/content/posts/
│   ├── tutorials/          # 公开文章
│   └── diary/              # 私有子模块 → blog-diary-private
```

### 隐私保护

- ✅ 主仓库可以安全地 fork 和公开分享
- ✅ 日记内容完全隔离在私有仓库中
- ✅ 日记设置为 `accessLevel: "members-only"`，需要登录才能访问
- ✅ Git 历史中不包含任何日记内容

### Cloudflare Pages 部署配置（子模块支持）

#### 1. 添加部署密钥（Deploy Key）

为了让 Cloudflare Pages 能够访问私有子模块：

**生成 SSH 密钥对**:
```bash
ssh-keygen -t ed25519 -C "cloudflare-deploy" -f ~/.ssh/id_ed25519_cloudflare
```

**添加公钥到私有仓库**:
1. 复制公钥：`cat ~/.ssh/id_ed25519_cloudflare.pub`
2. 在 GitHub 打开：`https://github.com/johntime2005/blog-diary-private`
3. 进入 **Settings** → **Deploy keys** → **Add deploy key**
4. 粘贴公钥，勾选 "Allow read access"

**添加私钥到 Cloudflare Pages**:
1. Cloudflare Dashboard → Pages → 项目 → **Settings** → **Environment variables**
2. 添加变量：
   - Name: `GIT_SSH_KEY`
   - Value: 私钥内容（`cat ~/.ssh/id_ed25519_cloudflare`）
   - Environment: Production and Preview

#### 2. 更新构建命令

**Build command**:
```bash
git submodule update --init --recursive && pnpm install && pnpm build
```

#### 3. 环境变量配置

| 变量名 | 说明 | 是否必需 |
|--------|------|---------|
| `ADMIN_PASSWORD` | 管理员登录密码 | ✅ 必需 |
| `GIT_SSH_KEY` | SSH 私钥（访问私有子模块） | ✅ 必需 |
| `POST_ENCRYPTION` | KV 命名空间绑定（存储用户数据） | ✅ 必需 |

### 本地开发（含子模块）

**首次克隆**:
```bash
git clone --recurse-submodules git@github.com:johntime2005/blog.git
```

**更新子模块**:
```bash
git submodule update --remote --merge
```

**更新日记内容**:
```bash
cd src/content/posts/diary
git add .
git commit -m "更新日记"
git push
```

---

## 🔑 用户认证系统

### 创建用户账号

1. 访问管理后台：`https://你的域名/admin/encryption`
2. 使用 `ADMIN_PASSWORD` 登录
3. 前往用户管理：`https://你的域名/admin/users`
4. 创建新用户（用户可以登录访问日记）

### 日记访问流程

1. 访客访问日记文章
2. 检测到 `accessLevel: "members-only"`
3. 重定向到登录页面：`/login`
4. 用户输入账号密码登录
5. 登录成功后返回文章页面查看内容

### API 端点

| 端点 | 说明 |
|------|------|
| `POST /api/auth/register` | 注册新用户（需管理员token） |
| `POST /api/auth/login` | 用户登录 |
| `POST /api/auth/logout` | 用户登出 |
| `POST /api/auth/verify` | 验证session |
| `GET /api/auth/current-user` | 获取当前用户信息 |

---

🎊 **恭喜！您的JAMstack博客已经成功搭建！**

# 管理后台部署配置指南

本文档介绍如何配置博客管理后台的完整功能，包括 GitHub API 文章管理和 KV 动态配置。

---

## 架构概览

管理后台采用 **A+B 组合方案**：

- **方案 A（GitHub API + Deploy Hook）**：文章的创建、编辑、删除通过 GitHub Contents API 直接操作仓库文件，修改后触发 Cloudflare Pages 重新构建
- **方案 B（Cloudflare KV 动态配置）**：公告、友链、个人资料、站点配置、导航栏、分类等配置存储在 KV 中，修改后即时生效，无需重新构建

---

## 前置条件

- Cloudflare Pages 项目已部署
- GitHub 仓库已关联
- Cloudflare 账户可访问 Dashboard

---

## 第一步：创建 KV 命名空间

如果你还没有 KV 命名空间，需要先创建一个：

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Workers & Pages → KV**
3. 点击 **Create a namespace**
4. 命名为 `POST_ENCRYPTION`（或任意名称）
5. 记下创建后的 **Namespace ID**

### 绑定到 Pages 项目

1. 进入你的 Pages 项目 → **Settings → Functions**
2. 找到 **KV namespace bindings**
3. 添加绑定：
   - **Variable name**: `POST_ENCRYPTION`
   - **KV namespace**: 选择你刚创建的命名空间

---

## 第二步：创建 GitHub Fine-grained PAT

管理后台通过 GitHub API 操作文章文件，需要一个具有写权限的 Token。

1. 打开 [GitHub Settings → Developer settings → Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
2. 配置如下：
   - **Token name**: `Blog Admin API`
   - **Expiration**: 建议 90 天（到期前记得续期）
   - **Repository access**: 选择 **Only select repositories** → 选择你的博客仓库
   - **Repository permissions**:
     - **Contents**: **Read and write** ✅
     - 其他权限保持默认（No access）
3. 点击 **Generate token**
4. **立即复制 Token**（页面关闭后无法再查看）

---

## 第三步：创建 Cloudflare Deploy Hook

Deploy Hook 允许管理后台在修改文章后触发自动重新构建。

1. 进入你的 Pages 项目 → **Settings → Builds & deployments**
2. 找到 **Deploy hooks** 部分
3. 点击 **Add deploy hook**
   - **Hook name**: `Admin Dashboard`
   - **Branch**: `main`（或你的主分支）
4. 复制生成的 **Hook URL**（格式类似 `https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/xxx`）

---

## 第四步：设置环境变量（Secrets）

⚠️ **以下三个值必须在 Cloudflare Dashboard 中设置，不要写在代码或 wrangler.toml 中！**

1. 进入你的 Pages 项目 → **Settings → Environment variables**
2. 在 **Production** 环境中添加以下变量（选择 **Encrypt** 加密）：

| 变量名 | 值 | 说明 |
|--------|---|------|
| `ADMIN_PASSWORD` | 你的管理员密码 | 登录管理后台的密码 |
| `GITHUB_PAT` | `github_pat_xxx...` | 第二步创建的 GitHub Token |
| `DEPLOY_HOOK_URL` | `https://api.cloudflare.com/...` | 第三步创建的 Deploy Hook URL |

---

## 第五步：设置环境变量（非敏感）

以下变量已在 `wrangler.toml` 中配置，也可以在 Dashboard 中覆盖：

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `GITHUB_OWNER` | `johntime2005` | GitHub 用户名 |
| `GITHUB_REPO` | `blog` | GitHub 仓库名 |
| `GITHUB_BRANCH` | `main` | GitHub 分支名 |

如果你 fork 了这个项目，请在 `wrangler.toml` 或 Dashboard 中修改这三个值。

---

## 第六步：部署并验证

1. 将代码推送到 GitHub，Cloudflare Pages 会自动构建
2. 构建完成后，访问 `https://你的域名/admin/dashboard.html`
3. 输入你设置的 `ADMIN_PASSWORD` 登录
4. 验证以下功能：
   - ✅ 登录成功
   - ✅ 可以获取/创建/编辑/删除文章
   - ✅ 可以修改公告（修改后刷新博客首页即可看到变化）
   - ✅ 可以管理友链、个人资料、站点配置等
   - ✅ 触发部署按钮正常工作

---

## API 端点参考

### 认证

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/admin/login` | POST | 管理员登录，返回 token |

### 文章管理（通过 GitHub API）

| 端点 | 方法 | 操作 | 说明 |
|------|------|------|------|
| `/api/admin/posts` | POST | `list` | 列出文章（需前端传入数据） |
| `/api/admin/posts` | POST | `get` | 获取单篇文章内容 |
| `/api/admin/posts` | POST | `create` | 创建新文章 |
| `/api/admin/posts` | POST | `update` | 更新文章 |
| `/api/admin/posts` | POST | `delete` | 删除文章 |
| `/api/admin/posts` | POST | `update-frontmatter` | 仅更新 frontmatter |
| `/api/admin/posts` | POST | `batch-update` | 批量更新 |
| `/api/admin/deploy` | POST | — | 触发 Cloudflare 重新构建 |

### KV 动态配置（即时生效）

| 端点 | 方法 | 操作 | 说明 |
|------|------|------|------|
| `/api/admin/announcement` | POST | `get/update/reset` | 公告管理 |
| `/api/admin/friends` | POST | `get/update/add/remove/reorder/reset` | 友链管理 |
| `/api/admin/profile` | POST | `get/update/reset` | 个人资料管理 |
| `/api/admin/site-config` | POST | `get/update/reset` | 站点配置管理 |
| `/api/admin/navbar` | POST | `get/update` | 导航栏管理 |
| `/api/admin/categories` | POST | `list/create/update/delete/reorder` | 分类管理 |

### 公开读取 API（无需认证）

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/config/announcement` | GET | 读取公告配置 |
| `/api/config/friends` | GET | 读取友链配置 |
| `/api/config/profile` | GET | 读取个人资料 |
| `/api/config/site-config` | GET | 读取站点配置 |
| `/api/config/navbar` | GET | 读取导航栏配置 |
| `/api/config/categories` | GET | 读取分类配置 |

---

## 文件清单

### 新增文件

```
functions/
├── _lib/
│   ├── github.ts          # GitHub Contents API 封装
│   ├── auth.ts            # 管理员认证工具
│   ├── response.ts        # HTTP 响应工具
│   └── env.ts             # 环境类型 + KV 键常量
├── api/
│   ├── admin/
│   │   ├── _middleware.ts  # CORS + 全局错误处理
│   │   ├── login.ts       # 管理员登录
│   │   ├── posts.ts       # 文章 CRUD（GitHub API）
│   │   ├── deploy.ts      # 触发部署
│   │   ├── announcement.ts # 公告 KV 管理
│   │   ├── friends.ts     # 友链 KV 管理
│   │   ├── profile.ts     # 个人资料 KV 管理
│   │   ├── site-config.ts # 站点配置 KV 管理
│   │   ├── navbar.ts      # 导航栏 KV 管理
│   │   └── categories.ts  # 分类 KV 管理
│   └── config/
│       └── [name].ts      # 公开配置读取 API
├── tsconfig.json          # Functions 专用 TS 配置
src/utils/
└── dynamic-config.ts      # 客户端动态配置加载器

public/admin/
└── dashboard.html         # 管理后台 SPA
```

### 修改的文件

```
wrangler.toml                             # 添加 GitHub 环境变量
src/components/widget/Announcement.astro  # 添加 KV 动态加载脚本
package.json                              # 添加 @cloudflare/workers-types
```

---

## 常见问题

### Q: 修改公告后需要重新构建吗？

**不需要。** 公告通过 KV 存储，前端页面加载时自动从 `/api/config/announcement` 获取最新数据覆盖静态内容。

### Q: 创建文章后多久能看到？

创建文章后需要触发部署（可以在创建时勾选"同时触发部署"），Cloudflare Pages 构建通常需要 1-2 分钟。

### Q: GitHub PAT 过期了怎么办？

重新生成一个新 Token，然后在 Cloudflare Dashboard 更新 `GITHUB_PAT` 环境变量即可，不需要重新部署。

### Q: 忘记管理员密码怎么办？

在 Cloudflare Dashboard 中修改 `ADMIN_PASSWORD` 环境变量即可，修改后立即生效。

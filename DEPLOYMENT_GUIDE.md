# 🚀 部署指南

> **使用 GitHub Actions + Wrangler 自动部署到 Cloudflare Pages**

---

## 📋 部署架构

```
代码推送 → GitHub Actions → Wrangler 构建 → Cloudflare Pages
```

**核心配置文件：**
- `wrangler.toml` - KV 绑定和项目配置
- `.github/workflows/deploy.yml` - 自动化部署流程

---

## ⚡ 快速部署（3 步完成）

### 第 1 步：配置 GitHub Secrets

进入 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

添加以下 Secrets：

| Secret 名称 | 说明 | 获取方式 |
|------------|------|---------|
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID | Dashboard 右侧边栏 |
| `CLOUDFLARE_API_TOKEN` | API 令牌 | [创建 API Token](#创建-api-token) |

### 第 2 步：配置 Cloudflare 环境变量

进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → 选择你的项目 → **Settings** → **Environment variables**

添加以下变量：

| 变量名 | 说明 | 环境 |
|-------|------|------|
| `ADMIN_PASSWORD` | 管理后台登录密码 | Production |

> ⚠️ **重要**：敏感信息必须在 Dashboard 中配置，不要写在代码中！

### 第 3 步：推送代码触发部署

```bash
git add .
git commit -m "feat: 配置部署"
git push origin main
```

推送后，GitHub Actions 会自动构建并部署到 Cloudflare Pages。

---

## 🔧 详细配置说明

### 创建 API Token

1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. 配置权限：
   - **Account** → Cloudflare Pages: Edit
   - **Account** → Workers KV Storage: Edit
   - **Zone** → Zone: Read（可选，如果需要自定义域名）
5. 设置 **Account Resources**: 选择你的账号
6. 点击 **Continue to summary** → **Create Token**
7. 复制 Token（只显示一次！）

### KV 命名空间

KV 绑定已在 `wrangler.toml` 中配置：

```toml
[[kv_namespaces]]
binding = "POST_ENCRYPTION"
id = "6d96dd6d603049cba7e123dc7691331e"
```

**注意**：由于使用 wrangler.toml 管理，无法在 Dashboard 中手动修改 KV 绑定。如需修改，请编辑 wrangler.toml 文件。

### 自定义域名（可选）

1. 在 Cloudflare Dashboard 中选择项目
2. 进入 **Custom domains**
3. 点击 **Set up a custom domain**
4. 输入你的域名并按提示配置 DNS

---

## 📂 配置文件说明

### wrangler.toml

```toml
name = "blog"
compatibility_date = "2025-11-18"

# KV 命名空间绑定（用于文章加密）
[[kv_namespaces]]
binding = "POST_ENCRYPTION"
id = "your-kv-namespace-id"

# 环境变量（非敏感）
[vars]
# 敏感变量（如 ADMIN_PASSWORD）应在 Dashboard 配置
```

### .github/workflows/deploy.yml

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - name: Deploy
        run: npx wrangler pages deploy dist --project-name=blog
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
```

---

## ✅ 验证部署

### 1. 检查 GitHub Actions

进入 GitHub 仓库 → **Actions** → 查看最新的 workflow 运行状态

成功状态：✅ 绿色勾号

### 2. 访问网站

- **主页**：`https://your-project.pages.dev/`
- **管理后台**：`https://your-project.pages.dev/admin/encryption`

### 3. 测试管理后台

1. 访问 `/admin/encryption`
2. 输入你配置的 `ADMIN_PASSWORD`
3. 应该能看到文章列表

---

## 🔍 故障排查

### 部署失败：Authentication error

**原因**：`CLOUDFLARE_API_TOKEN` 无效或权限不足

**解决**：
1. 检查 Token 是否正确复制
2. 确保 Token 有 Cloudflare Pages 和 KV Storage 的 Edit 权限
3. 检查 Token 是否过期

### 部署失败：Project not found

**原因**：项目名称不匹配

**解决**：
1. 确保 `wrangler.toml` 中的 `name` 与 Cloudflare Pages 项目名称一致
2. 首次部署会自动创建项目，无需手动创建

### 管理后台登录失败

**原因**：`ADMIN_PASSWORD` 未配置

**解决**：
1. 在 Cloudflare Dashboard → Settings → Environment variables 中配置
2. 确保选择了正确的环境（Production）
3. 配置后需要重新部署才能生效

### KV 绑定错误

**原因**：KV 命名空间 ID 不正确

**解决**：
1. 在 Cloudflare Dashboard → Workers & Pages → KV 中确认命名空间 ID
2. 更新 `wrangler.toml` 中的 `id` 字段
3. 提交并重新部署

---

## 📚 相关文档

- [管理后台使用指南](./ADMIN_DASHBOARD_GUIDE.md)
- [加密功能指南](./ENCRYPTION_GUIDE.md)
- [密码管理指南](./PASSWORD_MANAGEMENT_GUIDE.md)

---

## 🔄 更新部署

每次推送到 `main` 分支都会自动触发部署。也可以在 GitHub Actions 页面手动触发：

1. 进入 **Actions** → **Deploy to Cloudflare Pages**
2. 点击 **Run workflow**
3. 选择分支并确认

---

**祝部署顺利！** 🎉

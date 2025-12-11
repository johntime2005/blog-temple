# Decap CMS OAuth 配置指南

本文档说明如何为 Cloudflare Pages 上的 Decap CMS 配置 GitHub OAuth 认证。

## 📋 前置要求

- GitHub 账号（有仓库访问权限）
- Cloudflare Pages 项目已部署
- 博客域名：https://blog.johntime.top

## 🔧 配置步骤

### 步骤 1：创建 GitHub OAuth App

1. 访问 GitHub Developer Settings:
   ```
   https://github.com/settings/developers
   ```

2. 点击 **"OAuth Apps"** → **"New OAuth App"**

3. 填写应用信息：
   ```
   Application name: Blog CMS (或任意名称)
   Homepage URL: https://blog.johntime.top
   Authorization callback URL: https://blog.johntime.top/auth/callback
   ```

4. 点击 **"Register application"**

5. 在应用页面：
   - 复制 **Client ID**（类似：`Iv1.1234567890abcdef`）
   - 点击 **"Generate a new client secret"**
   - 复制生成的 **Client Secret**（类似：`abcdef1234567890abcdef1234567890abcdef12`）

   ⚠️ **重要**：Client Secret 只显示一次，请立即保存！

### 步骤 2：在 Cloudflare Pages 配置环境变量

1. 访问 Cloudflare Pages 控制台:
   ```
   https://dash.cloudflare.com/
   ```

2. 选择你的 Pages 项目：**blog**

3. 进入 **Settings** → **Environment variables**

4. 添加两个环境变量：

   **生产环境（Production）：**
   ```
   Variable name: GITHUB_CLIENT_ID
   Value: [粘贴你的 GitHub Client ID]

   Variable name: GITHUB_CLIENT_SECRET
   Value: [粘贴你的 GitHub Client Secret]
   ```

   **预览环境（Preview - 可选）：**
   - 同样添加上述两个变量

5. 点击 **"Save"**

### 步骤 3：等待部署完成

- Cloudflare Pages 会自动检测到 GitHub 推送
- 或者手动触发重新部署
- 部署时间约 2-3 分钟

### 步骤 4：测试 CMS 登录

1. 访问 CMS 后台：
   ```
   https://blog.johntime.top/admin
   ```

2. 点击 **"Login with GitHub"**

3. 会跳转到 GitHub 授权页面

4. 授权后会自动跳回 CMS 后台

5. 现在可以开始使用 CMS 管理文章了！

## 🔍 故障排查

### 问题 1：点击登录后显示 "Not Found"

**原因**：环境变量未配置或部署未完成

**解决方案**：
- 检查 Cloudflare Pages 环境变量是否正确配置
- 等待部署完成后再试
- 清除浏览器缓存

### 问题 2：授权后无法跳回

**原因**：Callback URL 配置错误

**解决方案**：
- 检查 GitHub OAuth App 的 Callback URL 是否为：
  ```
  https://blog.johntime.top/auth/callback
  ```

### 问题 3：显示 "GitHub OAuth not configured"

**原因**：环境变量未生效

**解决方案**：
- 在 Cloudflare Pages 中重新部署项目
- 检查环境变量名称是否完全匹配（区分大小写）

## 📚 相关链接

- [Decap CMS 文档](https://decapcms.org/docs/)
- [GitHub OAuth Apps 文档](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [Cloudflare Pages Functions 文档](https://developers.cloudflare.com/pages/functions/)

## 🎉 完成

配置完成后，你就可以使用 Decap CMS 来管理博客文章了！

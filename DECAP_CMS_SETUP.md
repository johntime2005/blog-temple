# Decap CMS 设置指南

## 🎉 已完成的配置

✅ **步骤1：安装Decap CMS** - 已完成
- ✅ 创建 `public/admin/index.html` - CMS管理界面
- ✅ 创建 `public/admin/config.yml` - CMS配置文件

---

## 🔑 步骤2：配置GitHub OAuth App（必需）

### 为什么需要OAuth？

Decap CMS需要GitHub OAuth来：
1. 验证您的身份
2. 授权CMS读写GitHub仓库
3. 提交新文章和修改到GitHub

### 配置步骤（10分钟）

#### 1. 创建GitHub OAuth App

访问：https://github.com/settings/developers

点击 **"New OAuth App"** 按钮

#### 2. 填写应用信息

```
Application name: Blog CMS
Homepage URL: https://blog-4qk.pages.dev
Authorization callback URL: https://blog-4qk.pages.dev/auth/callback
```

**重要：** Authorization callback URL 必须是 `https://你的域名/auth/callback`，**不能**是 `https://api.github.com/user`。
如果您使用的是自定义域名（如 `blog.johntime.top`），请将其替换为您的实际域名：`https://blog.johntime.top/auth/callback`。

#### 3. 获取凭证

创建后，您会看到：
- **Client ID**: 类似 `Ov23lixxxxxxxxxx`
- **Client Secret**: 点击 "Generate a new client secret" 生成

**⚠️ 重要：** 立即复制保存 Client Secret，它只显示一次！

#### 4. 配置Cloudflare Pages环境变量

方式A：通过Cloudflare Dashboard（推荐）

1. 访问：https://dash.cloudflare.com/
2. 选择您的账户 → Pages → blog 项目
3. 进入 **Settings** → **Environment variables**
4. 添加以下两个变量（Production 和 Preview 都要添加）：

```
变量名: GITHUB_CLIENT_ID
值: 您的Client ID

变量名: GITHUB_CLIENT_SECRET  
值: 您的Client Secret
```

方式B：使用Wrangler CLI

```bash
# 设置环境变量
wrangler pages secret put GITHUB_CLIENT_ID
# 输入您的Client ID

wrangler pages secret put GITHUB_CLIENT_SECRET
# 输入您的Client Secret
```

#### 5. 重新部署

环境变量配置后，需要重新部署：

```bash
# 方式1：通过Git推送触发自动部署
git push origin master

# 方式2：手动部署
pnpm wrangler pages deploy dist --project-name=blog
```

---

## 🚀 步骤3：开始使用

### 访问CMS后台

部署完成后，访问：

```
https://blog-4qk.pages.dev/admin
```

### 首次登录

1. 点击 **"Login with GitHub"**
2. 授权应用访问您的GitHub账户
3. 授权成功后自动跳转到CMS后台

### CMS功能说明

#### 📝 内容面板

- **博客文章**：创建、编辑、删除博客文章
  - 标题、日期、标签、分类
  - Markdown富文本编辑器
  - 封面图上传
  - 草稿/发布状态

- **独立页面**：编辑关于页面等静态内容

- **网站设置**：修改站点配置

#### 🔄 工作流程

Decap CMS使用 **Editorial Workflow**（编辑工作流）：

1. **Draft（草稿）**
   - 新创建的内容默认为草稿
   - 在独立的Git分支上工作
   - 可以随时保存和修改

2. **In Review（审核中）**
   - 草稿完成后点击"Set status → In review"
   - 创建GitHub Pull Request

3. **Ready（准备发布）**
   - 审核通过后点击"Set status → Ready"
   - 等待最终发布

4. **Published（已发布）**
   - 点击"Publish"发布内容
   - 合并PR到master分支
   - 自动触发Cloudflare部署

#### 🖼️ 媒体库

点击顶部的 **"Media"** 按钮：
- 上传图片到 `public/assets/images/`
- 浏览和管理所有媒体文件
- 在文章中插入图片

---

## 🔧 高级配置

### 本地开发模式

如果想在本地调试CMS：

```bash
# 1. 安装Decap Server
npm install -g decap-server

# 2. 启动本地服务
npx decap-server

# 3. 在config.yml中启用本地模式
# 取消注释: local_backend: true

# 4. 启动Astro
pnpm dev

# 5. 访问 http://localhost:4321/admin
```

### 自定义CMS配置

编辑 `public/admin/config.yml`：

```yaml
# 添加新的内容类型
collections:
  - name: "projects"
    label: "项目展示"
    folder: "src/content/projects"
    create: true
    fields:
      - {label: "项目名称", name: "title", widget: "string"}
      - {label: "描述", name: "description", widget: "text"}
      - {label: "链接", name: "url", widget: "string"}
      - {label: "截图", name: "screenshot", widget: "image"}
```

### 自定义编辑器预览

创建 `public/admin/preview.js` 自定义预览样式：

```javascript
CMS.registerPreviewStyle("/styles/editor-preview.css");
```

---

## 🐛 常见问题排查

### 问题1：点击"Login with GitHub"没反应

**原因：** OAuth App配置错误

**解决：**
1. 检查GitHub OAuth App的Callback URL是否为 `https://你的域名/auth/callback`
2. 确认环境变量已正确设置
3. 重新部署网站

### 问题2：登录后看到"Error loading"

**原因：** config.yml配置错误或仓库权限不足

**解决：**
1. 检查 `public/admin/config.yml` 中的 `repo` 是否正确
2. 确认您的GitHub账号对该仓库有写权限
3. 在浏览器控制台查看具体错误信息

### 问题3：无法上传图片

**原因：** 媒体文件夹配置错误

**解决：**
1. 确认 `media_folder: "public/assets/images"` 路径存在
2. 检查GitHub权限是否允许提交文件
3. 尝试手动创建 `public/assets/images/` 目录

### 问题4：发布后内容没更新

**原因：** Cloudflare缓存或部署未触发

**解决：**
1. 检查GitHub Actions是否成功运行
2. 在Cloudflare Pages中手动触发重新部署
3. 清除浏览器缓存

---

## 📚 参考资源

- **Decap CMS官方文档**: https://decapcms.org/docs/
- **配置选项参考**: https://decapcms.org/docs/configuration-options/
- **Widget类型**: https://decapcms.org/docs/widgets/
- **GitHub OAuth设置**: https://github.com/settings/developers

---

## ✅ 验证清单

完成以下步骤后，您的CMS就可以使用了：

- [ ] GitHub OAuth App已创建
- [ ] Client ID和Secret已获取
- [ ] Cloudflare环境变量已配置
- [ ] 代码已推送到GitHub
- [ ] 网站已重新部署
- [ ] 可以访问 `/admin` 页面
- [ ] 可以成功登录GitHub
- [ ] 可以看到文章列表
- [ ] 可以创建新文章
- [ ] 可以上传图片

全部完成后，恭喜您拥有了WordPress式的博客管理后台！🎉

---

## 🆘 需要帮助？

如果遇到问题，请：
1. 检查浏览器控制台的错误信息
2. 查看GitHub Actions的构建日志
3. 参考Decap CMS官方文档
4. 在GitHub Issue中搜索相似问题

准备好配置GitHub OAuth了吗？

# 🚀 Decap CMS 快速开始指南

## ✅ 已完成的工作

您的博客已经集成了Decap CMS后台管理系统！

- ✅ CMS界面：`/admin` 路径
- ✅ 富文本编辑器
- ✅ 媒体库管理
- ✅ 草稿/发布工作流
- ✅ GitHub版本控制

---

## 🎯 两种使用方式

### 方式1：直接使用GitHub认证（推荐，最简单）

#### 第1步：推送代码

```bash
# 推送到GitHub
git push origin master
```

#### 第2步：访问CMS

打开浏览器访问：
```
https://blog-4qk.pages.dev/admin
```

#### 第3步：登录GitHub

1. 点击 **"Login with GitHub"**
2. 使用GitHub账号授权
3. 完成！开始管理您的博客

**注意：** 您必须是blog仓库的owner或collaborator才能登录。

---

### 方式2：使用Personal Access Token（本地测试）

如果暂时无法推送代码，可以先本地测试：

#### 第1步：生成GitHub Token

1. 访问：https://github.com/settings/tokens/new
2. Note: `Blog CMS Local`
3. Expiration: 30 days
4. Select scopes: 勾选 **`repo`** (Full control of private repositories)
5. 点击 **"Generate token"**
6. **立即复制**保存token（只显示一次！）

#### 第2步：本地测试

```bash
# 启动开发服务器
pnpm dev

# 访问 http://localhost:4321/admin
```

#### 第3步：使用Token登录

1. 在CMS登录界面
2. 如果看到token输入框，粘贴您的token
3. 如果没有token输入框，点击GitHub登录即可

---

## 📝 如何使用CMS

### 创建新文章

1. 登录CMS后台
2. 点击 **"博客文章"**
3. 点击右上角 **"New 博客文章"**
4. 填写文章信息：
   - 标题
   - 发布日期
   - 标签（可添加多个）
   - 分类
   - 简介
   - 正文（Markdown编辑器）
5. 点击 **"Save"** 保存草稿

### 发布文章

使用Editorial Workflow:

1. **Draft**: 新建文章自动保存为草稿
2. **In Review**: 草稿完成后，点击"Set status" → "In review"
3. **Ready**: 审核通过后，点击"Set status" → "Ready"
4. **Publish**: 点击"Publish"正式发布
   - 自动提交到GitHub
   - 触发Cloudflare自动部署
   - 几分钟后在线上看到新文章

### 上传图片

1. 点击顶部的 **"Media"**
2. 点击 **"Upload"** 上传图片
3. 图片自动保存到 `public/assets/images/`
4. 在文章中插入图片：
   - 点击编辑器工具栏的图片按钮
   - 选择已上传的图片
   - 或输入图片URL

### 编辑现有文章

1. 在"博客文章"列表中
2. 点击文章标题
3. 编辑内容
4. 保存并发布

---

## 🎨 CMS功能说明

### 字段说明

| 字段 | 说明 | 必填 |
|------|------|------|
| 标题 | 文章标题 | ✅ |
| 发布日期 | 显示的发布日期（格式：YYYY-MM-DD） | ✅ |
| 置顶 | 是否在首页置顶显示 | ❌ |
| 简介 | 文章摘要，显示在列表页 | ✅ |
| 标签 | 文章标签，可添加多个 | ✅ |
| 分类 | 文章分类 | ✅ |
| 草稿 | 是否为草稿（草稿不会显示在网站上） | ✅ |
| 封面图 | 可选的文章封面图片 | ❌ |
| 正文 | 文章主要内容，使用Markdown格式 | ✅ |

### Markdown编辑器

支持所有常用Markdown语法：

```markdown
# 一级标题
## 二级标题

**粗体** *斜体*

- 列表项1
- 列表项2

[链接文字](URL)

![图片](图片URL)

> 引用文本

`行内代码`

```代码块```
``````

### 工作流状态

- **Drafts（草稿箱）**: 未完成的文章
- **In Review（审核中）**: 等待审核的文章（创建PR）
- **Ready（准备发布）**: 审核通过，准备发布
- **Published（已发布）**: 已发布到线上

---

## 🐛 常见问题

### Q: 登录后看到"Error loading entries"

**A:** 检查以下几点：
1. 您是否有blog仓库的写权限？
2. `public/admin/config.yml`中的`repo`配置是否正确？
3. 浏览器控制台有什么错误信息？

### Q: 无法上传图片

**A:** 确保：
1. 您已登录并有写权限
2. `public/assets/images/`目录存在
3. 图片大小不超过GitHub限制（建议<1MB）

### Q: 文章发布后没有出现在网站上

**A:** 可能的原因：
1. 文章`draft`字段设为`true`（草稿状态）
2. Cloudflare部署未完成（等待1-2分钟）
3. 浏览器缓存（强制刷新 Ctrl+F5）

### Q: 想要本地编辑而不是使用CMS

**A:** 完全可以！
- CMS和本地编辑可以混合使用
- 直接编辑 `src/content/posts/` 下的Markdown文件
- Git push后自动同步到CMS

---

## 📚 了解更多

详细文档请查看：
- `CMS_SOLUTIONS.md` - CMS方案对比
- `DECAP_CMS_SETUP.md` - 详细配置说明
- https://decapcms.org/docs/ - Decap CMS官方文档

---

## 🎉 开始创作吧！

现在您的博客已经有了WordPress式的后台管理，可以：

✅ 随时随地通过浏览器写文章  
✅ 可视化编辑，所见即所得  
✅ 管理图片和媒体文件  
✅ 草稿/发布工作流管理  
✅ 所有内容在GitHub版本控制  
✅ 完全免费，无任何限制  

**下一步：推送代码到GitHub，然后访问 `/admin` 开始使用！**

```bash
git push origin master
```

祝您创作愉快！📝✨

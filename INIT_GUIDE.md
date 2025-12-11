# Firefly 博客初始化指南

## 🚀 快速开始

当你首次通过一键部署按钮部署到 Cloudflare Pages 后，会自动进入Web界面的初始化向导。

### Web 界面初始化（推荐）

部署完成后，**首次访问你的博客网站**，会自动跳转到初始化设置向导页面 (`/setup/`)。

#### 向导流程

**步骤 1：填写网站基本信息**
- 网站 URL：你的博客地址（如 `https://your-blog.pages.dev/`）
- 网站标题：显示在浏览器标签和首页的标题
- 网站副标题：显示在首页的副标题
- 网站描述：用于 SEO 的网站描述
- 关键词：SEO 关键词（可选）

**步骤 2：填写个人资料**
- 你的名字/昵称：显示在个人资料卡片
- 个人简介：一句话介绍自己
- GitHub 用户名（可选）
- Bilibili UID（可选）
- Bangumi 用户 ID（可选，用于追番页）

**步骤 3：选择主题配置**
- 主题色色相：0-360 之间的数字
  - 0：红色系
  - 155：绿色系（默认）
  - 200：蓝色系
  - 240：深蓝色系
  - 345：粉色系
- 实时预览主题色效果

#### 完成配置

1. **点击"生成配置文件"按钮**
   - 会自动下载一个 `firefly-config.zip` 文件

2. **解压配置文件**
   ```bash
   unzip firefly-config.zip
   ```

3. **克隆你的 GitHub 仓库**（如果还没有）
   ```bash
   git clone https://github.com/你的用户名/你的仓库.git
   cd 你的仓库
   ```

4. **复制配置文件到对应位置**
   ```bash
   # 复制网站配置
   cp firefly-config/src/config/siteConfig.ts src/config/

   # 复制个人资料配置
   cp firefly-config/src/config/profileConfig.ts src/config/

   # 复制 Astro 配置
   cp firefly-config/astro.config.mjs .

   # 复制 robots.txt
   cp firefly-config/public/robots.txt public/
   ```

5. **提交到 GitHub**
   ```bash
   git add .
   git commit -m "chore: 完成初始化配置"
   git push
   ```

6. **等待自动部署**
   - Cloudflare Pages 会自动检测到提交并重新部署
   - 大约 2-5 分钟后，你的个性化博客就上线了！

### 方法 2：手动配置（高级用户）

如果你更喜欢手动配置，可以按照以下步骤：

#### 1. 配置网站 URL

编辑 `astro.config.mjs`：

```javascript
export default defineConfig({
  site: "https://你的域名.com/",  // 修改这里
  // ...
});
```

#### 2. 配置站点信息

编辑 `src/config/siteConfig.ts`：

```typescript
export const siteConfig: SiteConfig = {
  title: "你的博客名称",
  subtitle: "你的副标题",
  description: "你的博客描述",
  keywords: ["你的", "关键词", "列表"],

  // 主题色配置
  themeColor: {
    hue: 155,  // 修改色相
    // ...
  },

  // Bangumi 配置（如果使用追番页）
  bangumi: {
    userId: "你的BangumiID",
  },
  // ...
};
```

#### 3. 配置个人资料

编辑 `src/config/profileConfig.ts`：

```typescript
export const profileConfig: ProfileConfig = {
  avatar: "/assets/images/avatar.webp",  // 替换为你的头像
  name: "你的名字",
  bio: "你的个人简介",
  links: [
    {
      name: "GitHub",
      icon: "fa6-brands:github",
      url: "https://github.com/你的用户名",
    },
    {
      name: "Bilibili",
      icon: "fa6-brands:bilibili",
      url: "https://space.bilibili.com/你的UID",
    },
    // 可以添加更多社交链接
  ],
};
```

#### 4. 生成 robots.txt

在 `public/` 目录下创建 `robots.txt`：

```txt
# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Sitemap: https://你的域名.com/sitemap-index.xml
```

## 📝 其他个性化配置

### 更换图片资源

替换 `public/assets/images/` 目录下的文件：

- `avatar.webp`：你的头像图片
- `favicon.ico`：网站图标
- `LiuYingPure3.svg`：网站 Logo（或使用你自己的）
- `d1.webp`：桌面背景图
- `m1.webp`：移动背景图

### 配置导航栏

编辑 `src/config/navBarConfig.ts`：

```typescript
export const navBarConfig: NavBarConfig = {
  links: [
    { name: "首页", url: "/" },
    { name: "归档", url: "/archive" },
    { name: "友链", url: "/friends" },
    // 添加更多菜单项
  ],
};
```

### 配置评论系统

如果要启用 Twikoo 评论，编辑 `src/config/commentConfig.ts`：

```typescript
export const commentConfig: CommentConfig = {
  enable: true,
  type: 'twikoo',
  envId: '你的Twikoo环境ID',  // 从 Twikoo 控制台获取
};
```

### 禁用不需要的页面

编辑 `src/config/siteConfig.ts`：

```typescript
pages: {
  anime: true,      // 追番页面
  projects: true,   // 项目页面
  timeline: true,   // 时间线页面
  skills: true      // 技能页面
}
```

将不需要的页面设为 `false`。

### 配置看板娘

如果不需要看板娘，编辑 `src/config/pioConfig.ts`：

```typescript
export const spineModelConfig: ModelConfig = {
  enable: false,  // 禁用 Spine 看板娘
};

export const live2dModelConfig: ModelConfig = {
  enable: false,  // 禁用 Live2D 看板娘
};
```

## 🚀 部署到 Cloudflare Pages

### 1. 通过 GitHub 自动部署

1. 将代码推送到 GitHub 仓库
2. 访问 [Cloudflare Pages](https://pages.cloudflare.com/)
3. 连接你的 GitHub 仓库
4. 配置构建设置：
   - **构建命令**：`pnpm build`
   - **构建输出目录**：`dist`
   - **Node 版本**：18 或以上

### 2. 一键部署按钮

在你的 GitHub 仓库 README 中添加部署按钮：

```markdown
[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/你的用户名/你的仓库)
```

### 3. 配置自定义域名

在 Cloudflare Pages 项目设置中：
1. 进入"自定义域"标签
2. 添加你的域名
3. 按照提示配置 DNS

## 🛠️ 开发流程

```bash
# 安装依赖
pnpm install

# 运行初始化脚本（首次配置）
pnpm init

# 启动开发服务器
pnpm dev

# 创建新文章
pnpm new-post 文章标题

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

## 📚 更多文档

- [项目架构文档](./CLAUDE.md)
- [部署指南](./src/content/posts/tutorials/cloudflare-pages-deployment-guide.md)
- [配置说明](./src/config/CLAUDE.md)

## ❓ 常见问题

### Q: 如何重新运行初始化向导？

A: 有两种方法：

**方法 1：修改配置文件**
```typescript
// 编辑 src/config/siteConfig.ts
export const siteConfig: SiteConfig = {
  initialized: false,  // 改为 false
  // ...
};
```
保存后重新访问网站，会自动跳转到向导页面。

**方法 2：直接访问向导页面**
直接访问 `https://你的域名.com/setup/` 即可重新进入向导。

### Q: 部署后网站样式异常？

A: 确保 `astro.config.mjs` 中的 `site` 配置正确，URL 应该以 `/` 结尾。

### Q: RSS 订阅地址在哪里？

A: 部署后访问 `https://你的域名.com/rss.xml`

### Q: 初始化向导会影响已有内容吗？

A: 不会。初始化向导只修改配置文件，不会影响你的文章内容和其他数据。

## 💡 提示

1. **Git 管理**：建议使用 Git 管理配置文件，方便回滚和版本控制
2. **图片优化**：使用 WebP 格式可以大幅减小图片体积
3. **SEO 优化**：填写完整的网站描述和关键词，有助于搜索引擎收录
4. **定期备份**：定期备份 `src/content/posts/` 目录下的文章

## 🎉 开始创作

完成初始化后，你可以：

1. 在 `src/content/posts/` 目录下创建你的第一篇文章
2. 运行 `pnpm dev` 预览效果
3. 运行 `pnpm build` 构建并部署

祝你创作愉快！✨

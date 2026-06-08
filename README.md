<img src="./docs/images/1131.png" width = "405" height = "511" alt="Firefly" align=right />

<div align="center">

# johntime 的个人博客

> 基于 [Firefly](https://github.com/CuteLeaf/Firefly) 主题的个性化博客
>
> ![Node.js >= 20](https://img.shields.io/badge/node.js-%3E%3D20-brightgreen)
![pnpm >= 9](https://img.shields.io/badge/pnpm-%3E%3D9-blue)
![Astro](https://img.shields.io/badge/Astro-6.4.4-orange)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.2-blue)

**✨ 主题来源**: [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly) - 一款清新美观的 Astro 博客主题模板
</div>
---

[**🌐 我的博客**](https://blog.johntime.top) &emsp;
[**🖥️ 主题在线预览**](https://demo-firefly.netlify.app/) &emsp;
[**📝 主题使用文档**](https://docs-firefly.cuteleaf.cn/) &emsp;
[**⭐ Firefly 主题仓库**](https://github.com/CuteLeaf/Firefly)

⚡ 静态站点生成: 基于Astro的超快加载速度和SEO优化

🎨 现代化设计: 简洁美观的界面，支持自定义主题色

📱 移动友好: 完美的响应式体验，移动端专项优化

🌟 看板娘支持: 同时支持Spine和Live2D动画引擎

🔧 高度可配置: 大部分功能模块均可通过配置文件自定义

<img alt="firefly" src="./docs/images/1.webp" />

## 🎯 个性化特性

本仓库是基于 Firefly 主题的个性化配置版本，包含以下优化：

- 🚀 **优化部署配置**: 完善的 Cloudflare Pages 部署指南和一键部署按钮
- 📖 **增强文档**: 添加详细的初始化向导 (INIT_GUIDE.md) 和 AI 开发文档 (CLAUDE.md)
- 🖥️ **Web 初始化向导**: 首次访问自动跳转到可视化配置页面
- ⚙️ **个性化配置**: 根据个人偏好调整的主题色、字体和布局
- 📝 **内容迁移**: 包含从 WordPress 迁移博客内容的完整教程

访问我的博客查看实际效果: [blog.johntime.top](https://blog.johntime.top)

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- pnpm ≥ 9

### 本地开发部署

> **💡 提示**: 如果你想使用原版 Firefly 主题而非本个性化版本，请访问 [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)

1. **克隆仓库：**
   ```bash
   git clone https://github.com/johntime2005/blog.git
   cd blog
   ```

2. **安装依赖：**
   ```bash
   # 如果没有安装 pnpm，先安装
   npm install -g pnpm

   # 安装项目依赖
   pnpm install
   ```

3. **运行初始化脚本（首次配置必需）：**

   **方法 1：Web 界面向导（推荐）**

   部署后，首次访问你的博客网站，会自动跳转到初始化设置向导页面。按照向导填写信息，完成后下载配置文件并提交到 GitHub。

   **方法 2：命令行脚本（本地开发）**

   ```bash
   pnpm init
   ```

   脚本会交互式地询问你的网站信息、个人信息和主题配置，自动完成个性化配置。

   > 💡 **提示**: 查看 [INIT_GUIDE.md](./INIT_GUIDE.md) 获取详细的初始化指南

4. **启动开发服务器：**
   ```bash
   pnpm dev
   ```
   博客将在 `http://localhost:4321` 可用

### 平台托管部署

#### 一键部署到 Cloudflare Pages

[![Deploy to Cloudflare Pages](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/johntime2005/blog)

点击上方按钮即可一键部署到 Cloudflare Pages。部署前请确保：
- 拥有 Cloudflare 账号
- 已登录 GitHub

> ⚠️ **重要**: 部署后请立即运行 `pnpm init` 配置你的个性化信息！详见 [INIT_GUIDE.md](./INIT_GUIDE.md)

#### 其他平台部署

- **参考[官方指南](https://docs.astro.build/zh-cn/guides/deploy/)将博客部署至 Vercel, Netlify, GitHub Pages 等。**
- **Cloudflare Pages 完整部署教程**: 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 获取详细的 Cloudflare Pages 部署指南

## 📖 配置说明

> 📚 **快速配置指南**: 查看 [INIT_GUIDE.md](./INIT_GUIDE.md) 获取详细的初始化和配置步骤
> 📚 **完整配置文档**: 查看 [Firefly使用文档](https://docs-firefly.cuteleaf.cn/) 获取完整的配置指南
> 📚 **AI 开发文档**: 查看 [CLAUDE.md](./CLAUDE.md) 获取项目架构和开发指南

### 配置文件结构

```
src/
├── config/
│   ├── index.ts              # 配置索引文件
│   ├── siteConfig.ts         # 站点基础配置
│   ├── profileConfig.ts      # 用户资料配置
│   ├── commentConfig.ts      # 评论系统配置
│   ├── announcementConfig.ts # 公告配置
│   ├── licenseConfig.ts      # 许可证配置
│   ├── footerConfig.ts       # 页脚配置
│   ├── FooterConfig.html     # 页脚HTML内容
│   ├── expressiveCodeConfig.ts # 代码高亮配置
│   ├── sakuraConfig.ts       # 樱花特效配置
│   ├── fontConfig.ts         # 字体配置
│   ├── sidebarConfig.ts      # 侧边栏布局配置
│   ├── navBarConfig.ts       # 导航栏配置
│   ├── musicConfig.ts        # 音乐播放器配置
│   ├── pioConfig.ts          # 看板娘配置
│   ├── adConfig.ts           # 广告配置
│   ├── friendsConfig.ts      # 友链配置
│   ├── sponsorConfig.ts      # 赞助配置(upstream)
│   └── coverImageConfig.ts   # 文章封面图配置(upstream)
```


## ⚙️ 文章 Frontmatter

```yaml
---
title: My First Blog Post
published: 2023-09-09
description: This is the first post of my new Astro blog.
image: ./cover.jpg
tags: [Foo, Bar]
category: Front-end
draft: false
lang: jp      # 仅当文章语言与 `config.ts` 中的网站语言不同时需要设置
---
```

## 🧞 指令

下列指令均需要在项目根目录执行：

| Command                           | Action                            |
|:----------------------------------|:----------------------------------|
| `pnpm install` 并 `pnpm add sharp` | 安装依赖                              |
| `pnpm init`                       | **运行初始化脚本配置个性化信息（首次使用必需）**      |
| `pnpm dev`                        | 在 `localhost:4321` 启动本地开发服务器      |
| `pnpm build`                      | 构建网站至 `./dist/`                   |
| `pnpm preview`                    | 本地预览已构建的网站                        |
| `pnpm new-post <filename>`        | 创建新文章                             |
| `pnpm astro ...`                  | 执行 `astro add`, `astro check` 等指令 |
| `pnpm astro --help`               | 显示 Astro CLI 帮助                   |


## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](./LICENSE) 文件。

## 🙏 致谢

### 主题来源
- 非常感谢 [saicaca](https://github.com/saicaca) 开发的 [Fuwari](https://github.com/saicaca/fuwari) 模板，Firefly 就是基于这个模板二次开发
- 参考了博主 [霞葉](https://kasuha.com) 分享的 [Bangumi 收藏展示](https://kasuha.com/posts/fuwari-enhance-ep2/) 和 [邮箱保护/图片标题](https://kasuha.com/posts/fuwari-enhance-ep1/) 方案
- 参考了 [Mizuki](https://github.com/matsuzaka-yuki/Mizuki) 的横幅标题/多级菜单导航栏/樱花特效/KaTeX/Fancybox方案
- 使用了 [Astro](https://astro.build) 和 [Tailwind CSS](https://tailwindcss.com) 构建
- 使用了 [MetingJS](https://github.com/metowolf/MetingJS) 和 [APlayer](https://github.com/MoePlayer/APlayer) 音乐播放器
- 使用了b站up [公公的日常](https://space.bilibili.com/3546750017080050) 提供的Q版 `流萤` 看板娘切片数据模型
- 图标来自 [Iconify](https://iconify.design/)
- 流萤部分相关图片素材版权归游戏 [《崩坏：星穹铁道》](https://sr.mihoyo.com/) 开发商 [米哈游](https://www.mihoyo.com/) 所有

## 📝 许可协议

本项目遵循 [MIT license](https://mit-license.org/) 开源协议，详细查看 [LICENSE](./LICENSE) 文件，

最初 Fork 自 [saicaca/fuwari](https://github.com/saicaca/fuwari)，感谢原作者的贡献，原项目采用 [MIT license](https://mit-license.org/)。

本博客基于以下优秀的开源项目构建：

- **🎨 [Firefly](https://github.com/CuteLeaf/Firefly)** - 主题基础，感谢 [CuteLeaf](https://github.com/CuteLeaf) 的精心设计与维护
- **🌸 [Mizuki](https://github.com/matsuzaka-yuki/Mizuki)** - Fuwari 的二次开发版本，提供了许多实用功能
- **🍃 [Fuwari](https://github.com/saicaca/fuwari)** - 原始模板，为主题奠定了基础

### 技术栈

- ⚡ [Astro](https://astro.build) - 现代化的静态站点生成器
- 🎨 [Tailwind CSS](https://tailwindcss.com) - 实用优先的 CSS 框架
- 🎭 [Svelte](https://svelte.dev) - 交互组件框架
- 🎯 [Iconify](https://iconify.design/) - 统一的图标解决方案

### 特别感谢

- 💃 感谢 B 站 UP 主 [公公的日常](https://space.bilibili.com/3546750017080050) 提供的 Q 版流萤看板娘切片数据模型

---

## 📬 联系方式

- **我的博客**: [blog.johntime.top](https://blog.johntime.top)
- **GitHub**: [johntime2005](https://github.com/johntime2005)
- **问题反馈**: [提交 Issue](https://github.com/johntime2005/blog/issues)

如需使用原版 Firefly 主题，请访问：
- **主题仓库**: [CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)
- **主题文档**: [docs-firefly.cuteleaf.cn](https://docs-firefly.cuteleaf.cn/)
- **问题反馈**: [提交 Issue](https://github.com/CuteLeaf/Firefly/issues) 或 [Pull Request](https://github.com/CuteLeaf/Firefly/pulls)

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给原主题 [Firefly](https://github.com/CuteLeaf/Firefly) 点个 Star！**

Made with ❤️ by [johntime](https://github.com/johntime2005) | Theme by [CuteLeaf](https://github.com/CuteLeaf)

</div>

# 配置模块 (src/config) - AI 开发指南

[根目录](../../CLAUDE.md) > **src/config**

---

## 模块职责

集中管理 Firefly 博客的所有配置项，提供模块化导入和类型安全的配置访问。所有配置文件通过 `index.ts` 统一导出，组件可以一次性导入多个相关配置。

---

## 入口与启动

### 配置索引文件

**文件**：`src/config/index.ts`

**作用**：统一导出所有配置，简化导入语句。

```typescript
// 使用示例
import { siteConfig, profileConfig, navBarConfig } from '@/config';

// 等价于
import { siteConfig } from '@/config/siteConfig';
import { profileConfig } from '@/config/profileConfig';
import { navBarConfig } from '@/config/navBarConfig';
```

---

## 对外接口

### 核心配置导出

| 导出名称 | 源文件 | 类型 | 用途 |
|---------|--------|------|------|
| `siteConfig` | siteConfig.ts | `SiteConfig` | 站点基础配置（标题、语言、主题色、页面开关） |
| `profileConfig` | profileConfig.ts | `ProfileConfig` | 用户资料配置（头像、昵称、社交链接） |
| `navBarConfig` | navBarConfig.ts | `NavBarConfig` | 导航栏菜单配置 |
| `commentConfig` | commentConfig.ts | `CommentConfig` | 评论系统配置（Twikoo） |
| `fontConfig` | fontConfig.ts | `FontConfig` | 字体配置 |
| `sakuraConfig` | sakuraConfig.ts | `SakuraConfig` | 樱花特效配置 |
| `live2dModelConfig` | pioConfig.ts | `ModelConfig` | Live2D 看板娘配置 |
| `spineModelConfig` | pioConfig.ts | `ModelConfig` | Spine 看板娘配置 |
| `musicPlayerConfig` | musicConfig.ts | `MusicPlayerConfig` | 音乐播放器配置 |
| `getEnabledFriends` | friendsConfig.ts | `Function` | 获取启用的友链 |
| `licenseConfig` | licenseConfig.ts | `LicenseConfig` | 文章许可证配置 |
| `footerConfig` | footerConfig.ts | `FooterConfig` | 页脚配置 |
| `announcementConfig` | announcementConfig.ts | `AnnouncementConfig` | 公告配置 |
| `adConfig1`, `adConfig2` | adConfig.ts | `AdConfig` | 广告配置 |
| `sidebarLayoutConfig` | sidebarConfig.ts | `SidebarLayoutConfig` | 侧边栏布局配置 |
| `expressiveCodeConfig` | expressiveCodeConfig.ts | `ExpressiveCodeConfig` | 代码高亮配置 |

---

## 关键依赖与配置

### 类型定义

所有配置类型定义在 `src/types/config.ts` 中，确保类型安全。

### 环境变量

配置中不直接使用环境变量，如需敏感信息（如评论系统 API 密钥），应在组件中通过 `import.meta.env` 访问。

---

## 数据模型

### 核心配置结构

#### 1. siteConfig（站点配置）

```typescript
interface SiteConfig {
  title: string;                    // 站点标题
  subtitle: string;                 // 副标题
  description: string;              // SEO 描述
  keywords: string[];               // SEO 关键词
  lang: string;                     // 站点语言（zh_CN, en, ja, zh_TW）

  themeColor: {
    hue: number;                    // 主题色色相（0-360）
    fixed: boolean;                 // 是否隐藏主题色选择器
    defaultMode: 'light' | 'dark' | 'system'; // 默认亮暗模式
  };

  favicon: Favicon[];               // 网站图标配置
  logoIcon: LogoIcon;               // Logo 配置

  bangumi?: {
    userId: string;                 // Bangumi 用户 ID
  };

  showLastModified: boolean;        // 显示文章最后修改时间
  generateOgImages: boolean;        // 是否生成 OG 图片

  pages: {                          // 页面开关
    anime: boolean;
    projects: boolean;
    timeline: boolean;
    skills: boolean;
  };

  postListLayout: {                 // 文章列表布局
    defaultMode: 'list' | 'grid';
    allowSwitch: boolean;
  };

  pagination: {
    postsPerPage: number;           // 每页文章数
  };

  backgroundWallpaper: {            // 背景壁纸配置
    enable: boolean;
    mode: 'banner' | 'overlay';
    src: string | { desktop: string; mobile: string };
    position: string;               // CSS object-position
    banner?: BannerConfig;
    overlay?: OverlayConfig;
  };

  toc: {                            // 目录配置
    enable: boolean;
    depth: number;
  };

  font: FontConfig;                 // 字体配置
}
```

#### 2. profileConfig（用户资料）

```typescript
interface ProfileConfig {
  name: string;                     // 用户名
  avatar: string;                   // 头像 URL
  bio: string;                      // 个人简介
  links: SocialLink[];              // 社交链接
}

interface SocialLink {
  name: string;
  url: string;
  icon: string;                     // Iconify 图标名
}
```

#### 3. navBarConfig（导航栏）

```typescript
interface NavBarConfig {
  links: NavLink[];                 // 导航链接
}

interface NavLink {
  name: string;
  url: string;
  external?: boolean;               // 是否外部链接
}
```

#### 4. commentConfig（评论系统）

```typescript
interface CommentConfig {
  enable: boolean;
  type: 'twikoo' | 'waline';
  envId?: string;                   // Twikoo 环境 ID
  serverURL?: string;               // Waline 服务器地址
}
```

---

## 常见配置任务

### 任务 1：修改网站标题和描述

**文件**：`src/config/siteConfig.ts`

```typescript
export const siteConfig: SiteConfig = {
  title: "你的博客名称",
  subtitle: "你的副标题",
  description: "你的博客描述",
  // ...
};
```

### 任务 2：更改主题色

**文件**：`src/config/siteConfig.ts`

```typescript
themeColor: {
  hue: 200,  // 蓝色系（0=红，120=绿，240=蓝）
  fixed: false,
  defaultMode: 'system',
}
```

### 任务 3：添加导航菜单

**文件**：`src/config/navBarConfig.ts`

```typescript
export const navBarConfig: NavBarConfig = {
  links: [
    { name: "首页", url: "/" },
    { name: "归档", url: "/archive" },
    { name: "友链", url: "/friends" },
    // 新增菜单
    { name: "关于", url: "/about" },
  ],
};
```

### 任务 4：启用评论系统

**文件**：`src/config/commentConfig.ts`

```typescript
export const commentConfig: CommentConfig = {
  enable: true,
  type: 'twikoo',
  envId: 'your-twikoo-env-id',  // 从 Twikoo 控制台获取
};
```

### 任务 5：配置看板娘

**文件**：`src/config/pioConfig.ts`

```typescript
// 启用 Spine 看板娘
export const spineModelConfig: ModelConfig = {
  enable: true,
  model: 'firefly',  // 模型名称
};

// 禁用 Live2D
export const live2dModelConfig: ModelConfig = {
  enable: false,
};
```

### 任务 6：禁用特定页面

**文件**：`src/config/siteConfig.ts`

```typescript
pages: {
  anime: false,     // 禁用追番页面，访问 /anime 将 404
  projects: true,
  timeline: true,
  skills: true,
}
```

---

## 测试与质量

### 当前状态

- **单元测试**：无
- **类型检查**：通过 TypeScript 类型定义确保配置正确性

### 验证方法

1. **启动开发服务器**：
   ```bash
   pnpm dev
   ```
   检查配置是否正确加载。

2. **构建测试**：
   ```bash
   pnpm build
   ```
   确保配置不会导致构建失败。

3. **类型检查**：
   ```bash
   pnpm check
   ```
   验证配置类型是否正确。

---

## 常见问题 (FAQ)

### Q1：修改配置后页面没有变化？

**A**：
1. 重启开发服务器（Ctrl+C 后重新运行 `pnpm dev`）
2. 清除浏览器缓存
3. 检查配置文件是否有语法错误

### Q2：如何添加新的配置文件？

**A**：
1. 在 `src/config/` 下创建新文件（如 `myConfig.ts`）
2. 定义配置对象和类型（在 `src/types/config.ts` 中添加类型定义）
3. 在 `src/config/index.ts` 中导出
4. 在需要的地方导入使用

### Q3：配置项太多，如何快速定位？

**A**：
- 使用编辑器的"全局搜索"功能搜索配置名称
- 参考根目录 `CLAUDE.md` 中的"配置模块"章节
- 查看 `src/config/README.md`（如有）

### Q4：为什么有些配置项不生效？

**A**：
- 检查是否在正确的环境（开发/生产）
- 某些配置（如 OG 图片生成）需要在构建时才生效
- 检查相关组件是否正确读取配置

---

## 相关文件清单

```
src/config/
├── index.ts                      # 配置索引（必读）
├── siteConfig.ts                 # 站点配置（核心）
├── profileConfig.ts              # 用户资料
├── navBarConfig.ts               # 导航栏
├── commentConfig.ts              # 评论系统
├── fontConfig.ts                 # 字体
├── sakuraConfig.ts               # 樱花特效
├── pioConfig.ts                  # 看板娘
├── musicConfig.ts                # 音乐播放器
├── friendsConfig.ts              # 友链
├── licenseConfig.ts              # 文章许可证
├── footerConfig.ts               # 页脚
├── announcementConfig.ts         # 公告
├── adConfig.ts                   # 广告
├── sidebarConfig.ts              # 侧边栏布局
├── expressiveCodeConfig.ts       # 代码高亮
└── README.md                     # 配置说明文档
```

---

## 变更记录

### 2025-11-12 - 初始化
- 创建配置模块文档
- 记录所有配置文件和接口

---

**提示**：修改配置前请先备份原文件，或使用 Git 进行版本控制！

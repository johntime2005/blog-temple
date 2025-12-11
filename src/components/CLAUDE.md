# 组件模块 (src/components) - AI 开发指南

[根目录](../../CLAUDE.md) > **src/components**

---

## 模块职责

提供可复用的 UI 组件库，分为 Astro 静态组件和 Svelte 交互组件。所有组件遵循单一职责原则，支持通过 Props 进行配置。

---

## 入口与启动

### 组件目录结构

```
src/components/
├── widget/              # 侧边栏与卡片组件
├── comment/             # 评论系统
├── control/             # 通用控件（按钮、分页）
├── misc/                # 杂项（图标、License）
├── Navbar.astro         # 顶部导航栏
├── Footer.astro         # 页脚
├── PostCard.astro       # 文章卡片
├── PostPage.astro       # 文章详情页组件
├── Search.svelte        # 搜索面板
└── ...
```

---

## 对外接口

### 核心组件清单

#### 布局组件

| 组件名称 | 文件 | 类型 | 用途 |
|---------|------|------|------|
| **Navbar** | Navbar.astro | Astro | 顶部导航栏（支持透明模式） |
| **Footer** | Footer.astro | Astro | 页脚（支持自定义 HTML） |
| **SideBar** | widget/SideBar.astro | Astro | 侧边栏容器 |
| **WidgetLayout** | widget/WidgetLayout.astro | Astro | Widget 通用布局 |

#### 内容组件

| 组件名称 | 文件 | 类型 | 用途 |
|---------|------|------|------|
| **PostCard** | PostCard.astro | Astro | 文章卡片（标准样式） |
| **PostCardCompact** | PostCardCompact.astro | Astro | 文章卡片（紧凑样式） |
| **PostPage** | PostPage.astro | Astro | 文章详情页包装组件 |
| **PostMeta** | PostMeta.astro | Astro | 文章元信息（日期、标签、分类） |

#### 交互组件（Svelte）

| 组件名称 | 文件 | 用途 |
|---------|------|------|
| **Search** | Search.svelte | 全局搜索（基于 Pagefind） |
| **DisplaySettings** | widget/DisplaySettings.svelte | 主题色/亮暗模式切换面板 |
| **MobileTOC** | MobileTOC.svelte | 移动端目录/底部导航 |
| **LightDarkSwitch** | LightDarkSwitch.svelte | 亮暗模式切换按钮 |
| **LayoutSwitchButton** | LayoutSwitchButton.svelte | 列表/网格布局切换按钮 |
| **ArchivePanel** | ArchivePanel.svelte | 归档面板（按年月分组） |
| **MusicPlayer** | widget/MusicPlayer.svelte | 音乐播放器 |

#### Widget 组件

| 组件名称 | 文件 | 用途 |
|---------|------|------|
| **TOC** | widget/TOC.astro | 桌面端目录 |
| **FloatingTOC** | widget/FloatingTOC.astro | 浮动目录 |
| **Profile** | widget/Profile.astro | 用户资料卡片 |
| **Categories** | widget/Categories.astro | 分类列表 |
| **Tags** | widget/Tags.astro | 标签云 |
| **Announcement** | widget/Announcement.astro | 公告栏 |
| **Advertisement** | widget/Advertisement.astro | 广告位 |
| **SpineModel** | widget/SpineModel.astro | Spine 看板娘 |
| **Live2DWidget** | widget/Live2DWidget.astro | Live2D 看板娘 |

#### 控件组件

| 组件名称 | 文件 | 用途 |
|---------|------|------|
| **ButtonLink** | control/ButtonLink.astro | 链接按钮 |
| **ButtonTag** | control/ButtonTag.astro | 标签按钮 |
| **Pagination** | control/Pagination.astro | 分页组件 |
| **BackToTop** | control/BackToTop.astro | 返回顶部按钮 |

#### 杂项组件

| 组件名称 | 文件 | 用途 |
|---------|------|------|
| **Icon** | misc/Icon.astro | 图标组件（Iconify） |
| **ImageWrapper** | misc/ImageWrapper.astro | 图片包装组件（支持懒加载） |
| **License** | misc/License.astro | 文章许可证声明 |
| **Markdown** | misc/Markdown.astro | Markdown 渲染器 |
| **FullscreenWallpaper** | misc/FullscreenWallpaper.astro | 全屏壁纸 |

#### 评论组件

| 组件名称 | 文件 | 用途 |
|---------|------|------|
| **Twikoo** | comment/Twikoo.astro | Twikoo 评论系统集成 |
| **index** | comment/index.astro | 评论系统入口（根据配置加载） |

---

## 关键依赖与配置

### 依赖项

- **@iconify/svelte**：图标库（Svelte 版本）
- **astro-icon**：图标库（Astro 版本）
- **@fancyapps/ui**：图片灯箱（Fancybox）
- **photoswipe**：图片画廊（备用）
- **@swup/astro**：页面过渡动画

### 样式系统

- **全局样式**：`src/styles/main.css`
- **组件样式**：使用 Astro 的 scoped `<style>` 或 Tailwind 工具类
- **响应式**：移动优先（Tailwind 断点：`sm`、`md`、`lg`）

---

## 组件开发指南

### Astro 组件示例

```astro
---
// Props 类型定义
interface Props {
  title: string;
  description?: string;
}

const { title, description = '' } = Astro.props;
---

<div class="my-component">
  <h2>{title}</h2>
  {description && <p>{description}</p>}
</div>

<style>
  .my-component {
    padding: 1rem;
    background: var(--card-bg);
  }
</style>
```

### Svelte 组件示例

```svelte
<script lang="ts">
  export let title: string;
  export let description: string = '';

  let isOpen = false;

  function toggle() {
    isOpen = !isOpen;
  }
</script>

<div class="my-component">
  <button on:click={toggle}>{title}</button>
  {#if isOpen}
    <p>{description}</p>
  {/if}
</div>

<style>
  .my-component {
    padding: 1rem;
  }
</style>
```

### 组件命名规范

- **文件名**：PascalCase（如 `MyComponent.astro`）
- **变量名**：camelCase（如 `myVariable`）
- **CSS 类名**：kebab-case（如 `my-class`）

---

## 常用组件使用示例

### 1. Navbar（导航栏）

```astro
---
import Navbar from '@components/Navbar.astro';
---

<Navbar />
```

**配置位置**：`src/config/navBarConfig.ts`

### 2. PostCard（文章卡片）

```astro
---
import PostCard from '@components/PostCard.astro';
import { getCollection } from 'astro:content';

const posts = await getCollection('posts');
---

{posts.map(post => (
  <PostCard post={post} />
))}
```

### 3. Search（搜索）

```svelte
<Search client:load />
```

**注意**：必须使用 `client:load` 指令使其在客户端运行。

### 4. TOC（目录）

```astro
---
import TOC from '@components/widget/TOC.astro';

// 假设 headings 来自文章
const { headings } = Astro.props;
---

<TOC headings={headings} />
```

### 5. Twikoo（评论）

```astro
---
import Comment from '@components/comment/index.astro';
---

<Comment />
```

评论系统会根据 `src/config/commentConfig.ts` 自动加载对应的实现。

---

## 响应式设计

### 断点规则

- **移动端**：默认（< 640px）
- **平板**：`sm:` (≥ 640px)
- **小屏桌面**：`md:` (≥ 768px)
- **桌面**：`lg:` (≥ 1024px)
- **大屏桌面**：`xl:` (≥ 1280px)

### 响应式组件示例

```astro
<div class="
  p-4          /* 移动端：padding 1rem */
  md:p-8       /* 桌面端：padding 2rem */
  lg:flex      /* 桌面端：使用 flex 布局 */
">
  <!-- 内容 -->
</div>
```

---

## 性能优化

### 客户端指令

Astro 默认生成静态 HTML，Svelte 组件需要指定客户端指令：

- **`client:load`**：页面加载后立即加载组件（适用于首屏关键组件）
- **`client:idle`**：浏览器空闲时加载（适用于非关键组件）
- **`client:visible`**：组件进入视口时加载（适用于折叠内容）

```astro
<Search client:load />           <!-- 立即加载 -->
<MusicPlayer client:idle />      <!-- 空闲时加载 -->
<Comments client:visible />      <!-- 滚动到时加载 -->
```

### 图片优化

使用 `ImageWrapper` 组件自动处理图片懒加载：

```astro
<ImageWrapper
  src="/path/to/image.jpg"
  alt="描述"
  loading="lazy"
/>
```

---

## 测试与质量

### 当前状态

- **单元测试**：无
- **E2E 测试**：无
- **手动测试**：通过 `pnpm dev` 验证

### 测试建议

1. **交互组件（Svelte）**：使用 Vitest + Testing Library
2. **视觉回归测试**：使用 Playwright 截图对比

---

## 常见问题 (FAQ)

### Q1：如何创建新组件？

**A**：
1. 在 `src/components/` 下创建文件（如 `MyComponent.astro`）
2. 定义 Props 接口
3. 编写组件代码
4. 在需要的地方导入使用

### Q2：为什么 Svelte 组件不工作？

**A**：
- 检查是否添加了客户端指令（如 `client:load`）
- 检查是否安装了 `@astrojs/svelte` 集成
- 查看浏览器控制台是否有错误

### Q3：如何自定义组件样式？

**A**：
- **方法 A**：使用 Tailwind 工具类
- **方法 B**：在组件内使用 scoped `<style>`
- **方法 C**：在全局样式文件中添加样式

### Q4：如何共享状态？

**A**：
- **Astro 组件间**：通过 Props 传递
- **Svelte 组件间**：使用 Svelte Store
- **跨框架**：使用 Nano Stores（推荐）

### Q5：组件如何访问配置？

**A**：
```astro
---
import { siteConfig } from '@/config';
---

<div>{siteConfig.title}</div>
```

---

## 相关文件清单

```
src/components/
├── widget/                        # 侧边栏组件
│   ├── TOC.astro
│   ├── FloatingTOC.astro
│   ├── Profile.astro
│   ├── Categories.astro
│   ├── Tags.astro
│   ├── Announcement.astro
│   ├── SpineModel.astro
│   ├── Live2DWidget.astro
│   └── ...
├── comment/                       # 评论系统
│   ├── Twikoo.astro
│   └── index.astro
├── control/                       # 通用控件
│   ├── ButtonLink.astro
│   ├── ButtonTag.astro
│   ├── Pagination.astro
│   └── BackToTop.astro
├── misc/                          # 杂项
│   ├── Icon.astro
│   ├── ImageWrapper.astro
│   ├── License.astro
│   └── Markdown.astro
├── Navbar.astro                   # 导航栏
├── Footer.astro                   # 页脚
├── PostCard.astro                 # 文章卡片
├── PostPage.astro                 # 文章详情页
├── Search.svelte                  # 搜索（交互）
├── MobileTOC.svelte               # 移动端目录（交互）
├── LightDarkSwitch.svelte         # 亮暗模式切换（交互）
└── ...
```

---

## 变更记录

### 2025-11-12 - 初始化
- 创建组件模块文档
- 记录所有核心组件和使用方式

---

**提示**：修改组件后需要重启开发服务器才能看到效果！

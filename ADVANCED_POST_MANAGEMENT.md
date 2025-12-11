# Firefly 博客高级文章管理功能指南

> 更新时间：2025-11-17
> 版本：v2.0

---

## 📋 目录

1. [功能概览](#功能概览)
2. [可见性控制](#可见性控制)
3. [排序与推荐](#排序与推荐)
4. [布局自定义](#布局自定义)
5. [SEO 控制](#seo-控制)
6. [隐私保护方案](#隐私保护方案)
7. [完整示例](#完整示例)
8. [常见问题](#常见问题)

---

## 功能概览

### 新增字段总览

| 字段类别 | 字段名 | 类型 | 默认值 | 说明 |
|---------|--------|------|--------|------|
| **可见性控制** | `visibility` | enum | `"public"` | 文章可见性级别 |
| | `hideFromHome` | boolean | `false` | 从首页隐藏 |
| | `hideFromArchive` | boolean | `false` | 从归档页隐藏 |
| | `hideFromSearch` | boolean | `false` | 从搜索结果隐藏 |
| | `showInWidget` | boolean | `true` | 是否在侧边栏显示 |
| **排序与推荐** | `customOrder` | number | - | 自定义排序优先级 |
| | `featuredLevel` | number | `0` | 推荐级别 (0-5) |
| **布局控制** | `postLayout` | enum | `"default"` | 文章布局模板 |
| **SEO 控制** | `seoNoIndex` | boolean | `false` | 禁止搜索引擎索引 |
| | `seoNoFollow` | boolean | `false` | 禁止搜索引擎跟踪链接 |
| **访问控制** | `accessLevel` | enum | `"public"` | 访问控制级别 |

---

## 可见性控制

### 1. 全局可见性级别 (`visibility`)

控制文章在全站的可见性：

```yaml
visibility: "public"   # 完全公开（默认）
visibility: "unlisted" # 仅通过直接链接访问（不出现在列表中）
visibility: "private"  # 完全隐藏（生产环境不生成页面）
```

**使用场景：**

- `public`：正常发布的文章
- `unlisted`：分享链接但不想公开展示的文章（如内部文档、特殊活动页面）
- `private`：完全私密的文章，在生产环境不会生成任何文件

**示例：**

```yaml
---
title: 内部技术分享
published: 2025-11-17
visibility: "unlisted"  # 只能通过直接链接访问
---
```

### 2. 页面级隐藏控制

更细粒度地控制文章在不同页面的显示：

#### `hideFromHome` - 从首页隐藏

```yaml
---
title: 归档的旧文章
published: 2020-01-01
hideFromHome: true  # 不在首页列表显示，但在归档页和搜索中可见
---
```

**适用场景：**
- 旧文章归档但保留可访问性
- 临时下线但不删除
- 特殊类型文章（如草稿预览、测试页面）

#### `hideFromArchive` - 从归档页隐藏

```yaml
---
title: 特殊通知
published: 2025-11-17
hideFromArchive: true  # 不在归档页显示
---
```

**适用场景：**
- 临时公告或通知
- 不需要长期归档的内容

#### `hideFromSearch` - 从搜索结果隐藏

```yaml
---
title: 敏感话题讨论
published: 2025-11-17
hideFromSearch: true  # 站内搜索无法找到此文章
---
```

**适用场景：**
- 包含敏感词但不违规的内容
- 不希望被轻易搜到的旧文章
- 仅供特定读者阅读的内容

#### `showInWidget` - 侧边栏控制

```yaml
---
title: 技术文档
published: 2025-11-17
showInWidget: false  # 不出现在"最新文章"等侧边栏组件中
---
```

**适用场景：**
- 文档类页面
- 不需要在侧边栏推广的文章

### 3. 组合使用示例

**案例 1：低调发布**
```yaml
---
title: 新功能预览
published: 2025-11-17
hideFromHome: true
hideFromArchive: true
showInWidget: false
# 只能通过直接链接访问，不在任何列表显示
---
```

**案例 2：归档但可搜索**
```yaml
---
title: 2020年技术总结
published: 2020-12-31
hideFromHome: true    # 不在首页显示
hideFromArchive: false # 在归档页显示
hideFromSearch: false  # 可以搜到
---
```

---

## 排序与推荐

### 1. 自定义排序 (`customOrder`)

通过数字控制文章在列表中的显示顺序，**数字越小越靠前**。

```yaml
---
title: 置顶公告
published: 2025-11-17
customOrder: 1  # 最高优先级，排在第一位
---
```

```yaml
---
title: 重要教程
published: 2025-11-17
customOrder: 10  # 次优先级
---
```

```yaml
---
title: 普通文章
published: 2025-11-17
# 不设置 customOrder，按默认规则排序
---
```

**排序优先级**（从高到低）：
1. `customOrder`（有设置的优先，数字小的优先）
2. `featuredLevel`（推荐级别高的优先）
3. `pinned`（置顶状态）
4. `published`（发布日期新的优先）

### 2. 推荐级别 (`featuredLevel`)

设置文章推荐程度（0-5 级），可用于特殊展示。

```yaml
---
title: 精选文章
published: 2025-11-17
featuredLevel: 5  # 最高推荐级别
---
```

**使用场景：**
- 在侧边栏显示"精选文章"列表
- 在首页特殊区域展示高质量内容
- 为推荐算法提供权重参考

**代码调用示例：**

```typescript
// 获取推荐级别 >= 3 的文章
import { getFeaturedPosts } from "@/utils/content-utils";

const featuredPosts = await getFeaturedPosts(3);
```

---

## 布局自定义

### `postLayout` 字段

为不同文章指定不同的布局模板。

> **注意**：在 Astro 5 中，为避免与内置的 `layout` 字段冲突，我们使用 `postLayout` 作为字段名。

**可选值：**

| 值 | 说明 | 适用场景 |
|----|------|---------|
| `default` | 默认布局 | 普通文章 |
| `wide` | 宽屏布局 | 图片较多的文章、摄影作品 |
| `fullscreen` | 全屏布局 | 演示文稿、长图展示 |
| `no-sidebar` | 无侧边栏布局 | 需要更多阅读空间的长文 |

**示例：**

```yaml
---
title: 摄影作品集
published: 2025-11-17
postLayout: "wide"  # 使用宽屏布局，更好地展示图片
---
```

```yaml
---
title: 项目演示文稿
published: 2025-11-17
postLayout: "fullscreen"  # 全屏展示
---
```

> **注意**：当前版本布局参数已传递到组件，但实际渲染逻辑需要在 `MainGridLayout.astro` 中根据 `postLayout` 值调整 CSS 类名。

---

## SEO 控制

### 1. `seoNoIndex` - 禁止搜索引擎索引

```yaml
---
title: 内部文档
published: 2025-11-17
seoNoIndex: true  # 添加 <meta name="robots" content="noindex">
---
```

**效果**：搜索引擎（Google/Bing）不会将此页面加入索引，用户无法通过搜索引擎找到此页面。

**适用场景：**
- 内部文档、测试页面
- 重复内容（避免 SEO 惩罚）
- 临时页面

### 2. `seoNoFollow` - 禁止跟踪链接

```yaml
---
title: 友情链接页面
published: 2025-11-17
seoNoFollow: true  # 添加 <meta name="robots" content="nofollow">
---
```

**效果**：搜索引擎不会跟踪此页面上的外部链接。

**适用场景：**
- 包含大量外部链接的页面
- 用户生成内容（UGC）
- 广告或赞助内容

### 3. 组合使用

```yaml
---
title: 测试页面
published: 2025-11-17
seoNoIndex: true
seoNoFollow: true
# 完全不被搜索引擎处理
---
```

---

## 隐私保护方案

### ⚠️ 重要警告

**所有提交到 Git 仓库的文件都是可见的！** 即使设置了 `visibility: "private"` 或 `draft: true`，文件内容仍然会被提交到 GitHub，任何能访问仓库的人都能看到。

这些字段只是控制生产环境是否生成页面，**不能保护文件内容本身**。

### 方案对比

| 方案 | 隐私级别 | 文件在 Git | 文件是否生成 | 适用场景 |
|------|---------|-----------|------------|---------|
| **`.gitignore` 排除** | ⭐⭐⭐⭐⭐ | ❌ 不提交 | 取决于本地 | **绝对隐私** |
| **本地加密后提交** | ⭐⭐⭐⭐⭐ | ✅ 加密内容 | 否 | 云端备份 + 隐私 |
| `draft: true` | ⭐⭐ | ✅ 明文 | 否（生产） | 草稿，内容可见 |
| `visibility: "private"` | ⭐⭐ | ✅ 明文 | 否（生产） | 同上 |
| `visibility: "unlisted"` | ⭐ | ✅ 明文 | 是 | 半公开 |
| `encrypted: true` | ⭐⭐⭐ | ✅ 明文 | 是（前端加密） | 密码保护页面 |

### 推荐方案

#### 1. **绝对隐私** - 使用 `.gitignore`（推荐）

创建私密文章目录并排除提交：

```bash
# 在 .gitignore 中添加
src/content/posts/private/
```

然后创建私密文章：

```bash
mkdir -p src/content/posts/private
```

```markdown
<!-- src/content/posts/private/my-secret.md -->
---
title: 我的私密日记
published: 2025-11-17
---

这些内容永远不会被提交到 Git，完全安全。
```

**优点**：
- ✅ 文件不会被提交到 Git
- ✅ 完全私密
- ✅ 本地开发可以预览

**缺点**：
- ❌ 无法云端备份
- ❌ 更换电脑需要手动迁移
- ❌ 构建时需要确保这些文件存在（或使用条件导入）

#### 2. **云端备份 + 隐私** - 本地加密后提交

使用 GPG 或其他工具加密文件后再提交：

```bash
# 加密文件
gpg --encrypt --recipient your@email.com secret-post.md

# 提交加密文件
git add secret-post.md.gpg
git commit -m "Add encrypted post"

# 需要时解密
gpg --decrypt secret-post.md.gpg > secret-post.md
```

**优点**：
- ✅ 云端备份
- ✅ 内容加密

**缺点**：
- ❌ 工作流复杂
- ❌ 需要额外工具

#### 3. **草稿阶段** - 使用 `draft: true`

```yaml
---
title: 未完成的文章
published: 2025-11-17
draft: true  # 开发环境可见，生产环境不生成
---
```

**适用场景**：
- 正在编写的草稿
- 计划发布但未完成的内容
- **注意**：内容会被提交到 Git，仓库访问者可见

#### 4. **半公开内容** - 使用 `visibility: "unlisted"`

```yaml
---
title: 限时活动页面
published: 2025-11-17
visibility: "unlisted"  # 仅通过链接访问
---
```

**适用场景**：
- 分享给特定人群的链接
- 临时活动页面
- 不希望被搜索到但可以直接访问的内容

#### 5. **前端密码保护** - 使用 `encrypted: true`

```yaml
---
title: 敏感技术文档
published: 2025-11-17
encrypted: true
password: "your-strong-password"
---
```

**适用场景**：
- 防止搜索引擎索引
- 轻度"礼貌性"保护
- **注意**：源文件内容仍在 Git 中，只是页面需要密码

**⚠️ 重大安全警告**：

这**不是真正的安全**！存在以下问题：

1. **密码明文存储在 Git**
   - 任何能访问仓库的人都能看到密码
   - Git 历史永久保存密码

2. **前端加密不安全**
   - 技术人员可以轻松绕过（查看源代码、禁用 JS、修改代码）
   - 加密内容必须发送到浏览器，可以被截获
   - 本质上是"安全剧场"（看起来安全但实际不安全）

3. **弱密码更危险**
   - 即使强密码，在前端也可以被暴力破解

**安全性说明**：
- ⚠️ **仅适用于**：防止搜索引擎、礼貌性保护
- ❌ **不适用于**：真正的隐私内容、敏感信息
- ⚠️ 前端加密可被技术手段破解
- ⚠️ 密码会被硬编码在仓库中

**查看详细说明**：[ENCRYPTION_SECURITY_WARNING.md](./ENCRYPTION_SECURITY_WARNING.md)

### 🔒 最佳实践建议

#### 对于真正的隐私内容：

1. **使用 `.gitignore` 排除**（最安全）
2. **或使用私有仓库** + 严格的访问控制
3. **或使用加密工具**（如 GPG）加密后再提交

#### 对于一般内容：

1. **草稿**: `draft: true`
2. **未完成但可见**: `visibility: "unlisted"`
3. **密码保护**: `encrypted: true`（仅适用于低敏感度内容）

### ⚠️ 安全提醒

**永远不要在公开仓库中存储：**
- 🚫 密码、密钥、Token
- 🚫 个人隐私信息（地址、电话、身份证等）
- 🚫 公司机密
- 🚫 敏感数据

**即使设置了 `draft: true` 或 `private`，Git 历史仍会保留所有内容！**

如果不小心提交了敏感信息，需要：
1. 使用 `git filter-branch` 或 `BFG Repo-Cleaner` 清理 Git 历史
2. 强制推送到远程仓库
3. 立即更换泄露的密钥/密码

---

## 完整示例

### 示例 1：精选技术教程

```yaml
---
title: Astro 完全指南
published: 2025-11-17
updated: 2025-11-17
description: 从零开始学习 Astro 框架
image: ./cover.jpg
tags: [Astro, 前端, 教程]
category: 技术

# 排序与推荐
customOrder: 5          # 自定义排序优先级
featuredLevel: 5        # 最高推荐级别
pinned: false

# 可见性（全部使用默认值，完全公开）
visibility: "public"
hideFromHome: false
hideFromArchive: false
hideFromSearch: false
showInWidget: true

# 布局
postLayout: "default"

# SEO
seoNoIndex: false
seoNoFollow: false
---
```

### 示例 2：低调分享的项目文档

```yaml
---
title: 内部项目技术文档
published: 2025-11-17
description: 仅限团队成员访问
tags: [项目, 文档]
category: 内部

# 可见性控制
visibility: "unlisted"   # 仅链接访问
hideFromHome: true      # 不在首页显示
hideFromArchive: true   # 不在归档显示
hideFromSearch: true    # 不被搜索到
showInWidget: false     # 不在侧边栏显示

# SEO
seoNoIndex: true        # 搜索引擎不索引
seoNoFollow: true       # 不跟踪链接

# 布局
postLayout: "no-sidebar"    # 无侧边栏，更多阅读空间
---
```

### 示例 3：加密的敏感内容

```yaml
---
title: 服务器配置备份
published: 2025-11-17
encrypted: true
password: "MySecurePassword123!"

# 可见性
visibility: "unlisted"
hideFromSearch: true

# SEO
seoNoIndex: true
seoNoFollow: true
---
```

### 示例 4：旧文章归档

```yaml
---
title: 2018年技术总结
published: 2018-12-31
tags: [总结, 回顾]
category: 年终总结

# 从首页隐藏但保留在归档页
hideFromHome: true
hideFromArchive: false
showInWidget: false

# 降低推荐优先级
featuredLevel: 0
customOrder: 9999  # 排到最后
---
```

---

## 常见问题

### Q1: 设置 `visibility: "private"` 后，开发环境能看到吗？

**A**: 可以。`private` 文章只在生产环境（`pnpm build`）时被过滤，开发环境（`pnpm dev`）仍然可以正常访问，方便调试。

---

### Q2: `hideFromSearch` 和 `seoNoIndex` 有什么区别？

**A**:
- `hideFromSearch`：控制站内搜索（Pagefind），文章仍会被生成，只是搜索组件找不到。
- `seoNoIndex`：控制搜索引擎（Google/Bing），通过 `<meta>` 标签告诉搜索引擎不要索引此页面。

两者可以组合使用以达到最佳效果。

---

### Q3: 如何批量修改所有旧文章的可见性？

**A**: 使用脚本批量修改 Frontmatter。示例：

```javascript
// scripts/hide-old-posts.js
import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDir = './src/content/posts';
const cutoffDate = new Date('2023-01-01');

// 遍历所有文章
const files = fs.readdirSync(postsDir, { recursive: true });

files.forEach(file => {
  if (!file.endsWith('.md')) return;

  const filePath = path.join(postsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const { data, content: markdown } = matter(content);

  // 如果发布日期早于 2023-01-01，隐藏首页
  if (new Date(data.published) < cutoffDate) {
    data.hideFromHome = true;
    const updated = matter.stringify(markdown, data);
    fs.writeFileSync(filePath, updated);
    console.log(`Updated: ${file}`);
  }
});
```

---

### Q4: `customOrder` 和 `pinned` 有什么区别？

**A**:
- `pinned`：传统的置顶功能，置顶文章排在所有普通文章之前。
- `customOrder`：更灵活的排序，可以精确控制任何文章的位置。

**排序优先级**：`customOrder` > `featuredLevel` > `pinned` > `published`

---

### Q5: 如何实现"仅会员可见"的文章？

**A**: 当前版本的 `accessLevel` 字段已定义但未实现权限验证逻辑。要实现真正的权限控制，需要：

1. 使用 Cloudflare Workers 或其他服务端方案
2. 或者使用 `encrypted` + `password` 字段作为简单的访问控制

**未来计划**：可以基于 `accessLevel` 字段扩展为基于用户身份的访问控制系统。

---

### Q6: 设置了 `hideFromHome` 但文章仍然显示？

**A**: 检查以下几点：
1. 确保已重新构建（`pnpm build`）
2. 清除浏览器缓存
3. 检查是否在页面中调用了正确的过滤函数（如 `getHomePagePosts()` 而非 `getSortedPosts()`）

---

### Q7: 如何为特定分类的所有文章设置默认属性？

**A**: 可以在 `src/content/config.ts` 中扩展 schema，使用 `transform` 或 `refine` 方法动态设置默认值：

```typescript
const postsCollection = defineCollection({
  schema: z.object({
    // ... 现有字段
  }).transform((data) => {
    // 示例：所有"草稿"分类默认隐藏
    if (data.category === '草稿') {
      data.hideFromHome = true;
      data.showInWidget = false;
    }
    return data;
  }),
});
```

---

## 技术实现说明

### 核心文件

1. **Schema 定义**: `src/content/config.ts`
2. **过滤逻辑**: `src/utils/content-utils.ts` 中的 `shouldShowPost()` 函数
3. **页面应用**:
   - 首页: `src/pages/[...page].astro` → 使用 `getHomePagePosts()`
   - 归档页: `src/pages/archive.astro` → 使用 `getArchivePagePostsList()`
   - 文章详情: `src/pages/posts/[...slug].astro`
4. **布局组件**: `src/layouts/MainGridLayout.astro` 和 `Layout.astro`

### 扩展建议

1. **自定义过滤函数**：在 `content-utils.ts` 中添加更多过滤条件
2. **侧边栏组件**：修改 `widget/*` 组件以使用 `getWidgetPosts()` 或 `getFeaturedPosts()`
3. **布局实现**：在 `MainGridLayout.astro` 中根据 `postLayout` 值动态调整样式类
4. **权限系统**：基于 `accessLevel` 实现服务端权限验证

---

## 更新日志

### v2.0 (2025-11-17)
- ✅ 新增可见性控制系统
- ✅ 新增自定义排序和推荐级别
- ✅ 新增布局模板选择
- ✅ 新增 SEO 精细控制
- ✅ 新增搜索隐藏功能（Pagefind集成）
- ✅ 更新文档和使用示例

---

## 反馈与支持

遇到问题或有改进建议？请在 [GitHub Issues](https://github.com/johntime2005/blog/issues) 中反馈。

**祝使用愉快！🎉**

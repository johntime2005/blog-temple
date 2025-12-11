# WordPress 文章迁移说明

## 迁移完成!

已成功从 WordPress 数据库导出文件中提取并转换了 **7 篇文章**，包括所有的图片和格式。

## 转换结果

所有文章已保存在:
```
src/content/posts/wordpress-import/
```

### 已转换的文章列表:

1. **世界,您好!** (2024-02-12) - `post-2025-02-12.md`
2. **利用1panel便捷的给网站上证书** (2024-02-17) - `post-2025-02-17.md`
3. **第一次在github提pr的经历** (2024-03-04) - `post-2025-03-04.md`
4. **一次骑行的记录** (2024-03-12) - `post-2025-03-12.md`
5. **成都行** (2024-04-09) - `post-2025-04-09.md`
6. **利用maddy-mail搭建邮件服务器** (2024-04-10) - `post-2025-04-10.md` ✨ 包含 2 张图片
7. **使用cloudflare R2存储 + piclist 实现图床** (2024-08-23) - `post-2025-08-23.md` ✨ 包含 8 张图片

## ✅ 图片迁移完成

所有 WordPress 文章中的图片已成功转换为 Markdown 格式，共计 **10 张图片**。图片链接已正确保留，可以正常显示。

### 图片来源:
- `johntime.top/wp-content/uploads/` - WordPress 上传的图片
- `img.johntime.top/imghosting/` - R2 存储的图片

## 文章元数据

所有文章的 frontmatter 包含:
- `title`: 文章标题
- `published`: 发布日期
- `description`: 描述 (标记为"从 WordPress 迁移的文章")
- `tags`: 标签 (默认为 `[WordPress迁移]`)
- `category`: 分类 (默认为 "博客")
- `draft`: false (已发布状态)

### 2. 元数据自定义
你可以根据需要修改每篇文章的:
- `description`: 可以从文章内容中提取更合适的描述
- `tags`: 可以添加更具体的标签
- `category`: 可以按照文章主题重新分类

### 3. 文件名
文件名采用 `post-日期` 格式,保持简洁。你也可以根据文章标题重命名文件,例如:
- `post-2025-02-17.md` → `1panel-ssl-certificate.md`

## 如何重新运行转换

如果需要重新转换,运行以下命令:

```bash
node scripts/wordpress-to-markdown.js
```

该脚本会:
1. 读取 `word_zipfdk_2025110611374200krq.sql` 文件
2. 提取所有已发布的文章
3. 将 WordPress HTML 转换为 Markdown
4. 生成文章文件到 `src/content/posts/wordpress-import/`

## 转换脚本功能

转换脚本 (`scripts/wordpress-to-markdown.js`) 支持:

- ✅ 段落转换
- ✅ 标题转换 (h1-h6)
- ✅ 链接转换
- ✅ 加粗、斜体、删除线
- ✅ 列表(有序和无序)
- ✅ 代码块和行内代码
- ✅ 图片转换
- ✅ 引用块
- ✅ HTML 实体解码

## 下一步

1. **检查文章**: 浏览转换后的文章,确保内容正确
2. **修改元数据**: 根据需要自定义 tags、category 和 description
3. **测试构建**: 运行 `npm run dev` 查看文章在网站上的显示效果
4. **调整样式**: 如果需要,可以调整文章的格式和样式

## 问题排查

如果遇到问题:

1. **文章未显示**: 检查 frontmatter 格式是否正确
2. **图片无法加载**: 确认图片链接是否可访问
3. **格式异常**: 检查 Markdown 语法是否正确

## 原始数据

原始 WordPress SQL 导出文件保存在:
```
word_zipfdk_2025110611374200krq.sql
```

如需查看原始数据或重新转换,该文件将作为备份保留。

---

转换完成时间: 2025-11-06

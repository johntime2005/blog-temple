# 🎛️ 管理后台使用指南

> **可视化管理文章加密，自动生成强密码**
> 访问地址：`/admin/encryption`

---

## 📖 快速开始

### 第 1 步：设置管理员密码

在 Cloudflare Dashboard 中配置管理员密码：

1. 进入 **Workers & Pages** → 选择你的博客项目
2. 进入 **Settings** → **Environment variables**
3. 点击 **Add variable**：
   - **Variable name**: `ADMIN_PASSWORD`
   - **Value**: 你的管理员密码（建议使用强密码）
   - **Environment**: Production（生产环境）
4. 保存后，重新部署项目

### 第 2 步：访问管理后台

部署完成后，访问：

```
https://your-blog.pages.dev/admin/encryption
```

输入管理员密码登录。

---

## 💡 功能说明

### 1. 启用加密

1. 在文章列表中找到要加密的文章
2. 点击 **"启用加密"** 按钮
3. 系统会自动生成 16 位强密码
4. **重要**：弹出窗口会显示密码和需要添加到 frontmatter 的代码
5. 复制密码并保存（已永久保存，可随时在后台查看）
6. 手动编辑文章，在 frontmatter 中添加：
   ```yaml
   encrypted: true
   encryptionId: "文章slug"  # 系统会提示具体值
   ```
7. 提交并部署

**示例：**
```yaml
---
title: 我的私密文章
published: 2025-11-18
encrypted: true
encryptionId: "tutorials-my-private-post"
---
```

### 2. 查看密码

- 点击 **"查看密码"** 按钮
- 密码会立即显示（永久保存，随时可查看）
- 点击复制按钮可快速复制密码

### 3. 禁用加密

1. 点击 **"禁用加密"** 按钮
2. 确认删除
3. 密码从 KV 中删除
4. **重要**：需要手动在文章 frontmatter 中设置 `encrypted: false`

### 4. 搜索和筛选

- **搜索框**：按标题、路径、分类搜索
- **筛选标签**：
  - 全部：显示所有文章
  - 已加密：只显示已启用加密的文章
  - 未加密：只显示未加密的文章

---

## 🔐 安全特性

### 密码生成

- **自动生成 16 位强密码**
- 包含大写字母、小写字母、数字和特殊字符
- 符合安全最佳实践

### 密码存储

- **哈希存储**：用户访问时验证的密码以 SHA-256 哈希形式存储在 KV
- **明文存储**：永久保存，仅管理员登录后可见
- **管理员验证**：所有操作需要管理员 token（24小时有效）

### 访问控制

- 管理后台需要密码登录
- Token 保存在浏览器 localStorage
- Token 24 小时后失效

---

## 📝 使用流程示例

### 场景：加密一篇新文章

1. **登录管理后台**
   ```
   访问 /admin/encryption
   输入管理员密码
   ```

2. **找到文章并启用加密**
   - 在列表中找到 "我的私密文章"
   - 点击 "启用加密"
   - 弹出窗口显示：
     ```
     密码：xY9#mK2@pQ5&wZ8!
     encryptionId: "my-private-post"
     ```
   - 复制密码保存

3. **更新文章 frontmatter**
   ```yaml
   ---
   title: 我的私密文章
   published: 2025-11-18
   encrypted: true
   encryptionId: "my-private-post"
   ---
   ```

4. **提交并部署**
   ```bash
   git add src/content/posts/my-private-post.md
   git commit -m "feat: 启用文章加密"
   git push
   ```

5. **验证**
   - 部署完成后访问文章
   - 应该看到密码输入界面
   - 输入刚才的密码测试

---

## ⚠️ 注意事项

### 1. 密码可见性

- ✅ **生成后立即显示**：密码生成后会在弹窗中显示
- ✅ **永久可查看**：在管理后台点击"查看密码"可随时查看明文
- ✅ **不会丢失**：密码永久保存在 KV 中，除非手动删除

**优势**：无需记住密码，遗失时随时可在后台恢复

### 2. frontmatter 需要手动更新

管理后台只负责管理密码，不会自动修改文章文件。你需要：
1. 手动编辑文章 frontmatter
2. 添加 `encrypted: true` 和 `encryptionId`
3. 提交到 Git 并部署

**未来改进**：可能会添加自动更新 frontmatter 的功能。

### 3. encryptionId 规则

- 默认使用文章 slug（将 `/` 替换为 `-`）
- 例如：`tutorials/guide` → `tutorials-guide`
- 可以自定义，但必须与 KV 中的 ID 一致

### 4. 禁用加密后

- 密码从 KV 中删除
- 文章仍然显示加密状态（直到你修改 frontmatter）
- 用户无法访问文章（密码验证失败）

---

## 🚀 高级技巧

### 批量加密

虽然界面不支持批量操作，但可以通过 CLI 工具批量管理：

```bash
# 为多篇文章生成密码
pnpm manage-password set post-1 $(openssl rand -base64 12)
pnpm manage-password set post-2 $(openssl rand -base64 12)
pnpm manage-password set post-3 $(openssl rand -base64 12)
```

### 共享密码

如果多篇文章使用相同的 `encryptionId`，它们会共享同一个密码：

```yaml
# 文章 1
encryptionId: "vip-series"

# 文章 2
encryptionId: "vip-series"  # 相同ID = 相同密码
```

### 自定义密码长度

目前固定为 16 位，如果需要更长的密码，可以修改 API：

在 `functions/api/admin/manage-passwords.ts` 中修改：
```typescript
passwordLength: number = 24  // 改为 24 位
```

---

## 🔧 故障排查

### 登录失败

- ✅ 检查 `ADMIN_PASSWORD` 环境变量是否正确设置
- ✅ 检查是否已重新部署
- ✅ 清除浏览器缓存和 localStorage

### 密码无法查看

- ⚠️ 密码可能未生成或已被删除
- ✅ 重新启用加密生成新密码

### 加密不生效

- ✅ 检查文章 frontmatter 是否正确添加
- ✅ 检查 `encryptionId` 是否与 KV 中的一致
- ✅ 检查是否已提交并部署

---

## 📚 相关文档

- [完整加密指南](./ENCRYPTION_GUIDE.md)
- [快速参考](./ENCRYPTION_QUICK_REFERENCE.md)
- [wrangler配置](./WRANGLER_SETUP.md)

---

**祝使用愉快！如有问题请提交 Issue** 🎉

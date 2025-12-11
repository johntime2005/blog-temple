# 🚀 文章加密快速参考卡片

## 🎛️ 方式 1：管理后台（推荐）

### 访问地址
```
https://your-blog.pages.dev/admin/encryption
```

### 使用步骤
1. 输入管理员密码登录
2. 找到要加密的文章
3. 点击 **"启用加密"** 按钮
4. **自动生成强密码**（16位）
5. 复制密码和 frontmatter 代码
6. 手动更新文章 frontmatter
7. 提交并部署

**详细指南**：[ADMIN_DASHBOARD_GUIDE.md](./ADMIN_DASHBOARD_GUIDE.md)

---

## 💻 方式 2：命令行工具

### 设置密码
```bash
pnpm manage-password set <加密ID> <密码>
```

**示例：**
```bash
pnpm manage-password set my-secret-post MyPassword123
```

---

## 文章启用加密
在文章 frontmatter 中添加：
```yaml
---
encrypted: true
encryptionId: "my-secret-post"  # 必须与CLI设置的ID一致
---
```

---

## 管理密码

### 查看所有加密文章
```bash
pnpm manage-password list
```

### 更新密码
```bash
pnpm manage-password set <加密ID> <新密码>
```

### 删除密码
```bash
pnpm manage-password delete <加密ID>
```

---

## 常用组合配置

### 完全私密文章
```yaml
---
encrypted: true
encryptionId: "private-post"
visibility: "unlisted"      # 不在列表显示
hideFromSearch: true        # 不被站内搜索
seoNoIndex: true           # 搜索引擎不索引
---
```

### 系列文章共用密码
```yaml
# 文章 1
---
encrypted: true
encryptionId: "vip-series"
series: VIP教程
---

# 文章 2
---
encrypted: true
encryptionId: "vip-series"  # 相同ID = 相同密码
series: VIP教程
---
```

只需设置一次密码：
```bash
pnpm manage-password set vip-series SharedPassword123
```

---

## 初次配置

1. **创建 KV 命名空间**（Cloudflare Dashboard）
   - 名称：`POST_ENCRYPTION`

2. **绑定到 Pages 项目**
   - Variable name: `POST_ENCRYPTION`

3. **配置本地环境**
   ```bash
   cp .env.encryption.example .env.encryption
   # 编辑 .env.encryption 填入凭证
   ```

---

## 故障排查

### 密码验证失败
- ✅ 检查 `encryptionId` 是否与 CLI 设置的一致
- ✅ 检查 KV 绑定是否正确
- ✅ 检查 Workers 函数是否部署成功

### 本地开发无法测试
- ⚠️ 本地开发需要 `wrangler dev` 模拟 Workers
- 或直接部署到 Preview 环境测试

---

**完整文档：** 查看 [ENCRYPTION_GUIDE.md](./ENCRYPTION_GUIDE.md)

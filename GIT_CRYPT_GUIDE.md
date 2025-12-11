# Git-Crypt 实现指南 - 为博客内容加密

## 📖 什么是 Git-Crypt？

Git-Crypt 是一个透明的 Git 文件加密工具：
- ✅ **自动加密**：提交时自动加密匹配的文件
- ✅ **自动解密**：拉取时自动解密（有权限）
- ✅ **无缝体验**：对有权限的用户完全透明
- ✅ **团队友好**：支持多用户 GPG 密钥管理

## 🎯 适用场景

- ✅ 需要云端备份的私密内容
- ✅ 团队协作但部分内容保密
- ✅ 混合公开/私密的博客仓库
- ❌ 不适合：单人简单使用（`.gitignore` 更简单）

---

## 🚀 快速开始

### 步骤 1：安装 Git-Crypt

#### macOS
```bash
brew install git-crypt gnupg
```

#### Ubuntu/Debian
```bash
sudo apt update
sudo apt install git-crypt gnupg
```

#### Arch Linux
```bash
sudo pacman -S git-crypt gnupg
```

#### Windows
```bash
# 使用 WSL 或 Git Bash
# 或从源码编译：https://github.com/AGWA/git-crypt
```

### 步骤 2：生成 GPG 密钥（如果还没有）

```bash
# 生成新密钥
gpg --full-generate-key

# 选择：
# 1. RSA and RSA (default)
# 2. 密钥大小：4096
# 3. 有效期：0（永不过期）或自定义
# 4. 输入姓名和邮箱
# 5. 设置密码短语（重要！）
```

验证密钥：
```bash
gpg --list-keys

# 输出示例：
# pub   rsa4096 2025-11-17 [SC]
#       ABC123DEF456...
# uid   [ultimate] Your Name <your@email.com>
# sub   rsa4096 2025-11-17 [E]
```

### 步骤 3：在博客仓库中初始化 Git-Crypt

```bash
cd /path/to/your/blog

# 初始化 git-crypt
git-crypt init

# 添加你的 GPG 密钥
git-crypt add-gpg-user your@email.com

# 或使用密钥 ID
git-crypt add-gpg-user ABC123DEF456...
```

### 步骤 4：配置加密规则

创建/编辑 `.gitattributes` 文件：

```bash
# .gitattributes

# 加密整个 private 目录
src/content/posts/private/** filter=git-crypt diff=git-crypt

# 加密特定文件类型
*.secret.md filter=git-crypt diff=git-crypt
*.env.local filter=git-crypt diff=git-crypt

# 加密包含 [ENCRYPTED] 标记的文件
**/encrypted-*.md filter=git-crypt diff=git-crypt

# 保持其他文件明文
# （默认行为，不需要显式配置）
```

### 步骤 5：测试加密

```bash
# 创建测试文件
mkdir -p src/content/posts/private
cat > src/content/posts/private/test-encrypted.md << 'EOF'
---
title: 加密测试文章
published: 2025-11-17
---

# 这是加密内容

这个文件会被 Git-Crypt 自动加密！
EOF

# 查看状态
git-crypt status

# 应该显示：
# encrypted: src/content/posts/private/test-encrypted.md

# 提交
git add .gitattributes src/content/posts/private/
git commit -m "Add git-crypt encryption"
```

### 步骤 6：验证加密

```bash
# 方法 1：锁定仓库后查看
git-crypt lock
cat src/content/posts/private/test-encrypted.md
# 应该看到乱码（已加密）

# 解锁
git-crypt unlock
cat src/content/posts/private/test-encrypted.md
# 应该看到明文

# 方法 2：克隆仓库到另一个位置
cd /tmp
git clone /path/to/your/blog blog-test
cd blog-test
cat src/content/posts/private/test-encrypted.md
# 没有密钥的话会看到乱码
```

---

## 👥 团队协作

### 添加团队成员

```bash
# 获取团队成员的 GPG 公钥
# 方法 1：从密钥服务器
gpg --recv-keys MEMBER_KEY_ID

# 方法 2：从文件导入
gpg --import member-public-key.asc

# 添加到 git-crypt
git-crypt add-gpg-user member@email.com

# 提交变更
git add .git-crypt/
git commit -m "Add team member to git-crypt"
git push
```

### 团队成员克隆仓库

```bash
# 克隆仓库
git clone git@github.com:username/blog.git
cd blog

# 解锁（使用自己的 GPG 密钥）
git-crypt unlock

# 现在可以看到解密后的文件
```

---

## 📝 实战示例：博客私密文章

### 场景：混合公开和私密内容

```
src/content/posts/
├── tutorials/              # 公开文章
│   └── guide.md           # 明文
├── private/               # 私密文章
│   ├── diary-2025.md      # 加密 ✓
│   └── draft-ideas.md     # 加密 ✓
└── wordpress-import/      # 公开文章
    └── post.md            # 明文
```

### .gitattributes 配置

```gitattributes
# 加密 private 目录
src/content/posts/private/** filter=git-crypt diff=git-crypt

# 加密环境变量
.env.local filter=git-crypt diff=git-crypt
.env.production filter=git-crypt diff=git-crypt

# 加密配置密钥
config/secrets.ts filter=git-crypt diff=git-crypt

# 其他文件保持明文（默认）
```

### 私密文章示例

```markdown
<!-- src/content/posts/private/my-diary.md -->
---
title: 2025 年私人日记
published: 2025-11-17
tags: [日记, 私密]
category: 生活
---

# 今天的心情

这些内容会被加密存储在 Git 中，只有拥有 GPG 密钥的人才能看到。

## 工作笔记

- 敏感的工作内容
- API 密钥记录
- 客户信息

完全安全！
```

---

## 🔧 常用命令

### 基础操作

```bash
# 查看加密状态
git-crypt status

# 显示哪些文件被加密
git-crypt status -e

# 锁定仓库（加密所有文件）
git-crypt lock

# 解锁仓库
git-crypt unlock

# 使用特定密钥解锁
git-crypt unlock /path/to/keyfile
```

### 密钥管理

```bash
# 导出对称密钥（用于备份或共享）
git-crypt export-key ../blog-crypt-key

# 使用对称密钥解锁（不需要 GPG）
git-crypt unlock ../blog-crypt-key

# 列出有权限的 GPG 用户
cd .git-crypt/keys/default/0/
ls *.gpg
```

### 故障排查

```bash
# 检查 GPG 配置
gpg --version
gpg --list-keys

# 检查 git-crypt 配置
git config --list | grep crypt

# 强制解密特定文件
git-crypt unlock
git checkout HEAD -- src/content/posts/private/file.md
```

---

## 🎨 Astro 集成注意事项

### 处理加密文件的构建

由于 Astro 需要读取所有 Markdown 文件，确保：

#### 1. 本地开发环境已解锁

```bash
# 开发前检查
git-crypt status

# 如果已锁定，解锁
git-crypt unlock
```

#### 2. CI/CD 环境配置密钥

**GitHub Actions 示例**：

```yaml
# .github/workflows/deploy.yml
name: Deploy Blog

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install git-crypt
        run: sudo apt-get install git-crypt

      - name: Import GPG key
        env:
          GPG_PRIVATE_KEY: ${{ secrets.GPG_PRIVATE_KEY }}
        run: |
          echo "$GPG_PRIVATE_KEY" | gpg --import

      - name: Unlock git-crypt
        run: git-crypt unlock

      - name: Build
        run: |
          pnpm install
          pnpm build

      # ... 部署步骤
```

**设置 GitHub Secrets**：

```bash
# 导出你的 GPG 私钥
gpg --armor --export-secret-keys your@email.com > private-key.asc

# 复制内容并添加到 GitHub Secrets
# Repository → Settings → Secrets → New secret
# Name: GPG_PRIVATE_KEY
# Value: <粘贴 private-key.asc 的内容>
```

#### 3. 或使用对称密钥（更简单）

```bash
# 导出对称密钥
git-crypt export-key git-crypt-key

# 添加到 GitHub Secrets
# Name: GIT_CRYPT_KEY
# Value: <base64 编码的密钥>
base64 git-crypt-key
```

```yaml
# .github/workflows/deploy.yml
- name: Unlock git-crypt
  env:
    GIT_CRYPT_KEY: ${{ secrets.GIT_CRYPT_KEY }}
  run: |
    echo "$GIT_CRYPT_KEY" | base64 -d > /tmp/git-crypt-key
    git-crypt unlock /tmp/git-crypt-key
```

---

## ⚖️ Git-Crypt vs 其他方案

| 方案 | 复杂度 | 安全性 | 团队协作 | 云端备份 | 透明度 |
|------|--------|--------|---------|---------|--------|
| **Git-Crypt** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ 优秀 | ✅ | ⭐⭐⭐⭐ |
| `.gitignore` | ⭐ | ⭐⭐⭐⭐⭐ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| 私有仓库 | ⭐ | ⭐⭐⭐ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| GPG 手动 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | ✅ | ⭐ |
| `encrypted: true` | ⭐⭐ | ⭐⭐ | ❌ | ✅ | ⭐⭐⭐ |

### 推荐场景

- **个人博客，简单隐私**：`.gitignore`
- **个人博客，需要备份**：私有仓库
- **团队博客，部分加密**：**Git-Crypt** ⭐
- **企业级，高安全**：Git-Crypt + 私有仓库

---

## 🔐 安全最佳实践

### 1. 备份 GPG 密钥

```bash
# 导出私钥（安全存储！）
gpg --armor --export-secret-keys your@email.com > gpg-private-key.asc

# 导出公钥
gpg --armor --export your@email.com > gpg-public-key.asc

# 备份撤销证书
cp ~/.gnupg/openpgp-revocs.d/*.rev ~/backup/
```

### 2. 备份 Git-Crypt 对称密钥

```bash
# 导出密钥
git-crypt export-key ~/backup/blog-git-crypt-key

# 安全存储（加密 USB、密码管理器等）
```

### 3. 测试恢复流程

```bash
# 模拟新环境
cd /tmp
git clone git@github.com:username/blog.git test-recovery
cd test-recovery

# 导入 GPG 密钥
gpg --import ~/backup/gpg-private-key.asc

# 或使用对称密钥
git-crypt unlock ~/backup/blog-git-crypt-key

# 验证可以看到解密内容
cat src/content/posts/private/test.md
```

### 4. 定期密钥轮换

```bash
# 每年或密钥泄露时：
# 1. 生成新 GPG 密钥
gpg --full-generate-key

# 2. 重新初始化 git-crypt
git-crypt init

# 3. 添加新密钥
git-crypt add-gpg-user new@email.com

# 4. 移除旧密钥访问权限
# （删除 .git-crypt/keys/default/0/ 下的旧密钥文件）
```

---

## 🐛 常见问题

### Q1: 文件没有被加密？

```bash
# 检查 .gitattributes 配置
cat .gitattributes

# 检查文件状态
git-crypt status -e | grep your-file.md

# 强制重新加密
git rm --cached your-file.md
git add your-file.md
```

### Q2: CI/CD 构建失败？

检查：
1. ✅ Git-Crypt 已安装
2. ✅ GPG 密钥正确导入
3. ✅ `git-crypt unlock` 成功执行

```bash
# 调试 CI
git-crypt status  # 应该显示 "unlocked"
```

### Q3: 克隆后看到乱码？

```bash
# 你需要先解锁
git-crypt unlock

# 如果没有 GPG 密钥，联系管理员获取对称密钥
git-crypt unlock /path/to/keyfile
```

### Q4: 如何撤销某人的访问权限？

```bash
# Git-Crypt 不支持直接撤销！
# 需要重新初始化：

# 1. 导出所有加密文件
git-crypt unlock
cp -r src/content/posts/private /tmp/backup

# 2. 删除 git-crypt 配置
rm -rf .git-crypt
git rm .git-crypt -r

# 3. 重新初始化
git-crypt init

# 4. 只添加信任的用户
git-crypt add-gpg-user trusted@email.com

# 5. 重新加密
git add .
git commit -m "Revoke access and re-encrypt"
```

---

## 📚 进阶技巧

### 1. 部分加密 Frontmatter

如果只想加密文章内容，不加密元数据：

```bash
# 创建自定义过滤器脚本
# 需要更复杂的配置，建议整个文件加密
```

### 2. 与 Husky 集成

```javascript
// .husky/pre-commit
#!/bin/sh

# 确保敏感文件已加密
if git diff --cached --name-only | grep -q "^src/content/posts/private/"; then
  if ! git-crypt status > /dev/null 2>&1; then
    echo "❌ Error: git-crypt not initialized!"
    exit 1
  fi

  if git-crypt status | grep -q "not encrypted"; then
    echo "⚠️  Warning: Some files should be encrypted but aren't!"
    echo "Run: git-crypt status -e"
    exit 1
  fi
fi
```

### 3. 自动化密钥分发

```bash
# 使用密钥服务器
gpg --send-keys YOUR_KEY_ID

# 团队成员导入
gpg --recv-keys YOUR_KEY_ID
```

---

## 🎉 总结

### 优点

✅ 透明加密，使用体验好
✅ 支持团队协作
✅ 云端备份 + 隐私保护
✅ Git 原生集成

### 缺点

❌ 需要配置 GPG（学习曲线）
❌ CI/CD 需要额外配置
❌ 撤销权限较复杂

### 最终建议

**如果你：**
- 需要云端备份私密内容 → **使用 Git-Crypt** ⭐
- 团队协作且部分内容保密 → **使用 Git-Crypt** ⭐
- 只是个人博客，简单隐私 → 使用 `.gitignore`

**开始使用：**
```bash
# 三步启用
brew install git-crypt gnupg
git-crypt init
git-crypt add-gpg-user your@email.com

# 配置加密规则
echo "src/content/posts/private/** filter=git-crypt diff=git-crypt" >> .gitattributes

# 完成！
```

---

## 📖 参考资源

- [Git-Crypt GitHub](https://github.com/AGWA/git-crypt)
- [GPG 快速指南](https://www.gnupg.org/gph/en/manual.html)
- [Git Attributes 文档](https://git-scm.com/docs/gitattributes)

**需要帮助？**
- 提交 Issue 或查看示例配置
- [完整配置示例](./git-crypt-example/)

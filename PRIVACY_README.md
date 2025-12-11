# 隐私保护方案总结

本目录包含博客内容隐私保护的完整指南和配置。

## 📚 文档清单

| 文档 | 用途 | 难度 |
|------|------|------|
| **GIT_CRYPT_GUIDE.md** | Git-Crypt 完整使用指南 | ⭐⭐⭐ |
| **ADVANCED_POST_MANAGEMENT.md** | 高级文章管理功能（包含隐私部分） | ⭐⭐ |
| **QUICK_REFERENCE.md** | 快速参考卡片 | ⭐ |

## 🔧 配置文件

| 文件 | 说明 |
|------|------|
| `.gitattributes.git-crypt-example` | Git-Crypt 配置示例 |
| `.gitignore.privacy-example` | .gitignore 隐私配置 |
| `setup-git-crypt.sh` | 自动化配置脚本 |
| `private-example.md.template` | 私密文章模板 |

---

## 🎯 快速决策指南

### 我应该用哪种方案？

#### 场景 1：个人博客，简单隐私需求
**推荐方案**：`.gitignore` 排除

```bash
# .gitignore
src/content/posts/private/
```

**优点**：最简单，完全私密
**缺点**：无法云端备份

---

#### 场景 2：个人博客，需要云端备份
**推荐方案**：Git-Crypt 或私有仓库

**方案 A：Git-Crypt**（推荐）
```bash
# 一键设置
bash setup-git-crypt.sh your@email.com
```

**方案 B：私有仓库**
- 将 GitHub 仓库设为私有
- 限制访问权限

---

#### 场景 3：团队博客，部分内容保密
**推荐方案**：Git-Crypt

支持多用户 GPG 密钥管理，权限控制灵活。

```bash
# 管理员设置
git-crypt init
git-crypt add-gpg-user admin@email.com

# 添加团队成员
git-crypt add-gpg-user member@email.com
```

---

#### 场景 4：暂时性隐私（草稿）
**推荐方案**：使用 `draft: true`

```yaml
---
title: 未完成的文章
draft: true
---
```

**注意**：文件仍会被提交到 Git！

---

## 🚀 快速开始

### 方法 1：使用 .gitignore（最简单）

```bash
# 1. 编辑 .gitignore
echo "src/content/posts/private/" >> .gitignore

# 2. 创建私密目录
mkdir -p src/content/posts/private

# 3. 在该目录下写文章
# 这些文件永远不会被提交到 Git
```

### 方法 2：使用 Git-Crypt（推荐）

```bash
# 1. 安装依赖
brew install git-crypt gnupg  # macOS
# sudo apt install git-crypt gnupg  # Ubuntu

# 2. 运行自动配置脚本
bash setup-git-crypt.sh your@email.com

# 3. 完成！现在可以在 src/content/posts/private/ 写私密文章
```

### 方法 3：使用私有仓库

1. 访问 GitHub 仓库设置
2. Settings → Danger Zone → Change visibility
3. 选择 "Private"

---

## 📊 方案对比

| 方案 | 设置难度 | 安全性 | 云端备份 | 团队协作 | 透明度 |
|------|---------|--------|---------|---------|--------|
| **.gitignore** | ⭐ | ⭐⭐⭐⭐⭐ | ❌ | ❌ | ⭐⭐⭐⭐⭐ |
| **Git-Crypt** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ✅ 优秀 | ⭐⭐⭐⭐ |
| **私有仓库** | ⭐ | ⭐⭐⭐ | ✅ | ✅ | ⭐⭐⭐⭐⭐ |
| **GPG 手动** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ✅ | ⭐⭐ | ⭐ |
| `draft: true` | ⭐ | ⭐⭐ | ✅ | ✅ | ⭐⭐⭐⭐ |
| `encrypted` | ⭐⭐ | ⭐⭐⭐ | ✅ | ❌ | ⭐⭐⭐ |

**推荐**：
- 🥇 个人简单：`.gitignore`
- 🥇 个人备份：Git-Crypt
- 🥇 团队协作：Git-Crypt
- 🥈 简单备份：私有仓库

---

## ⚠️ 安全提醒

**永远不要在公开仓库存储：**
- 🚫 密码、API 密钥、Token
- 🚫 个人隐私信息（身份证、地址、电话）
- 🚫 公司机密
- 🚫 客户数据

**即使设置了 `draft: true` 或 `visibility: "private"`，源文件仍会被提交到 Git！**

### 如果不小心泄露了敏感信息：

```bash
# 1. 立即更换密钥/密码！

# 2. 清理 Git 历史（危险操作，先备份！）
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret/file" \
  --prune-empty --tag-name-filter cat -- --all

# 3. 强制推送
git push origin --force --all

# 4. 通知所有协作者重新克隆仓库
```

或使用更安全的工具：
```bash
# 使用 BFG Repo-Cleaner
brew install bfg
bfg --delete-files secret-file.md
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

---

## 📖 详细文档

### Git-Crypt 完整指南

查看 **[GIT_CRYPT_GUIDE.md](./GIT_CRYPT_GUIDE.md)** 了解：
- 完整安装步骤
- 团队协作配置
- CI/CD 集成
- 故障排查
- 进阶技巧

### 高级文章管理

查看 **[ADVANCED_POST_MANAGEMENT.md](./ADVANCED_POST_MANAGEMENT.md)** 了解：
- 所有文章控制选项
- 可见性管理
- 排序和推荐
- 布局自定义
- SEO 控制

---

## 🎉 实战示例

### 示例 1：混合公开和私密内容

```
src/content/posts/
├── tutorials/          # 公开教程（明文）
│   ├── guide.md
│   └── astro.md
├── private/           # 私密内容（加密）
│   ├── diary.md       # 个人日记
│   └── drafts.md      # 草稿笔记
└── team-internal/     # 团队内部（加密）
    └── meeting.md     # 会议记录
```

**.gitattributes 配置**：
```gitattributes
# 加密私密目录
src/content/posts/private/** filter=git-crypt diff=git-crypt
src/content/posts/team-internal/** filter=git-crypt diff=git-crypt

# 环境变量
.env.* filter=git-crypt diff=git-crypt
```

### 示例 2：完全本地私密

**.gitignore 配置**：
```gitignore
# 完全私密，不提交
src/content/posts/private/
src/content/posts/personal/

# 敏感配置
.env.local
config/secrets.ts
```

---

## 🆘 需要帮助？

1. **Git-Crypt 问题**：查看 [GIT_CRYPT_GUIDE.md](./GIT_CRYPT_GUIDE.md) 的故障排查部分
2. **配置问题**：检查 `.gitattributes` 和 `.gitignore` 语法
3. **安全问题**：遵循安全提醒，使用私有仓库或加密

**快速测试**：
```bash
# 测试 Git-Crypt
git-crypt status

# 测试 .gitignore
git status  # 私密文件不应出现

# 测试加密效果
git-crypt lock
cat src/content/posts/private/test.md  # 应该是乱码
git-crypt unlock
```

---

## 🔗 相关资源

- [Git-Crypt GitHub](https://github.com/AGWA/git-crypt)
- [GPG 文档](https://www.gnupg.org/)
- [Git Attributes](https://git-scm.com/docs/gitattributes)
- [GitHub Private Repos](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/managing-repository-settings/setting-repository-visibility)

---

**选择适合你的方案，开始保护你的私密内容吧！** 🔒

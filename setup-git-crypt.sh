#!/bin/bash
# Git-Crypt 快速设置脚本
# 用法：bash setup-git-crypt.sh your@email.com

set -e

EMAIL=${1:-""}

if [ -z "$EMAIL" ]; then
  echo "❌ 请提供邮箱地址！"
  echo "用法: bash setup-git-crypt.sh your@email.com"
  exit 1
fi

echo "🔧 开始配置 Git-Crypt..."

# 检查依赖
echo "📦 检查依赖..."
if ! command -v git-crypt &> /dev/null; then
  echo "❌ git-crypt 未安装！"
  echo "安装方法："
  echo "  macOS:   brew install git-crypt"
  echo "  Ubuntu:  sudo apt install git-crypt"
  exit 1
fi

if ! command -v gpg &> /dev/null; then
  echo "❌ gpg 未安装！"
  echo "安装方法："
  echo "  macOS:   brew install gnupg"
  echo "  Ubuntu:  sudo apt install gnupg"
  exit 1
fi

# 检查 GPG 密钥
echo "🔑 检查 GPG 密钥..."
if ! gpg --list-keys "$EMAIL" &> /dev/null; then
  echo "⚠️  未找到 GPG 密钥，将创建新密钥..."
  echo "请按提示操作（建议选择 4096 位密钥）："
  gpg --full-generate-key
fi

# 初始化 git-crypt
echo "🔐 初始化 git-crypt..."
if [ ! -d ".git-crypt" ]; then
  git-crypt init
  echo "✅ Git-Crypt 初始化成功"
else
  echo "ℹ️  Git-Crypt 已初始化"
fi

# 添加用户
echo "👤 添加 GPG 用户..."
git-crypt add-gpg-user "$EMAIL"
echo "✅ 已添加用户: $EMAIL"

# 创建 .gitattributes
echo "📝 配置加密规则..."
if [ ! -f ".gitattributes" ]; then
  cat > .gitattributes << 'EOF'
# Git-Crypt 加密配置
# 自动生成时间: $(date)

# 加密私密文章
src/content/posts/private/** filter=git-crypt diff=git-crypt

# 加密环境变量
.env.local filter=git-crypt diff=git-crypt
.env.production filter=git-crypt diff=git-crypt

# 加密配置密钥
config/secrets.ts filter=git-crypt diff=git-crypt
EOF
  echo "✅ 已创建 .gitattributes"
else
  echo "ℹ️  .gitattributes 已存在，请手动添加加密规则"
fi

# 创建私密目录
echo "📁 创建私密文章目录..."
mkdir -p src/content/posts/private
echo "✅ 已创建 src/content/posts/private/"

# 创建测试文件
echo "📄 创建测试文件..."
cat > src/content/posts/private/test-encrypted.md << 'EOF'
---
title: Git-Crypt 加密测试
published: 2025-11-17
tags: [测试]
---

# 加密测试

如果你能看到这段文字的明文，说明：
1. ✅ Git-Crypt 已正确配置
2. ✅ 你有解密权限

如果看到乱码，说明文件已被加密，你需要：
- 运行 `git-crypt unlock` 解锁
- 或导入正确的 GPG 密钥

## 测试内容

这是一些私密内容，只有有权限的人才能看到。

- 秘密 1
- 秘密 2
- 秘密 3
EOF
echo "✅ 已创建测试文件"

# 提交配置
echo "💾 提交配置..."
git add .git-crypt .gitattributes src/content/posts/private/
git commit -m "Setup git-crypt encryption" || echo "ℹ️  没有新变更需要提交"

# 验证
echo ""
echo "🎉 Git-Crypt 配置完成！"
echo ""
echo "📊 当前状态："
git-crypt status
echo ""
echo "✅ 加密的文件："
git-crypt status -e
echo ""
echo "📚 接下来："
echo "1. 查看测试文件（应该能看到明文）："
echo "   cat src/content/posts/private/test-encrypted.md"
echo ""
echo "2. 测试加密（锁定后查看）："
echo "   git-crypt lock"
echo "   cat src/content/posts/private/test-encrypted.md  # 应该是乱码"
echo "   git-crypt unlock  # 解锁"
echo ""
echo "3. 导出密钥备份："
echo "   git-crypt export-key ~/git-crypt-key.backup"
echo ""
echo "4. 添加团队成员："
echo "   git-crypt add-gpg-user teammate@email.com"
echo ""
echo "🔐 密钥已保存在：.git-crypt/"
echo "📖 完整指南：GIT_CRYPT_GUIDE.md"

# 🔒 密钥安全防范指南

## 📋 密钥泄露事件回顾

### 泄露原因
- **时间**: 检测到 `AIzaSy***` API密钥泄露
- **文件**: `word_zipfdk_2025110611374200krq.sql` (WordPress数据库备份)
- **路径**: 数据库备份 → Git提交 → 推送公开仓库
- **问题**: `.gitignore` 未覆盖该文件类型

### 影响范围
- ✅ 密钥已失效/重新生成
- ⚠️ Git历史仍包含敏感信息
- 🚨 公开仓库可能已被扫描

---

## 🛡️ 多层防护策略

### 1. 文件级防护 - `.gitignore`

**已添加规则:**
```gitignore
# 数据库文件
*.sql
*.sql.gz
*.sql.zip
*.db
*.sqlite
*.sqlite3

# 备份文件
*.bak
*.backup
*.old
*~
*.swp
*.swo

# 日志文件
*.log
logs/

# 环境变量
.env
.env.*
!.env.example

# 密钥和证书
*.pem
*.key
*.crt
*.cer
*.p12
*.pfx
id_rsa*
*.pub

# 云服务配置
.aws/
.azure/
.gcloud/
credentials.json
service-account.json

# IDE敏感文件
.vscode/settings.json
.idea/workspace.xml
```

### 2. 提交前检测 - Git Hooks

#### 安装 `gitleaks` (密钥扫描工具)

**macOS:**
```bash
brew install gitleaks
```

**Linux:**
```bash
# 下载最新版本
wget https://github.com/gitleaks/gitleaks/releases/download/v8.18.1/gitleaks_8.18.1_linux_x64.tar.gz
tar -xzf gitleaks_8.18.1_linux_x64.tar.gz
sudo mv gitleaks /usr/local/bin/
```

**配置 pre-commit hook:**
```bash
# 创建 .git/hooks/pre-commit
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash

echo "🔍 正在扫描密钥和敏感信息..."

# 运行 gitleaks
gitleaks protect --verbose --staged

if [ $? -eq 1 ]; then
    echo "❌ 检测到密钥泄露!提交已阻止!"
    echo "请移除敏感信息或更新 .gitleaksignore"
    exit 1
fi

echo "✅ 密钥扫描通过"
exit 0
EOF

chmod +x .git/hooks/pre-commit
```

### 3. 环境变量管理

#### ✅ 正确做法

**Cloudflare Pages (当前项目):**
```
项目设置 → Environment variables → Production/Preview
- GITHUB_CLIENT_ID=<值>
- GITHUB_CLIENT_SECRET=<值>
- API_KEY=<值>
```

**本地开发 - `.env`:**
```bash
# .env (已在 .gitignore)
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
```

**代码读取:**
```typescript
// ✅ 正确 - 从环境变量读取
const apiKey = import.meta.env.VITE_API_KEY;
const runtime = locals.runtime as any;
const clientId = runtime?.env?.GITHUB_CLIENT_ID;
```

#### ❌ 错误做法
```typescript
// ❌ 硬编码密钥
const apiKey = "AIzaSy...";

// ❌ 提交 .env 文件
git add .env

// ❌ 在配置文件中明文存储
const config = {
  apiKey: "sk-..."
};
```

### 4. 代码审查清单

**提交前检查:**
- [ ] 运行 `git diff --cached` 检查暂存区
- [ ] 确认无 API密钥、token、密码
- [ ] 确认 `.env` 文件未被追踪
- [ ] 确认数据库备份已排除
- [ ] 运行 `gitleaks protect --staged`

### 5. 泄露后应急处理

**发现泄露后立即:**

1. **撤销密钥** ⚡
   - 登录密钥提供商控制台
   - 立即删除/失效泄露的密钥
   - 生成新密钥并更新环境变量

2. **检查滥用迹象** 🔍
   ```bash
   # 检查API使用日志
   # 查看是否有异常调用
   ```

3. **清理Git历史** 🧹
   ```bash
   # 方案A: 使用 git-filter-repo (推荐)
   pip install git-filter-repo
   git filter-repo --path word_zipfdk_2025110611374200krq.sql --invert-paths

   # 方案B: 使用 BFG Repo-Cleaner
   java -jar bfg.jar --delete-files word_zipfdk_2025110611374200krq.sql
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # 强制推送 (⚠️危险操作)
   git push origin --force --all
   ```

4. **通知团队** 📢
   - 如果是团队仓库,通知所有成员重新clone
   - 更新所有依赖该密钥的服务配置

### 6. 持续监控

**GitHub 密钥扫描:**
- GitHub自动扫描公开仓库
- 启用 Security → Secret scanning alerts

**定期审计:**
```bash
# 每月运行一次完整扫描
gitleaks detect --source . --report-path gitleaks-report.json

# 检查当前配置
git secrets --list
```

---

## 📚 工具推荐

| 工具 | 用途 | 安装 |
|------|------|------|
| **gitleaks** | 密钥扫描 | `brew install gitleaks` |
| **git-secrets** | AWS密钥防护 | `brew install git-secrets` |
| **truffleHog** | Git历史扫描 | `pip install truffleHog` |
| **detect-secrets** | 基线扫描 | `pip install detect-secrets` |

---

## ✅ 最佳实践总结

1. ✅ **永远不要**硬编码密钥
2. ✅ **始终使用**环境变量或密钥管理服务
3. ✅ **提交前**运行密钥扫描工具
4. ✅ **定期轮换**API密钥和访问令牌
5. ✅ **最小权限**原则配置密钥权限
6. ✅ **监控使用**密钥使用日志
7. ✅ **立即响应** GitHub安全告警

---

## 🆘 紧急联系方式

- **GitHub Support**: https://support.github.com/
- **密钥提供商支持**: 查看相应服务文档

---

**最后更新**: 2025-11-12
**维护者**: Security Team

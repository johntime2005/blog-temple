# 🔐 安全检查清单

## 部署前检查

### 代码层面
- [x] OAuth state 使用 HMAC-SHA256 签名
- [x] State 存储在 httpOnly cookie 中
- [x] Callback 验证 state 的完整性和时效性
- [x] 所有用户输入经过转义和验证
- [x] API 端点有请求大小限制
- [x] 调试端点已删除
- [x] 所有响应包含安全头
- [x] Token 使用 sessionStorage 而非 localStorage

### 配置层面
- [ ] Cloudflare Pages 环境变量已设置
  - [ ] GITHUB_CLIENT_ID
  - [ ] GITHUB_CLIENT_SECRET
- [ ] GitHub OAuth App 配置正确
  - [ ] Callback URL: https://blog.johntime.top/auth/callback
  - [ ] 仓库访问权限正确

### 测试层面
- [ ] 本地测试通过 (`pnpm dev`)
- [ ] OAuth 登录流程正常
- [ ] 配置生成功能正常
- [ ] 删除的端点无法访问

---

## 部署后检查

### 功能测试
- [ ] 博客首页正常访问
- [ ] OAuth 登录成功
- [ ] CMS 管理后台正常
- [ ] 文章创建和编辑正常

### 安全测试
- [ ] 调试端点返回 404
- [ ] 安全响应头存在
- [ ] OAuth state 验证工作
- [ ] API 输入验证工作

---

## 监控清单

### 定期检查（每周）
- [ ] 查看 Cloudflare Pages 部署日志
- [ ] 检查是否有异常的 OAuth 尝试
- [ ] 监控博客访问量和性能

### 月度检查
- [ ] 运行 `npm audit` 检查依赖漏洞
- [ ] 更新过期的依赖包
- [ ] 审查 GitHub OAuth App 的访问日志

### 季度检查
- [ ] 完整的安全审计
- [ ] 备份博客内容
- [ ] 更新安全文档

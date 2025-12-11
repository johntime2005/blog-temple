# Cloudflare 缓存清除指南

由于 Decap CMS 持续报错，需要清除 Cloudflare CDN 缓存。

## 方法 1：通过 Cloudflare Dashboard（推荐）

1. 访问 https://dash.cloudflare.com/
2. 选择你的域名 `johntime.top`
3. 左侧菜单选择 **"Caching"** → **"Configuration"**
4. 找到 **"Purge Cache"** 部分
5. 点击 **"Purge Everything"** 按钮
6. 确认清除

## 方法 2：清除特定文件

如果不想清除所有缓存，只清除 admin 相关：

1. 在 Caching → Configuration 页面
2. 选择 **"Custom Purge"**
3. 输入以下 URL：
   ```
   https://blog.johntime.top/admin/
   https://blog.johntime.top/admin/index.html
   ```
4. 点击 **"Purge"**

## 方法 3：通过 API（可选）

如果你有 Cloudflare API Token：

```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

## 验证缓存已清除

清除后，访问：
```
https://blog.johntime.top/admin/index.html?nocache=1
```

然后查看页面源代码，确认包含最新的配置。

## 注意事项

- 清除缓存后需要等待 1-2 分钟才能生效
- 首次访问可能会稍慢，因为需要重新缓存
- 如果仍有问题，尝试隐私模式访问

---

生成时间：2025-11-01

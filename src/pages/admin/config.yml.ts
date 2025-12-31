
export const prerender = false;

export async function GET({ url }) {
	const origin = url.origin;

	// Embedded config template to avoid file system access issues in Cloudflare Pages Functions
	const configTemplate = `# Decap CMS 配置文件
# 文档: https://decapcms.org/docs/configuration-options/

backend:
  name: github
  repo: johntime2005/blog
  branch: main
  base_url: ${origin}
  auth_endpoint: auth/login/

# 本地开发模式 (仅在开发环境启用)
${import.meta.env.DEV ? "local_backend: true" : ""}

# 媒体文件配置
media_folder: "public/assets/images"
public_folder: "/assets/images"

# 发布模式
publish_mode: editorial_workflow

# 站点配置
site_url: ${origin}
display_url: ${origin}
logo_url: /favicon/favicon-light-128.png

collections:
  # 博客文章集合
  - name: "posts"
    label: "博客文章"
    label_singular: "文章"
    folder: "src/content/posts"
    create: true
    slug: "{{category}}/{{slug}}"
    preview_path: "posts/{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string", required: true }
      - { label: "发布日期", name: "published", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: true }
      - { label: "置顶", name: "pinned", widget: "boolean", default: false, required: false }
      - { label: "简介", name: "description", widget: "text", required: true }
      - { label: "标签", name: "tags", widget: "list", allow_add: true, default: ["博客"], required: true }
      - { label: "分类", name: "category", widget: "relation", collection: "categories", value_field: "title", search_fields: ["title"], display_fields: ["title"], default: "默认分类", required: true }
      - { label: "草稿", name: "draft", widget: "boolean", default: false, required: true }
      - { label: "从主页隐藏", name: "hideFromHome", widget: "boolean", default: false, required: false, hint: "开启后文章不会在主页显示，但可通过直接链接访问" }
      - { label: "加密文章", name: "encrypted", widget: "boolean", default: false, required: false }
      - { label: "加密密码/ID", name: "encryptionId", widget: "string", required: false, hint: "输入密码或加密ID，启用上方开关后生效" }
      - { label: "封面图", name: "image", widget: "image", required: false, hint: "可选：文章封面图片" }
      - { label: "正文", name: "body", widget: "markdown", required: true }

    view_groups:
      - label: "按分类"
        field: "category"
      - label: "按年份"
        field: "published"
        pattern: "\\\\d{4}"
      - label: "草稿状态"
        field: "draft"

    view_filters:
      - label: "仅草稿"
        field: "draft"
        pattern: true
      - label: "仅已发布"
        field: "draft"
        pattern: false

  # 全局设置
  - name: "settings"
    label: "全局设置"
    files:
      - label: "同步设置"
        name: "sync_config"
        file: "src/data/syncConfig.json"
        fields:
          - label: "公开分类列表"
            name: "publicCategories"
            widget: "list"
            hint: "输入需要同步到公共仓库的分类名称（区分大小写，英文）。只有在此列表中的分类文件夹才会被公开。"
            default: ["tutorials"]

  # WordPress迁移文章
  - name: "wordpress-posts"
    label: "WordPress文章"
    label_singular: "WordPress文章"
    folder: "src/content/posts/wordpress-import"
    create: true
    slug: "{{slug}}"
    preview_path: "posts/{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string", required: true }
      - { label: "发布日期", name: "published", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: true }
      - { label: "置顶", name: "pinned", widget: "boolean", default: false, required: false }
      - { label: "简介", name: "description", widget: "text", required: true }
      - { label: "标签", name: "tags", widget: "list", allow_add: true, default: ["WordPress迁移"], required: true }
      - { label: "分类", name: "category", widget: "string", default: "博客", required: true }
      - { label: "草稿", name: "draft", widget: "boolean", default: false, required: true }
      - { label: "从主页隐藏", name: "hideFromHome", widget: "boolean", default: false, required: false }
      - { label: "封面图", name: "image", widget: "image", required: false }
      - { label: "正文", name: "body", widget: "markdown", required: true }

  # 教程文章
  - name: "tutorials"
    label: "教程文章"
    label_singular: "教程"
    folder: "src/content/posts/tutorials"
    create: true
    slug: "{{slug}}"
    preview_path: "posts/tutorials/{{slug}}"
    fields:
      - { label: "标题", name: "title", widget: "string", required: true }
      - { label: "发布日期", name: "published", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: true }
      - { label: "简介", name: "description", widget: "text", required: true }
      - { label: "标签", name: "tags", widget: "list", allow_add: true, default: ["Firefly", "教程"], required: true }
      - { label: "分类", name: "category", widget: "string", default: "博客教程", required: true }
      - { label: "草稿", name: "draft", widget: "boolean", default: false, required: true }
      - { label: "从主页隐藏", name: "hideFromHome", widget: "boolean", default: true, required: false }
      - { label: "封面图", name: "image", widget: "image", required: false }
      - { label: "正文", name: "body", widget: "markdown", required: true }

  # 友链管理
  - name: "friends"
    label: "友链管理"
    files:
      - label: "友情链接"
        name: "friends"
        file: "src/content/spec/friends.md"
        fields:
          - { label: "标题", name: "title", widget: "string", default: "友情链接" }
          - { label: "描述", name: "description", widget: "string", default: "与优秀的朋友们一起成长" }
          - { label: "页面内容", name: "body", widget: "markdown", hint: "编辑友链页面的 Markdown 内容" }

  # 关于页面
  - name: "about"
    label: "关于页面"
    files:
      - label: "关于我"
        name: "about"
        file: "src/content/spec/about.md"
        fields:
          - { label: "页面内容", name: "body", widget: "markdown", hint: "编辑关于页面的 Markdown 内容" }

  # 类别管理
  - name: "categories"
    label: "文章类别"
    label_singular: "类别"
    folder: "src/content/categories"
    create: true
    delete: true
    slug: "{{slug}}"
    extension: "md"
    format: "frontmatter"
    summary: "{{title}} - {{description}}"
    sortable_fields: ["order", "title"]
    fields:
      - { label: "类别名称", name: "title", widget: "string", required: true, hint: "分类的显示名称" }
      - { label: "类别标识", name: "slug", widget: "string", required: false, hint: "URL友好的标识" }
      - { label: "描述", name: "description", widget: "string", required: true, hint: "简短描述" }
      - { label: "排序权重", name: "order", widget: "number", default: 99, value_type: "int" }
      - { label: "图标", name: "icon", widget: "string", required: false, default: "material-symbols:folder" }
      - { label: "颜色", name: "color", widget: "color", required: false, default: "#3b82f6" }
      - { label: "在主页显示", name: "showInHome", widget: "boolean", default: true }
      - { label: "在导航栏显示", name: "showInNavbar", widget: "boolean", default: false }
      - { label: "同步到公共仓库", name: "syncToPublic", widget: "boolean", default: false }
      - { label: "自定义链接", name: "customLink", widget: "string", required: false }
`;

	return new Response(configTemplate, {
		headers: {
			"Content-Type": "text/yaml; charset=utf-8",
		},
	});
}

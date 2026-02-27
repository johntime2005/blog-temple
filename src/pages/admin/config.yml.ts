import type { APIContext } from "astro";

export const prerender = false;

const postModules = import.meta.glob("/src/content/posts/**/*.{md,mdx}", {
	eager: false,
});

interface DirConfig {
	label: string;
	singular: string;
	create: boolean;
}

const knownDirs: Record<string, DirConfig> = {
	diary: { label: "📓 日记", singular: "日记", create: true },
	tutorials: { label: "📖 教程文章", singular: "教程", create: true },
	"diary/wordpress-import": {
		label: "📦 WordPress 迁移",
		singular: "迁移文章",
		create: false,
	},
};

function discoverSubdirs(): string[] {
	const dirs = new Set<string>();
	for (const filePath of Object.keys(postModules)) {
		const rel = filePath.replace("/src/content/posts/", "");
		const segments = rel.split("/");
		if (segments.length > 1) {
			dirs.add(segments.slice(0, -1).join("/"));
		}
	}
	return Array.from(dirs).sort();
}

function getDirConfig(dir: string): DirConfig {
	if (knownDirs[dir]) return knownDirs[dir];
	const name = dir.split("/").pop() || dir;
	return {
		label: `📁 ${name.charAt(0).toUpperCase() + name.slice(1)}`,
		singular: name,
		create: true,
	};
}

function toCollectionName(dir: string): string {
	return dir.replace(/\//g, "-");
}

export async function GET({ url }: APIContext): Promise<Response> {
	const origin = url.origin;
	const subdirs = discoverSubdirs();

	const postFields = `    fields:
      # === 基础信息 ===
      - { label: "标题", name: "title", widget: "string", required: true }
      - { label: "发布日期", name: "published", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: true }
      - { label: "更新日期", name: "updated", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: false }
      - { label: "简介", name: "description", widget: "text", required: false, default: "" }
      - { label: "封面图", name: "image", widget: "image", required: false, hint: "可选：文章封面图片" }
      - { label: "正文", name: "body", widget: "markdown", required: true, modes: [raw, rich_text], editor_components: [code-block, image] }

      # === 分类与标签 ===
      - { label: "分类", name: "category", widget: "relation", collection: "categories", value_field: "title", search_fields: ["title"], display_fields: ["title"], required: false }
      - { label: "标签", name: "tags", widget: "list", allow_add: true, default: [], required: false }

      # === 文章状态 ===
      - { label: "草稿", name: "draft", widget: "boolean", default: false }
      - { label: "置顶", name: "pinned", widget: "boolean", default: false }

      # === 可见性控制 ===
      - label: "可见性"
        name: "visibility"
        widget: "select"
        options: ["public", "unlisted", "private"]
        default: "public"
        hint: "public=公开, unlisted=不列出但可直接访问, private=私有"
        required: false
      - { label: "从主页隐藏", name: "hideFromHome", widget: "boolean", default: false, required: false, hint: "开启后文章不会在主页显示" }
      - { label: "从归档隐藏", name: "hideFromArchive", widget: "boolean", default: false, required: false, hint: "开启后文章不会在归档页显示" }
      - { label: "从搜索隐藏", name: "hideFromSearch", widget: "boolean", default: false, required: false, hint: "开启后文章不会出现在搜索结果中" }
      - { label: "在侧边栏显示", name: "showInWidget", widget: "boolean", default: true, required: false }

      # === 排序与推荐 ===
      - { label: "自定义排序", name: "customOrder", widget: "number", required: false, hint: "数字越小越靠前" }
      - { label: "推荐级别", name: "featuredLevel", widget: "number", default: 0, required: false, hint: "0-5, 0为不推荐" }

      # === 布局控制 ===
      - label: "文章布局"
        name: "postLayout"
        widget: "select"
        options: ["default", "wide", "fullscreen", "no-sidebar"]
        default: "default"
        required: false

      # === SEO 控制 ===
      - { label: "禁止搜索引擎索引", name: "seoNoIndex", widget: "boolean", default: false, required: false }
      - { label: "禁止搜索引擎跟踪链接", name: "seoNoFollow", widget: "boolean", default: false, required: false }

      # === 访问控制 ===
      - label: "访问级别"
        name: "accessLevel"
        widget: "select"
        options: ["public", "members-only", "restricted"]
        default: "public"
        required: false
        hint: "public=公开, members-only=仅登录用户, restricted=受限"

      # === 加密 ===
      - { label: "加密文章", name: "encrypted", widget: "boolean", default: false, required: false }
      - { label: "加密密码/ID", name: "encryptionId", widget: "string", required: false, hint: "输入密码或加密ID，启用上方开关后生效" }

      # === 多语言与作者 ===
      - { label: "文章语言", name: "lang", widget: "string", required: false, default: "", hint: "留空继承站点语言" }
      - { label: "作者", name: "author", widget: "string", required: false, default: "" }
      - { label: "允许评论", name: "comment", widget: "boolean", default: true, required: false }

      # === 许可证 ===
      - { label: "来源链接", name: "sourceLink", widget: "string", required: false, default: "" }
      - { label: "许可证名称", name: "licenseName", widget: "string", required: false, default: "" }
      - { label: "许可证链接", name: "licenseUrl", widget: "string", required: false, default: "" }`;

	const viewConfig = `    view_groups:
      - label: "按分类"
        field: "category"
      - label: "按年份"
        field: "published"
        pattern: "\\\\d{4}"
      - label: "草稿状态"
        field: "draft"
      - label: "可见性"
        field: "visibility"

    view_filters:
      - label: "仅草稿"
        field: "draft"
        pattern: true
      - label: "仅已发布"
        field: "draft"
        pattern: false
      - label: "已加密"
        field: "encrypted"
        pattern: true
      - label: "已置顶"
        field: "pinned"
        pattern: true`;

	const dirCollections = subdirs
		.map((dir) => {
			const cfg = getDirConfig(dir);
			const name = toCollectionName(dir);
			return `  - name: "${name}"
    label: "${cfg.label}"
    label_singular: "${cfg.singular}"
    folder: "src/content/posts/${dir}"
    create: ${cfg.create}
    slug: "{{slug}}"
    preview_path: "posts/{{slug}}"
    summary: "{{title}} ({{published}})"
${postFields}

${viewConfig}`;
		})
		.join("\n\n");

	const rootCollection = `  - name: "posts"
    label: "📝 其他文章"
    label_singular: "文章"
    folder: "src/content/posts"
    create: true
    slug: "{{slug}}"
    preview_path: "posts/{{slug}}"
    summary: "{{title}} ({{published}})"
${postFields}

${viewConfig}`;

	const configTemplate = `# Sveltia CMS 配置文件
# 文档: https://sveltiacms.app/en/docs/config-basics

backend:
  name: github
  repo: johntime2005/blog
  branch: main
  base_url: ${origin}
  auth_endpoint: /auth/login/

# 媒体文件配置
media_folder: "public/assets/images"
public_folder: "/assets/images"
media_library:
  max_file_size: 10240000
  folder_support: true

# 站点配置
site_url: ${origin}
display_url: ${origin}

# Sveltia CMS 自定义选项
logo:
  src: /favicon/favicon-light-128.png

omit_empty_optional_fields: true

collections:
${dirCollections}

${rootCollection}

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
          - { label: "页面内容", name: "body", widget: "markdown", hint: "编辑友链页面的 Markdown 内容", modes: [raw, rich_text] }

  # 关于页面
  - name: "about"
    label: "关于页面"
    files:
      - label: "关于我"
        name: "about"
        file: "src/content/spec/about.md"
        fields:
          - { label: "页面内容", name: "body", widget: "markdown", hint: "编辑关于页面的 Markdown 内容", modes: [raw, rich_text] }

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
      - { label: "加密分类", name: "encrypted", widget: "boolean", default: false, hint: "开启后该分类下的文章默认启用加密" }
      - { label: "自定义链接", name: "customLink", widget: "string", required: false }
`;

	return new Response(configTemplate, {
		headers: {
			"Content-Type": "text/yaml; charset=utf-8",
		},
	});
}

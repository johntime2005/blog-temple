import type { APIContext } from "astro";
import { siteConfig } from "@/config";

// 必须预渲染为静态文件：本站是纯静态部署（functions 模式），
// prerender=false 的路由不会部署，CMS 将拿不到配置文件（404）。
// 目录列表由 import.meta.glob 在构建期解析，静态化没有信息损失。
export const prerender = true;

const postModules = import.meta.glob("/src/content/posts/**/*.{md,mdx}", {
	eager: false,
});

interface DirConfig {
	label: string;
	singular: string;
	create: boolean;
}

// Git submodule 目录无法通过主仓库的 GitHub API 管理，必须排除
const SUBMODULE_DIRS = ["diary"];

const knownDirs: Record<string, DirConfig> = {
	tutorials: { label: "📖 教程文章", singular: "教程", create: true },
};

function discoverSubdirs(): string[] {
	const dirs = new Set<string>();
	for (const filePath of Object.keys(postModules)) {
		const rel = filePath.replace("/src/content/posts/", "");
		const segments = rel.split("/");
		if (segments.length > 1) {
			const dir = segments.slice(0, -1).join("/");
			// 跳过 submodule 目录（它们属于不同的 Git 仓库）
			const isSubmodule = SUBMODULE_DIRS.some(
				(sm) => dir === sm || dir.startsWith(`${sm}/`),
			);
			if (!isSubmodule) {
				dirs.add(dir);
			}
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

export async function GET(_context: APIContext): Promise<Response> {
	// 预渲染时请求 origin 不可靠，使用站点配置的正式域名
	const origin = siteConfig.site_url.replace(/\/$/, "");
	const subdirs = discoverSubdirs();

	const postFieldsBody = `      # === 基础信息 ===
      - { label: "标题", name: "title", widget: "string", required: true }
      - { label: "发布日期", name: "published", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: true }
      - { label: "更新日期", name: "updated", widget: "datetime", date_format: "YYYY-MM-DD", time_format: false, format: "YYYY-MM-DD", required: false }
      - { label: "简介", name: "description", widget: "text", required: false, default: "" }
      - { label: "封面图", name: "image", widget: "image", required: false, hint: "可选：文章封面图片" }
      - { label: "正文", name: "body", widget: "markdown", required: true, modes: [rich_text, raw], editor_components: [code-block, image] }

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
      - { label: "自定义排序", name: "customOrder", widget: "number", value_type: "int", required: false, hint: "数字越小越靠前，留空则按默认排序" }
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

	const postFields = `    fields:
${postFieldsBody}`;

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

	// Sveltia 没有目录管理 UI（嵌套集合官方推迟到 2.0），
	// 借 path 模板让首篇文章落到新目录，Git 提交时目录随之创建
	const newFolderCollection = `  - name: "new-folder"
    label: "📂 新建文件夹"
    label_singular: "新文件夹文章"
    folder: "src/content/posts"
    create: true
    slug: "{{slug}}"
    path: "{{fields.dir}}/{{slug}}"
    preview_path: "posts/{{slug}}"
    summary: "{{title}} ({{published}})"
    fields:
      - { label: "文件夹名", name: "dir", widget: "string", required: true, hint: "输入新文件夹名（建议英文小写加连字符，如 life-notes），保存后文章会创建在 posts/该文件夹/ 下，下次部署后左侧会出现对应的文件夹列表。此入口仅用于新建，编辑已有文章请到对应文件夹列表操作。" }
${postFieldsBody}

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

${newFolderCollection}

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
      - label: "友情链接页面说明"
        name: "friends_page"
        file: "src/content/spec/friends.md"
        fields:
          - { label: "标题", name: "title", widget: "string", default: "友情链接" }
          - { label: "描述", name: "description", widget: "string", default: "与优秀的朋友们一起成长" }
          - { label: "页面内容", name: "body", widget: "markdown", hint: "编辑友链页面的 Markdown 内容", modes: [rich_text, raw] }
      - label: "友链配置"
        name: "friends_config"
        file: "src/data/friends.json"
        fields:
          - label: "展示列数"
            name: "columns"
            widget: "select"
            options: [2, 3]
            default: 2
            value_type: "int"
            hint: "设置在友情链接页面显示为几列"
          - label: "链接列表"
            name: "friends"
            widget: "list"
            summary: "{{fields.title}} - {{fields.siteurl}}"
            hint: "由于博客程序本身构建为静态网页方案，且为避免开发环境下的一些编译依赖错误，当你要在下方列表新建一条友情链接时，建议先填写完“标题”和“链接”再提供其他信息。另外，添加、修改友链等配置都需要重新打包部署。"
            fields:
              - { label: "标题", name: "title", widget: "string", required: true, hint: "友链名称" }
              - { label: "头像链接", name: "imgurl", widget: "string", required: true, hint: "建议使用 HTTPS 链接" }
              - { label: "一句话描述", name: "desc", widget: "string", required: true }
              - { label: "站点链接", name: "siteurl", widget: "string", required: true, hint: "站点的完整 URL，例如 https://example.com" }
              - { label: "标签", name: "tags", widget: "list", required: false, default: ["Blog"], hint: "可选的标签列表" }
              - { label: "权重", name: "weight", widget: "number", value_type: "int", default: 10, hint: "排序权重，数字越大排序越靠前" }
              - { label: "启用", name: "enabled", widget: "boolean", default: true, hint: "取消勾选可以暂时隐藏该友链，而无需删除" }

  # 关于页面
  - name: "about"
    label: "关于页面"
    files:
      - label: "关于我"
        name: "about"
        file: "src/content/spec/about.md"
        fields:
          - { label: "页面内容", name: "body", widget: "markdown", hint: "编辑关于页面的 Markdown 内容", modes: [rich_text, raw] }

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

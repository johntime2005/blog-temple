import { config, fields, collection, singleton } from '@keystatic/core';

// 复用你现有的环境变量名
const GITHUB_CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;
const GITHUB_OWNER_USERNAME = import.meta.env.GITHUB_OWNER_USERNAME || 'johntime2005';

// 强制非 DEV 环境下使用 GitHub 模式
const storage = import.meta.env.DEV
	? { kind: "local" as const }
	: {
			kind: "github" as const,
			repo: `${GITHUB_OWNER_USERNAME}/blog` as `${string}/${string}`,
		};

export default config({
	storage,
	// 显式指定鉴权配置
	...(!import.meta.env.DEV && {
		github: {
			clientId: GITHUB_CLIENT_ID,
			clientSecret: GITHUB_CLIENT_SECRET,
		},
	}),
    collections: {
    posts: collection({
      label: 'Posts',
      slugField: 'title',
      path: 'src/content/posts/*/',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        published: fields.date({ label: 'Published Date', validation: { isRequired: true } }),
        updated: fields.date({ label: 'Updated Date' }),
        description: fields.text({ label: 'Description', multiline: true }),
        tags: fields.array(fields.text({ label: 'Tag' }), { label: 'Tags' }),
        category: fields.text({ label: 'Category' }),
        draft: fields.checkbox({ label: 'Draft', defaultValue: false }),
        image: fields.image({
            label: 'Cover Image',
            directory: 'public/assets/images/posts',
            publicPath: '/assets/images/posts/',
        }),
        content: fields.mdx({
          label: 'Content',
          options: {
            image: {
                directory: 'public/assets/images/posts',
                publicPath: '/assets/images/posts/',
            }
          }
        }),
        encrypted: fields.checkbox({ label: 'Encrypted', defaultValue: false }),
        password: fields.text({ label: 'Access Password' }),
        hideFromHome: fields.checkbox({ label: 'Hide from Home', defaultValue: false }),
        pinned: fields.checkbox({ label: 'Pinned', defaultValue: false }),
        series: fields.text({ label: 'Series' }),
      },
    }),
    categories: collection({
      label: 'Categories',
      slugField: 'title',
      path: 'src/content/categories/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Title' } }),
        description: fields.text({ label: 'Description', multiline: true }),
        showInHome: fields.checkbox({ label: 'Show in Home', defaultValue: true }),
        showInNavbar: fields.checkbox({ label: 'Show in Navbar', defaultValue: false }),
        syncToPublic: fields.checkbox({ label: 'Sync to Public', defaultValue: false }),
        encrypted: fields.checkbox({ label: 'Encrypted', defaultValue: false }),
        order: fields.number({ label: 'Order', defaultValue: 99 }),
        color: fields.text({ label: 'Color (Hex)', defaultValue: '#3b82f6' }),
        icon: fields.text({ label: 'Icon (Iconify)', defaultValue: 'material-symbols:folder' }),
        content: fields.mdx({ label: 'Content' }),
      },
    }),
  },
  singletons: {
    siteConfig: singleton({
      label: 'Site Settings',
      path: 'src/config/siteConfig',
      format: 'json',
      schema: {
        initialized: fields.checkbox({ label: 'Initialized', defaultValue: true }),
        title: fields.text({ label: 'Site Title' }),
        subtitle: fields.text({ label: 'Site Subtitle' }),
        site_url: fields.text({ label: 'Site URL' }),
        description: fields.text({ label: 'Site Description', multiline: true }),
        keywords: fields.array(fields.text({ label: 'Keyword' }), { label: 'Keywords' }),
        lang: fields.select({
            label: 'Language',
            options: [
                { label: 'Chinese (Simplified)', value: 'zh_CN' },
                { label: 'English', value: 'en' },
                { label: 'Japanese', value: 'ja' },
            ],
            defaultValue: 'zh_CN'
        }),
        themeColor: fields.object({
            hue: fields.number({ label: 'Theme Hue (0-360)' }),
            fixed: fields.checkbox({ label: 'Fixed Theme' }),
            defaultMode: fields.select({
                label: 'Default Mode',
                options: [
                    { label: 'System', value: 'system' },
                    { label: 'Light', value: 'light' },
                    { label: 'Dark', value: 'dark' },
                ],
                defaultValue: 'system'
            }),
        }, { label: 'Theme Settings' }),
        
        // Missing fields added
        card: fields.object({
            border: fields.checkbox({ label: 'Show Card Border', defaultValue: true }),
        }, { label: 'Card Style' }),

        favicon: fields.array(fields.object({
            src: fields.text({ label: 'Favicon Path' }), // Simple text for now, could be image
        }), { label: 'Favicons' }),

        navbar: fields.object({
             logo: fields.object({
                 type: fields.text({ label: 'Logo Type' }), // image or text
                 value: fields.text({ label: 'Logo Value' }), // path or text
                 alt: fields.text({ label: 'Logo Alt' }),
             }),
             title: fields.text({ label: 'Navbar Title' }),
             widthFull: fields.checkbox({ label: 'Full Width', defaultValue: false }),
             followTheme: fields.checkbox({ label: 'Follow Theme', defaultValue: false }),
        }, { label: 'Navbar Settings' }),

        siteStartDate: fields.text({ label: 'Site Start Date (YYYY-MM-DD)' }),
        timezone: fields.text({ label: 'Timezone', defaultValue: 'Asia/Shanghai' }),
        
        rehypeCallouts: fields.object({
            theme: fields.text({ label: 'Callout Theme', defaultValue: 'github' }),
        }, { label: 'Callout Settings' }),

        showLastModified: fields.checkbox({ label: 'Show Last Modified', defaultValue: true }),
        outdatedThreshold: fields.number({ label: 'Outdated Threshold (Days)', defaultValue: 30 }),
        sharePoster: fields.checkbox({ label: 'Enable Share Poster', defaultValue: true }),
        generateOgImages: fields.checkbox({ label: 'Generate OG Images', defaultValue: false }),

        bangumi: fields.object({
            userId: fields.text({ label: 'Bangumi User ID' }),
        }, { label: 'Bangumi Config' }),

        pages: fields.object({
            anime: fields.checkbox({ label: 'Enable Anime Page' }),
            sponsor: fields.checkbox({ label: 'Enable Sponsor Page' }),
            guestbook: fields.checkbox({ label: 'Enable Guestbook Page' }),
            bangumi: fields.checkbox({ label: 'Enable Bangumi Page' }),
            projects: fields.checkbox({ label: 'Enable Projects Page' }),
            timeline: fields.checkbox({ label: 'Enable Timeline Page' }),
            skills: fields.checkbox({ label: 'Enable Skills Page' }),
        }, { label: 'Page Visibility' }),

        postListLayout: fields.object({
            defaultMode: fields.select({
                label: 'Default Layout',
                options: [
                    { label: 'List', value: 'list' },
                    { label: 'Grid', value: 'grid' },
                ],
                defaultValue: 'list'
            }),
            allowSwitch: fields.checkbox({ label: 'Allow Switch', defaultValue: true }),
            grid: fields.object({
                masonry: fields.checkbox({ label: 'Masonry Grid', defaultValue: false }),
                columns: fields.number({ label: 'Grid Columns', defaultValue: 3 }),
            }),
        }, { label: 'Post List Layout' }),

        pagination: fields.object({
            postsPerPage: fields.number({ label: 'Posts Per Page', defaultValue: 10 }),
        }, { label: 'Pagination' }),

        analytics: fields.object({
            googleAnalyticsId: fields.text({ label: 'Google Analytics ID' }),
            microsoftClarityId: fields.text({ label: 'Microsoft Clarity ID' }),
        }, { label: 'Analytics' }),

        toc: fields.object({
            enable: fields.checkbox({ label: 'Enable TOC', defaultValue: true }),
            depth: fields.number({ label: 'TOC Depth', defaultValue: 3 }),
        }, { label: 'Table of Contents' }),
      },
    }),
  },
});

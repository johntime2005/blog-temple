import { config, fields, collection, singleton } from '@keystatic/core';

// 复用你现有的环境变量名
const GITHUB_CLIENT_ID = import.meta.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = import.meta.env.GITHUB_CLIENT_SECRET;
const GITHUB_OWNER_USERNAME = import.meta.env.GITHUB_OWNER_USERNAME || 'johntime2005';

export default config({
  storage: import.meta.env.PROD
    ? {
        kind: 'github',
        repo: `${GITHUB_OWNER_USERNAME}/blog`,
      }
    : {
        kind: 'local',
      },
  // 显式指定鉴权配置，复用你的变量
  ...(import.meta.env.PROD && {
    github: {
      clientId: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
    }
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
        hideFromHome: fields.checkbox({ label: 'Hide from Home', defaultValue: false }),
        pinned: fields.checkbox({ label: 'Pinned', defaultValue: false }),
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
        title: fields.text({ label: 'Site Title' }),
        subtitle: fields.text({ label: 'Site Subtitle' }),
        description: fields.text({ label: 'Site Description', multiline: true }),
        lang: fields.select({
            label: 'Language',
            options: [
                { label: 'Chinese (Simplified)', value: 'zh_CN' },
                { label: 'English', value: 'en' },
                { label: 'Japanese', value: 'ja' },
            ],
            defaultValue: 'zh_CN'
        }),
        site_url: fields.text({ label: 'Site URL' }),
        pages: fields.object({
            anime: fields.checkbox({ label: 'Enable Anime Page' }),
            sponsor: fields.checkbox({ label: 'Enable Sponsor Page' }),
            guestbook: fields.checkbox({ label: 'Enable Guestbook Page' }),
            bangumi: fields.checkbox({ label: 'Enable Bangumi Page' }),
            projects: fields.checkbox({ label: 'Enable Projects Page' }),
            timeline: fields.checkbox({ label: 'Enable Timeline Page' }),
            skills: fields.checkbox({ label: 'Enable Skills Page' }),
        }, { label: 'Page Visibility' }),
        navbar: fields.object({
             title: fields.text({ label: 'Navbar Title' }),
        }, { label: 'Navbar Settings' }),
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
        initialized: fields.checkbox({ label: 'Initialized', defaultValue: true }),
        keywords: fields.array(fields.text({ label: 'Keyword' }), { label: 'Keywords' }),
      },
    }),
  },
});

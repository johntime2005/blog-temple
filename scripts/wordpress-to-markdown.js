import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 从 SQL 文件中提取 wp_posts 表的数据
 */
function extractPostsFromSQL(sqlFilePath) {
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

    // 查找 wp_posts 的 INSERT 语句
    const insertMatch = sqlContent.match(/INSERT INTO `wp_posts` VALUES (.+?);/s);

    if (!insertMatch) {
        console.error('无法找到 wp_posts 的 INSERT 语句');
        return [];
    }

    const valuesString = insertMatch[1];
    const posts = [];

    // 解析每一条记录
    // 这是一个简化的解析器,处理基本的情况
    const records = parseInsertValues(valuesString);

    for (const record of records) {
        // WordPress wp_posts 表的列顺序
        const post = {
            ID: record[0],
            post_author: record[1],
            post_date: record[2],
            post_date_gmt: record[3],
            post_content: record[4],
            post_title: record[5],
            post_excerpt: record[6],
            post_status: record[7],
            comment_status: record[8],
            ping_status: record[9],
            post_password: record[10],
            post_name: record[11],
            to_ping: record[12],
            pinged: record[13],
            post_modified: record[14],
            post_modified_gmt: record[15],
            post_content_filtered: record[16],
            post_parent: record[17],
            guid: record[18],
            menu_order: record[19],
            post_type: record[20],
            post_mime_type: record[21],
            comment_count: record[22]
        };

        // 只保留已发布的文章类型
        if (post.post_type === 'post' && post.post_status === 'publish') {
            posts.push(post);
        }
    }

    return posts;
}

/**
 * 解析 SQL INSERT 语句的 VALUES 部分
 */
function parseInsertValues(valuesString) {
    const records = [];
    let currentRecord = [];
    let currentValue = '';
    let inString = false;
    let stringChar = '';
    let escaped = false;
    let depth = 0;

    for (let i = 0; i < valuesString.length; i++) {
        const char = valuesString[i];
        const nextChar = valuesString[i + 1];

        if (escaped) {
            currentValue += char;
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            currentValue += char;
            continue;
        }

        if (!inString) {
            if (char === "'" || char === '"') {
                inString = true;
                stringChar = char;
                continue;
            }

            if (char === '(') {
                depth++;
                if (depth === 1) {
                    currentRecord = [];
                    continue;
                }
            }

            if (char === ')') {
                depth--;
                if (depth === 0) {
                    // 保存当前值
                    currentRecord.push(cleanValue(currentValue));
                    currentValue = '';
                    // 保存记录
                    records.push(currentRecord);
                    currentRecord = [];
                    continue;
                }
            }

            if (char === ',' && depth === 1) {
                currentRecord.push(cleanValue(currentValue));
                currentValue = '';
                continue;
            }

            if (char !== ' ' || currentValue.length > 0) {
                currentValue += char;
            }
        } else {
            if (char === stringChar && nextChar !== stringChar) {
                inString = false;
                continue;
            }

            if (char === stringChar && nextChar === stringChar) {
                currentValue += char;
                i++; // 跳过下一个引号
                continue;
            }

            currentValue += char;
        }
    }

    return records;
}

/**
 * 清理值并解码转义序列
 */
function cleanValue(value) {
    value = value.trim();
    if (value === 'NULL' || value === '') {
        return '';
    }

    // 解码 SQL 转义序列
    value = value.replace(/\\n/g, '\n');  // 换行符
    value = value.replace(/\\r/g, '\r');  // 回车符
    value = value.replace(/\\t/g, '\t');  // 制表符
    value = value.replace(/\\'/g, "'");   // 单引号
    value = value.replace(/\\"/g, '"');   // 双引号
    value = value.replace(/\\\\/g, '\\'); // 反斜杠 (must be last)

    return value;
}

/**
 * 将 WordPress HTML 内容转换为 Markdown
 */
function convertHTMLToMarkdown(html) {
    let markdown = html;

    // 移除 WordPress 块注释
    markdown = markdown.replace(/<!-- wp:[^>]+?-->\n?/gs, '');
    markdown = markdown.replace(/<!-- \/wp:[^>]+?-->\n?/gs, '');

    // 先处理 figure 标签(WordPress 图片块),提取图片
    markdown = markdown.replace(/<figure[^>]*class="wp-block-image[^"]*"[^>]*>(.*?)<\/figure>/gs, (match, content) => {
        // 提取 img 标签
        const imgMatch = content.match(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/);
        if (imgMatch) {
            return `\n\n![${imgMatch[2] || ''}](${imgMatch[1]})\n\n`;
        }
        return content;
    });

    // 转换图片(在移除标签之前)
    markdown = markdown.replace(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '\n\n![$2]($1)\n\n');
    markdown = markdown.replace(/<img[^>]*src="([^"]+)"[^>]*>/g, '\n\n![]($1)\n\n');

    // 转换标题
    for (let i = 1; i <= 6; i++) {
        const regex = new RegExp(`<h${i}[^>]*>(.*?)<\/h${i}>`, 'gs');
        markdown = markdown.replace(regex, (match, content) => {
            return `\n${'#'.repeat(i)} ${content.trim()}\n\n`;
        });
    }

    // 转换链接
    markdown = markdown.replace(/<a[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

    // 转换强调
    markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**');
    markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*');

    // 转换删除线
    markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/g, '~~$1~~');
    markdown = markdown.replace(/<del[^>]*>(.*?)<\/del>/g, '~~$1~~');

    // 转换列表
    markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gs, (match, content) => {
        const items = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
        const listItems = items.map(item => {
            const text = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1').trim();
            return `- ${text}`;
        }).join('\n');
        return `\n${listItems}\n\n`;
    });

    markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gs, (match, content) => {
        const items = content.match(/<li[^>]*>(.*?)<\/li>/gs) || [];
        const listItems = items.map((item, index) => {
            const text = item.replace(/<li[^>]*>(.*?)<\/li>/s, '$1').trim();
            return `${index + 1}. ${text}`;
        }).join('\n');
        return `\n${listItems}\n\n`;
    });

    // 转换代码块
    markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, (match, code) => {
        return `\n\`\`\`\n${code.trim()}\n\`\`\`\n\n`;
    });

    // 转换行内代码
    markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`');

    // 转换引用
    markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, (match, content) => {
        const text = content.trim().replace(/<[^>]+>/g, '');
        const lines = text.split('\n').filter(line => line.trim());
        return '\n' + lines.map(line => `> ${line.trim()}`).join('\n') + '\n\n';
    });

    // 转换段落
    markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gs, (match, content) => {
        return content.trim() + '\n\n';
    });

    // 移除其他 HTML 标签
    markdown = markdown.replace(/<[^>]+>/g, '');

    // 解码 HTML 实体
    markdown = markdown.replace(/&amp;/g, '&');
    markdown = markdown.replace(/&lt;/g, '<');
    markdown = markdown.replace(/&gt;/g, '>');
    markdown = markdown.replace(/&quot;/g, '"');
    markdown = markdown.replace(/&#039;/g, "'");

    // 清理转义的换行符
    markdown = markdown.replace(/\\n/g, '\n');

    // 清理多余的空行(保留最多2个连续换行)
    markdown = markdown.replace(/\n{3,}/g, '\n\n');

    // 清理首尾空白
    markdown = markdown.trim();

    return markdown;
}

/**
 * 生成文件名安全的 slug
 */
function generateSlug(title, date) {
    // 如果标题是中文,使用拼音或日期
    const dateStr = new Date(date).toISOString().split('T')[0];

    // 简单处理:移除特殊字符,转为小写
    let slug = title
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')
        .replace(/\s+/g, '-');

    // 如果 slug 太长或包含中文,使用日期和简短标识
    if (slug.length > 50 || /[\u4e00-\u9fa5]/.test(slug)) {
        slug = `post-${dateStr}`;
    }

    return slug;
}

/**
 * 转换文章为 Markdown 文件
 */
function convertPostToMarkdown(post) {
    const title = post.post_title;
    const date = post.post_date.split(' ')[0]; // 只保留日期部分
    const content = convertHTMLToMarkdown(post.post_content);
    const excerpt = post.post_excerpt ? convertHTMLToMarkdown(post.post_excerpt) : '';

    // 生成 frontmatter
    const frontmatter = `---
title: ${title}
published: ${date}
description: "${excerpt || '从 WordPress 迁移的文章'}"
tags: [WordPress迁移]
category: 博客
draft: false
---

`;

    return {
        frontmatter,
        content,
        filename: `${generateSlug(title, date)}.md`,
        originalSlug: post.post_name
    };
}

/**
 * 主函数
 */
function main() {
    const sqlFilePath = path.join(__dirname, '..', 'word_zipfdk_2025110611374200krq.sql');
    const outputDir = path.join(__dirname, '..', 'src', 'content', 'posts', 'wordpress-import');

    console.log('开始解析 WordPress SQL 文件...');
    const posts = extractPostsFromSQL(sqlFilePath);

    console.log(`找到 ${posts.length} 篇已发布的文章`);

    // 创建输出目录
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    // 转换并保存文章
    let successCount = 0;
    for (const post of posts) {
        try {
            const { frontmatter, content, filename, originalSlug } = convertPostToMarkdown(post);
            const markdown = frontmatter + content;

            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, markdown, 'utf-8');

            console.log(`✓ 已转换: ${post.post_title} -> ${filename}`);
            successCount++;
        } catch (error) {
            console.error(`✗ 转换失败: ${post.post_title}`, error.message);
        }
    }

    console.log(`\n转换完成! 成功: ${successCount}/${posts.length}`);
    console.log(`文件保存在: ${outputDir}`);
}

main();

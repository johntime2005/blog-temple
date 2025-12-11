#!/usr/bin/env node

/**
 * 数据迁移脚本：将现有文章的 category 字段迁移到 columns 字段
 *
 * 使用方法：
 *   node scripts/migrate-to-columns.js [--dry-run]
 *
 * 选项：
 *   --dry-run  仅显示将要修改的文件，不实际修改
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 分类到栏目的映射（可根据实际情况调整）
const categoryToColumns = {
	'博客教程': ['博客教程'],
	'文章示例': ['文章示例'],
	'博客指南': ['博客指南'],
	'博客': ['博客'],
	'前端开发': ['前端开发'],
	'教程': ['博客教程'], // 别名映射
	'示例': ['文章示例'], // 别名映射
};

const isDryRun = process.argv.includes('--dry-run');
const postsDir = path.join(__dirname, '../src/content/posts');

let totalFiles = 0;
let modifiedFiles = 0;
let skippedFiles = 0;

/**
 * 迁移单个文章文件
 */
function migratePost(filePath) {
	totalFiles++;

	try {
		const content = fs.readFileSync(filePath, 'utf-8');
		const { data, content: body } = matter(content);

		let modified = false;

		// 如果已经有 columns 字段，跳过
		if (data.columns && Array.isArray(data.columns) && data.columns.length > 0) {
			console.log(`⏭️  跳过 (已有 columns): ${path.relative(postsDir, filePath)}`);
			skippedFiles++;
			return;
		}

		// 如果有 category，将其迁移到 columns
		if (data.category && data.category.trim()) {
			const category = data.category.trim();
			const columns = categoryToColumns[category] || [category];

			data.columns = columns;
			modified = true;

			console.log(`✅ 迁移: ${path.relative(postsDir, filePath)}`);
			console.log(`   category: "${category}" → columns: [${columns.map(c => `"${c}"`).join(', ')}]`);
		} else {
			console.log(`⏭️  跳过 (无 category): ${path.relative(postsDir, filePath)}`);
			skippedFiles++;
			return;
		}

		if (modified) {
			if (!isDryRun) {
				const newContent = matter.stringify(body, data);
				fs.writeFileSync(filePath, newContent, 'utf-8');
			}
			modifiedFiles++;
		}
	} catch (error) {
		console.error(`❌ 错误处理文件 ${filePath}:`, error.message);
	}
}

/**
 * 递归遍历目录
 */
function walkDir(dir) {
	const files = fs.readdirSync(dir);

	for (const file of files) {
		const filePath = path.join(dir, file);
		const stat = fs.statSync(filePath);

		if (stat.isDirectory()) {
			walkDir(filePath);
		} else if (file.endsWith('.md') || file.endsWith('.mdx')) {
			migratePost(filePath);
		}
	}
}

// 主函数
function main() {
	console.log('🚀 开始迁移文章数据...\n');

	if (isDryRun) {
		console.log('📋 DRY RUN 模式：不会实际修改文件\n');
	}

	if (!fs.existsSync(postsDir)) {
		console.error(`❌ 错误：找不到文章目录 ${postsDir}`);
		process.exit(1);
	}

	walkDir(postsDir);

	console.log('\n📊 迁移统计:');
	console.log(`   总文件数: ${totalFiles}`);
	console.log(`   已修改: ${modifiedFiles}`);
	console.log(`   已跳过: ${skippedFiles}`);

	if (isDryRun) {
		console.log('\n💡 这是 DRY RUN 模式。要实际执行迁移，请运行：');
		console.log('   node scripts/migrate-to-columns.js');
	} else if (modifiedFiles > 0) {
		console.log('\n✨ 迁移完成！请检查修改并提交更改。');
	}
}

main();

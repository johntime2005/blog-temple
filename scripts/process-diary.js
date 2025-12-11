#!/usr/bin/env node

/**
 * 批量处理日记文件，添加 frontmatter
 *
 * 功能：
 * 1. 读取原始日记文件
 * 2. 从文件名提取日期
 * 3. 从内容提取标题和日期
 * 4. 生成标准的 frontmatter
 * 5. 输出到目标目录
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 配置
const SOURCE_DIR = process.argv[2] || path.join(__dirname, '../141ad165-1f76-4ac6-8dae-cffde7141cd4_ExportBlock-271e5df9-1459-4cf5-856e-9b6fd82a571e/ExportBlock-271e5df9-1459-4cf5-856e-9b6fd82a571e-Part-1/日记汇总');
const TARGET_DIR = process.argv[3] || path.join(__dirname, '../diary-temp');

console.log('📝 开始处理日记文件...');
console.log(`源目录: ${SOURCE_DIR}`);
console.log(`目标目录: ${TARGET_DIR}`);

// 确保目标目录存在
if (!fs.existsSync(TARGET_DIR)) {
	fs.mkdirSync(TARGET_DIR, { recursive: true });
}

/**
 * 从文件名提取日期
 * 例如: "24 11 23随笔 xxx.md" -> "2024-11-23"
 */
function extractDateFromFilename(filename) {
	// 匹配格式: YY MM DD
	const match = filename.match(/^(\d{2})\s+(\d{1,2})\s+(\d{1,2})/);
	if (match) {
		const year = parseInt(match[1]) + 2000; // 假设都是 2000 年后
		const month = match[2].padStart(2, '0');
		const day = match[3].padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	return null;
}

/**
 * 从内容提取日期
 * 例如: "date: 2024年11月23日"
 */
function extractDateFromContent(content) {
	const match = content.match(/date:\s*(\d{4})年(\d{1,2})月(\d{1,2})日/);
	if (match) {
		const year = match[1];
		const month = match[2].padStart(2, '0');
		const day = match[3].padStart(2, '0');
		return `${year}-${month}-${day}`;
	}
	return null;
}

/**
 * 从内容提取标题
 * 例如: "# 24.11.23随笔"
 */
function extractTitle(content) {
	const match = content.match(/^#\s+(.+)/m);
	return match ? match[1].trim() : '';
}

/**
 * 确定文章类型
 */
function determineType(filename, title) {
	const text = (filename + title).toLowerCase();
	if (text.includes('梦记') || text.includes('梦')) return '梦记';
	if (text.includes('随笔')) return '随笔';
	if (text.includes('随记')) return '随记';
	if (text.includes('思录')) return '思录';
	return '日记';
}

/**
 * 生成新的文件名（使用日期）
 */
function generateNewFilename(date, type, originalName) {
	// 使用日期和类型生成文件名
	const sanitized = `${date}-${type}`.replace(/[^a-z0-9\u4e00-\u9fa5-]/gi, '-');
	return `${sanitized}.md`;
}

/**
 * 处理单个文件
 */
function processFile(filePath, filename) {
	try {
		// 读取文件内容
		const content = fs.readFileSync(filePath, 'utf-8');

		// 提取信息
		const dateFromFilename = extractDateFromFilename(filename);
		const dateFromContent = extractDateFromContent(content);
		const date = dateFromContent || dateFromFilename;

		if (!date) {
			console.warn(`⚠️  跳过 ${filename} - 无法提取日期`);
			return false;
		}

		const title = extractTitle(content) || filename.replace('.md', '');
		const type = determineType(filename, title);

		// 移除原始的标题和日期行
		let processedContent = content
			.replace(/^#\s+.+$/m, '') // 移除标题
			.replace(/^date:.*$/m, '') // 移除日期行
			.replace(/^ID:.*$/m, '') // 移除ID行
			.trim();

		// 生成 frontmatter
		const frontmatter = `---
title: "${title}"
published: ${date}
description: "${title}"
category: "日记"
tags: ["日记", "${type}"]
draft: false
accessLevel: "members-only"
hideFromSearch: true
lang: "zh_CN"
---

`;

		// 组合最终内容
		const finalContent = frontmatter + processedContent;

		// 生成新文件名
		const newFilename = generateNewFilename(date, type, filename);
		const targetPath = path.join(TARGET_DIR, newFilename);

		// 如果文件已存在，添加序号
		let counter = 1;
		let finalTargetPath = targetPath;
		while (fs.existsSync(finalTargetPath)) {
			const ext = path.extname(newFilename);
			const base = path.basename(newFilename, ext);
			finalTargetPath = path.join(TARGET_DIR, `${base}-${counter}${ext}`);
			counter++;
		}

		// 写入文件
		fs.writeFileSync(finalTargetPath, finalContent, 'utf-8');

		console.log(`✅ ${filename} -> ${path.basename(finalTargetPath)}`);
		return true;
	} catch (error) {
		console.error(`❌ 处理 ${filename} 失败:`, error.message);
		return false;
	}
}

/**
 * 主函数
 */
function main() {
	if (!fs.existsSync(SOURCE_DIR)) {
		console.error(`❌ 源目录不存在: ${SOURCE_DIR}`);
		process.exit(1);
	}

	const files = fs.readdirSync(SOURCE_DIR);
	const mdFiles = files.filter(f => f.endsWith('.md'));

	console.log(`\n找到 ${mdFiles.length} 个 Markdown 文件\n`);

	let successCount = 0;
	let failCount = 0;

	for (const file of mdFiles) {
		const filePath = path.join(SOURCE_DIR, file);
		if (processFile(filePath, file)) {
			successCount++;
		} else {
			failCount++;
		}
	}

	console.log(`\n✨ 处理完成！`);
	console.log(`   成功: ${successCount} 个文件`);
	console.log(`   失败: ${failCount} 个文件`);
	console.log(`\n📁 输出目录: ${TARGET_DIR}`);
}

main();

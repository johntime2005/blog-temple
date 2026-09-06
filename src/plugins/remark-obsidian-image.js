import fs from "node:fs";
import path from "node:path";
import { visit } from "unist-util-visit";

/**
 * 支持 Obsidian 图片嵌入语法的 Remark 插件
 *
 * 将 `![[image.png]]` 转换为标准 Markdown 图片节点，
 * 让使用 Obsidian 编辑的文章可以直接粘贴截图。
 * 支持 `![[image.png|300]]` 形式的尺寸后缀（后缀被忽略）。
 *
 * 图片路径按以下顺序解析（相对于文章文件所在目录）：
 * 1. `./images/image.png`（文章目录下的 images 子目录，推荐约定）
 * 2. `./image.png`（与文章同目录）
 * 3. 仓库根目录（Obsidian 默认粘贴位置）
 *
 * @returns {import('unified').Plugin}
 */

const IMAGE_EXT_RE = /\.(png|jpe?g|gif|webp|avif|svg|bmp)$/i;
const WIKILINK_RE = /!\[\[([^\]\n]+?)(?:\|[^\]]*)?\]\]/g;

function findRepoRoot(startDir) {
	let dir = startDir;
	while (true) {
		if (
			fs.existsSync(path.join(dir, "astro.config.mjs")) ||
			fs.existsSync(path.join(dir, "package.json"))
		) {
			return dir;
		}
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function resolveImageUrl(link, filePath) {
	if (!filePath) {
		return `./images/${link}`;
	}

	const postDir = path.dirname(filePath);
	const repoRoot = findRepoRoot(postDir);
	const candidates = [
		path.join(postDir, "images", link),
		path.join(postDir, link),
		repoRoot ? path.join(repoRoot, link) : null,
	].filter(Boolean);

	for (const candidate of candidates) {
		if (fs.existsSync(candidate)) {
			const rel = path.relative(postDir, candidate).replace(/\\/g, "/");
			return rel.startsWith(".") ? rel : `./${rel}`;
		}
	}

	console.warn(
		`[WARN] Obsidian image not found: ${link} (in ${postDir})`,
	);
	return `./images/${link}`;
}

export function remarkObsidianImage() {
	return (tree, file) => {
		visit(tree, "text", (node, index, parent) => {
			if (!node.value.includes("![[")) return;

			const matches = [...node.value.matchAll(WIKILINK_RE)];
			if (matches.length === 0) return;

			const parts = [];
			let lastIndex = 0;

			for (const match of matches) {
				const link = match[1].trim();

				// 只处理图片嵌入，跳过 `![[笔记]]` 之类的非图片嵌入
				if (!IMAGE_EXT_RE.test(link)) continue;

				if (match.index > lastIndex) {
					parts.push({
						type: "text",
						value: node.value.slice(lastIndex, match.index),
					});
				}

				parts.push({
					type: "image",
					url: resolveImageUrl(link, file.path),
					alt: "",
					title: null,
				});

				lastIndex = match.index + match[0].length;
			}

			parts.push({ type: "text", value: node.value.slice(lastIndex) });

			parent.children.splice(
				index,
				1,
				...parts.filter((part) => part.type !== "text" || part.value !== ""),
			);
		});
	};
}

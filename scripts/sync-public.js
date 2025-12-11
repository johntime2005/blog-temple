import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const PROJECT_ROOT = path.join(__dirname, "..");
const SRC_DIR = path.join(PROJECT_ROOT, "src");
const CONTENT_DIR = path.join(SRC_DIR, "content");
const CATEGORIES_DIR = path.join(CONTENT_DIR, "categories");
const POSTS_DIR = path.join(CONTENT_DIR, "posts");
const OUTPUT_DIR = process.env.SYNC_OUTPUT_DIR
	? path.resolve(process.env.SYNC_OUTPUT_DIR)
	: path.join(PROJECT_ROOT, "dist-public");

// Files and directories to completely ignore
const IGNORES = new Set([
	".git",
	"node_modules",
	"dist",
	"dist-public",
	".env",
	".DS_Store",
	"dist-public",
]);

// Paths to skip during the main recursive copy (handled manually)
const SKIP_RECURSIVE_COPY = new Set([POSTS_DIR, CATEGORIES_DIR]);

function ensureDir(dir) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

function parseFrontmatter(content) {
	try {
		const parsed = matter(content);
		return parsed.data;
	} catch (e) {
		console.warn("Failed to parse frontmatter:", e.message);
		return null;
	}
}

function getSyncCategories() {
	const syncCategories = new Set();
	if (!fs.existsSync(CATEGORIES_DIR)) return syncCategories;

	const files = fs.readdirSync(CATEGORIES_DIR);
	for (const file of files) {
		if (!file.endsWith(".md")) continue;
		const filePath = path.join(CATEGORIES_DIR, file);
		const content = fs.readFileSync(filePath, "utf-8");
		const fm = parseFrontmatter(content);
		if (fm && fm.syncToPublic === true) {
			// We use the title as the category key in posts
			if (fm.title) syncCategories.add(fm.title);
		}
	}
	return syncCategories;
}

function syncPosts(allowedCategories) {
	console.log(
		`Allowed Categories for Sync: ${Array.from(allowedCategories).join(", ")}`,
	);

	// Recursive function to walk directories
	function walk(dir, relativePath = "") {
		const files = fs.readdirSync(dir);
		for (const file of files) {
			const filePath = path.join(dir, file);
			const stat = fs.statSync(filePath);
			const currentRelativePath = path.join(relativePath, file);

			if (stat.isDirectory()) {
				walk(filePath, currentRelativePath);
			} else if (file.endsWith(".md")) {
				const content = fs.readFileSync(filePath, "utf-8");
				const fm = parseFrontmatter(content);

				if (fm?.category && allowedCategories.has(fm.category)) {
					// Sync this file
					const destPath = path.join(
						OUTPUT_DIR,
						"src/content/posts",
						currentRelativePath,
					);
					ensureDir(path.dirname(destPath));
					fs.copyFileSync(filePath, destPath);
					console.log(`Synced Post: ${currentRelativePath}`);
				}
			}
		}
	}

	if (fs.existsSync(POSTS_DIR)) {
		walk(POSTS_DIR);
	}
}

function copyProjectFiles() {
	console.log("Syncing project files...");

	const entries = fs.readdirSync(PROJECT_ROOT);

	for (const entry of entries) {
		const srcPath = path.join(PROJECT_ROOT, entry);
		const destPath = path.join(OUTPUT_DIR, entry);

		// Skip output directory if it's inside project root
		// Compare absolute paths
		if (srcPath === OUTPUT_DIR) continue;

		// Skip ignored top-level files/dirs
		if (IGNORES.has(entry)) continue;

		const filterFunc = (src, _dest) => {
			const basename = path.basename(src);
			if (IGNORES.has(basename)) return false;

			// Exact path match for skipped directories
			if (SKIP_RECURSIVE_COPY.has(src)) {
				console.log(
					`Skipping recursive copy for: ${path.relative(PROJECT_ROOT, src)}`,
				);
				// We still want the directory itself to exist?
				// fs.cpSync filter: "if the filter function returns false, the file or directory is skipped."
				// If we skip the directory, it won't be created.
				// But syncPosts ensures dir exists if it copies files.
				// However, if we skip 'src/content/posts', we might want 'src/content/posts' folder to exist?
				// syncPosts handles 'ensureDir'. So it is fine.
				return false;
			}

			return true;
		};

		try {
			// For directories, we use recursive copy. For files, just copy.
			// cpSync handles both.
			fs.cpSync(srcPath, destPath, {
				recursive: true,
				filter: filterFunc,
				preserveTimestamps: true,
			});
		} catch (err) {
			console.error(`Error copying ${entry}:`, err);
			// Don't crash on individual file error, but maybe rethrow critical ones
			// For now, allow continue
		}
	}
}

function main() {
	try {
		console.log(`Starting sync process to ${OUTPUT_DIR}...`);
		ensureDir(OUTPUT_DIR);

		// 1. Sync entire project structure (excluding skipped paths)
		copyProjectFiles();

		// 2. Identify allowed categories
		const syncCategories = getSyncCategories();
		if (syncCategories.size === 0) {
			console.log(
				"No categories marked for sync. Public repo will have no posts.",
			);
		} else {
			// 3. Sync Posts
			syncPosts(syncCategories);

			// 4. Sync Categories definitions (only allowed ones)
			console.log("Syncing category definitions...");
			const catFiles = fs.readdirSync(CATEGORIES_DIR);
			for (const file of catFiles) {
				if (!file.endsWith(".md")) continue;
				const filePath = path.join(CATEGORIES_DIR, file);
				const content = fs.readFileSync(filePath, "utf-8");
				const fm = parseFrontmatter(content);
				if (fm && fm.syncToPublic === true) {
					const destPath = path.join(
						OUTPUT_DIR,
						"src/content/categories",
						file,
					);
					ensureDir(path.dirname(destPath));
					fs.copyFileSync(filePath, destPath);
					console.log(`Synced Category: ${file}`);
				}
			}
		}

		console.log("Sync completed successfully.");
	} catch (error) {
		console.error("Sync failed:", error);
		process.exit(1);
	}
}

main();

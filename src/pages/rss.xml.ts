import rss, { type RSSFeedItem } from "@astrojs/rss";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import { getSortedPosts } from "@utils/content-utils";
import { url } from "@utils/url-utils";
import type { APIContext } from "astro";
import { siteConfig } from "@/config";
import pkg from "../../package.json";

function stripInvalidXmlChars(str: string): string {
	return str.replace(
		// biome-ignore lint/suspicious/noControlCharactersInRegex: https://www.w3.org/TR/xml/#charsets
		/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F\uFDD0-\uFDEF\uFFFE\uFFFF]/g,
		"",
	);
}

export async function GET(context: APIContext): Promise<Response> {
	const blog = await getSortedPosts();
	const feedItems: RSSFeedItem[] = [];
	for (const post of blog) {
		// 订阅源只输出公开内容：过滤 private / unlisted、加密以及受限访问的文章，
		// 避免非公开内容通过 RSS 外泄。（password 保护的文章仍保留条目，
		// 但正文会被替换为提示文案，见下方分支。）
		if (
			post.data.visibility !== "public" ||
			post.data.accessLevel !== "public" ||
			post.data.encrypted === true
		) {
			continue;
		}
		const description = stripInvalidXmlChars(post.data.description || "");
		if (post.data.password) {
			feedItems.push({
				title: post.data.title,
				pubDate: post.data.published,
				description,
				link: url(`/posts/${post.id}/`),
				content: i18n(I18nKey.passwordProtectedRss),
			});
			continue;
		}
		feedItems.push({
			title: post.data.title,
			pubDate: post.data.published,
			description,
			link: url(`/posts/${post.id}/`),
			content: description,
		});
	}
	return rss({
		title: siteConfig.title,
		description: siteConfig.subtitle || "No description",
		site: context.site ?? "https://firefly.cuteleaf.cn",
		customData: `<templateTheme>Firefly</templateTheme>
		<templateThemeVersion>${pkg.version}</templateThemeVersion>
		<templateThemeUrl>https://github.com/CuteLeaf/Firefly</templateThemeUrl>
		<lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
		items: feedItems,
	});
}

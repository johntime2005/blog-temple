import type { SiteConfig } from "../types/config";
import { fontConfig } from "./fontConfig";
import siteConfigJson from "./siteConfig.json";

// 定义站点语言
// 语言代码，例如：'zh_CN', 'zh_TW', 'en', 'ja', 'ru'。
const _SITE_LANG = siteConfigJson.lang;

export const siteConfig: SiteConfig = {
	...(siteConfigJson as unknown as Omit<SiteConfig, "font">),
	font: fontConfig,
};

import type { SiteConfig } from "../types/config";
import { fontConfig } from "./fontConfig";
import siteConfigJson from "./siteConfig.json";

export const siteConfig: SiteConfig = {
	...(siteConfigJson as unknown as Omit<SiteConfig, "font">),
	font: fontConfig,
};

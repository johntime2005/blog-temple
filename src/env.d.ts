/// <reference types="astro/client" />
/// <reference path="../.astro/types.d.ts" />

declare global {
	interface CloudflareKVNamespace {
		put(
			key: string,
			value: string,
			options?: { expirationTtl?: number; metadata?: unknown },
		): Promise<void>;
		delete(key: string): Promise<void>;
		list(options?: {
			prefix?: string;
		}): Promise<{ keys: Array<{ name: string; metadata?: unknown }> }>;
	}

	namespace App {
		interface Locals {
			runtime?: {
				env?: Record<string, unknown> & {
					POST_ENCRYPTION?: CloudflareKVNamespace;
					GITHUB_OWNER_USERNAME?: string;
					GITHUB_CLIENT_ID?: string;
					GITHUB_CLIENT_SECRET?: string;
					GITHUB_REDIRECT_URI?: string;
				};
			};
		}
	}

	interface ImportMetaEnv {
		readonly MEILI_MASTER_KEY: string;
	}

	interface ITOCManager {
		init: () => void;
		cleanup: () => void;
	}

	interface Window {
		SidebarTOC: {
			manager: ITOCManager | null;
		};
		FloatingTOC: {
			btn: HTMLElement | null;
			panel: HTMLElement | null;
			manager: ITOCManager | null;
			isPostPage: () => boolean;
		};
		toggleFloatingTOC: () => void;
		tocInternalNavigation: boolean;
		// swup is defined in global.d.ts
		spine: any;
		closeAnnouncement: () => void;
	}
}

export {};

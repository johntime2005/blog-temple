<script lang="ts">
import {
	WALLPAPER_BANNER,
	WALLPAPER_NONE,
	WALLPAPER_OVERLAY,
} from "@constants/constants";
import {
	ICON_HIDE_IMAGE_OUTLINE,
	ICON_IMAGE_OUTLINE,
	ICON_WALLPAPER,
} from "@constants/icon-constants";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@iconify/svelte";
import { getStoredWallpaperMode, setWallpaperMode } from "@utils/setting-utils";
import { onMount } from "svelte";
import DropdownItem from "@/components/common/base/DropdownItem.svelte";
import DropdownPanel from "@/components/common/base/DropdownPanel.svelte";
import { siteConfig } from "@/config";
import type { WALLPAPER_MODE } from "@/types/config";

let mode: WALLPAPER_MODE = $state(siteConfig.backgroundWallpaper.mode);

// 在组件挂载时从localStorage读取保存的模式
onMount(() => {
	mode = getStoredWallpaperMode() || WALLPAPER_BANNER;
});

function switchWallpaperMode(newMode: WALLPAPER_MODE) {
	mode = newMode;
	setWallpaperMode(newMode);
}
</script>

<!-- z-50 make the panel higher than other float panels -->
<div class="relative z-50" role="menu" tabindex="-1">
	<button aria-label="Wallpaper Mode" role="menuitem" class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" id="wallpaper-mode-switch">
		{#if mode === WALLPAPER_BANNER}
			<div class="absolute">
				<Icon icon={ICON_IMAGE_OUTLINE} class="text-[1.25rem]"></Icon>
			</div>
		{:else if mode === WALLPAPER_OVERLAY}
			<div class="absolute">
				<Icon icon={ICON_WALLPAPER} class="text-[1.25rem]"></Icon>
			</div>
		{:else if mode === WALLPAPER_NONE}
			<div class="absolute">
				<Icon icon={ICON_HIDE_IMAGE_OUTLINE} class="text-[1.25rem]"></Icon>
			</div>
		{/if}
	</button>
	<div id="wallpaper-mode-panel" class="absolute transition float-panel-closed top-11 -right-2 pt-5 z-50">
		<DropdownPanel>
			<DropdownItem
				isActive={mode === WALLPAPER_BANNER}
				isLast={false}
				onclick={() => switchWallpaperMode(WALLPAPER_BANNER)}
			>
				<Icon icon={ICON_IMAGE_OUTLINE} class="text-[1.25rem] mr-3"></Icon>
				{i18n(I18nKey.wallpaperBannerMode)}
			</DropdownItem>
			<DropdownItem
				isActive={mode === WALLPAPER_OVERLAY}
				isLast={false}
				onclick={() => switchWallpaperMode(WALLPAPER_OVERLAY)}
			>
				<Icon icon={ICON_WALLPAPER} class="text-[1.25rem] mr-3"></Icon>
				{i18n(I18nKey.wallpaperOverlayMode)}
			</DropdownItem>
			<DropdownItem
				isActive={mode === WALLPAPER_NONE}
				isLast={true}
				onclick={() => switchWallpaperMode(WALLPAPER_NONE)}
			>
				<Icon icon={ICON_HIDE_IMAGE_OUTLINE} class="text-[1.25rem] mr-3"></Icon>
				{i18n(I18nKey.wallpaperNoneMode)}
			</DropdownItem>
		</DropdownPanel>
	</div>
</div>

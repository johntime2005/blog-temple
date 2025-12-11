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
import {
	getDefaultHue,
	getHue,
	getStoredWallpaperMode,
	setHue,
	setWallpaperMode,
} from "@utils/setting-utils";
import { onMount } from "svelte";
import { siteConfig } from "@/config";
import type { WALLPAPER_MODE } from "@/types/config";

let hue = $state(getHue());
const defaultHue = getDefaultHue();

function resetHue() {
	hue = getDefaultHue();
}

$effect(() => {
	if (hue || hue === 0) {
		setHue(hue);
	}
});

let wallpaperMode: WALLPAPER_MODE = $state(siteConfig.backgroundWallpaper.mode);

onMount(() => {
	wallpaperMode = getStoredWallpaperMode();
});

function switchWallpaperMode(mode: WALLPAPER_MODE) {
	wallpaperMode = mode;
	setWallpaperMode(mode);
}
</script>

<div id="display-setting" class="float-panel float-panel-closed absolute transition-all w-80 right-4 px-4 py-4">
    <div class="flex flex-row gap-2 mb-3 items-center justify-between">
        <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
            before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
            before:absolute before:-left-3 before:top-[0.33rem]"
        >
            {i18n(I18nKey.themeColor)}
            <button aria-label="Reset to Default" class="btn-regular w-7 h-7 rounded-md  active:scale-90"
                    class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue} onclick={resetHue}>
                <div class="text-[var(--btn-content)]">
                    <Icon icon="fa6-solid:arrow-rotate-left" class="text-[0.875rem]"></Icon>
                </div>
            </button>
        </div>
        <div class="flex gap-1">
            <div id="hueValue" class="transition bg-[var(--btn-regular-bg)] w-10 h-7 rounded-md flex justify-center
            font-bold text-sm items-center text-[var(--btn-content)]">
                {hue}
            </div>
        </div>
    </div>
    <div class="w-full h-6 px-1 bg-[oklch(0.80_0.10_0)] dark:bg-[oklch(0.70_0.10_0)] rounded select-none">
        <input aria-label={i18n(I18nKey.themeColor)} type="range" min="0" max="360" bind:value={hue}
               class="slider" id="colorSlider" step="5" style="width: 100%">
    </div>

    <!-- Wallpaper Mode Switch -->
    {#if siteConfig.backgroundWallpaper.switchable !== false}
        <div class="flex flex-row gap-2 mb-3 mt-4 items-center justify-between">
            <div class="flex gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100 transition relative ml-3
                before:w-1 before:h-4 before:rounded-md before:bg-[var(--primary)]
                before:absolute before:-left-3 before:top-[0.33rem]"
            >
                {i18n(I18nKey.wallpaperMode)}
            </div>
        </div>
        <div class="flex flex-row gap-2 mb-2 bg-[var(--btn-regular-bg)] p-1 rounded-lg">
            <button
                class="flex-1 btn-plain h-9 rounded-md flex items-center justify-center gap-2 transition"
                class:bg-[var(--primary)]={wallpaperMode === WALLPAPER_BANNER}
                class:text-white={wallpaperMode === WALLPAPER_BANNER}
                onclick={() => switchWallpaperMode(WALLPAPER_BANNER)}
                title={i18n(I18nKey.wallpaperBannerMode)}
            >
                <Icon icon={ICON_IMAGE_OUTLINE} class="text-xl"></Icon>
            </button>
            <button
                class="flex-1 btn-plain h-9 rounded-md flex items-center justify-center gap-2 transition"
                class:bg-[var(--primary)]={wallpaperMode === WALLPAPER_OVERLAY}
                class:text-white={wallpaperMode === WALLPAPER_OVERLAY}
                onclick={() => switchWallpaperMode(WALLPAPER_OVERLAY)}
                title={i18n(I18nKey.wallpaperOverlayMode)}
            >
                <Icon icon={ICON_WALLPAPER} class="text-xl"></Icon>
            </button>
            <button
                class="flex-1 btn-plain h-9 rounded-md flex items-center justify-center gap-2 transition"
                class:bg-[var(--primary)]={wallpaperMode === WALLPAPER_NONE}
                class:text-white={wallpaperMode === WALLPAPER_NONE}
                onclick={() => switchWallpaperMode(WALLPAPER_NONE)}
                title={i18n(I18nKey.wallpaperNoneMode)}
            >
                <Icon icon={ICON_HIDE_IMAGE_OUTLINE} class="text-xl"></Icon>
            </button>
        </div>
    {/if}
</div>


<style lang="stylus">
    #display-setting
      input[type="range"]
        -webkit-appearance none
        height 1.5rem
        background-image var(--color-selection-bar)
        transition background-image 0.15s ease-in-out

        /* Input Thumb */
        &::-webkit-slider-thumb
          -webkit-appearance none
          height 1rem
          width 0.5rem
          border-radius 0.125rem
          background rgba(255, 255, 255, 0.7)
          box-shadow none
          &:hover
            background rgba(255, 255, 255, 0.8)
          &:active
            background rgba(255, 255, 255, 0.6)

        &::-moz-range-thumb
          -webkit-appearance none
          height 1rem
          width 0.5rem
          border-radius 0.125rem
          border-width 0
          background rgba(255, 255, 255, 0.7)
          box-shadow none
          &:hover
            background rgba(255, 255, 255, 0.8)
          &:active
            background rgba(255, 255, 255, 0.6)

        &::-ms-thumb
          -webkit-appearance none
          height 1rem
          width 0.5rem
          border-radius 0.125rem
          background rgba(255, 255, 255, 0.7)
          box-shadow none
          &:hover
            background rgba(255, 255, 255, 0.8)
          &:active
            background rgba(255, 255, 255, 0.6)

</style>

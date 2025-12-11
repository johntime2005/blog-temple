<script lang="ts">
import { DARK_MODE, LIGHT_MODE, SYSTEM_MODE } from "@constants/constants.ts";
import Icon from "@iconify/svelte";
import {
	getStoredTheme,
	setTheme,
	setupSystemThemeListener,
} from "@utils/setting-utils.ts";
import type { LIGHT_DARK_MODE } from "@/types/config.ts";

const seq: LIGHT_DARK_MODE[] = [LIGHT_MODE, DARK_MODE, SYSTEM_MODE];
let mode: LIGHT_DARK_MODE = $state(getStoredTheme() || LIGHT_MODE);

function switchScheme(newMode: LIGHT_DARK_MODE) {
	mode = newMode;
	setTheme(newMode);
}

function toggleScheme() {
	let i = 0;
	for (; i < seq.length; i++) {
		if (seq[i] === mode) {
			break;
		}
	}
	switchScheme(seq[(i + 1) % seq.length]);
}

// Adding Swup hook logic...
if (typeof window !== "undefined") {
	const handleContentReplace = () => {
		requestAnimationFrame(() => {
			const newMode = getStoredTheme();
			if (mode !== newMode) {
				mode = newMode;
			}
		});
	};

	if ((window as any).swup?.hooks) {
		(window as any).swup.hooks.on("content:replace", handleContentReplace);
	} else {
		document.addEventListener("swup:enable", () => {
			if ((window as any).swup?.hooks) {
				(window as any).swup.hooks.on("content:replace", handleContentReplace);
			}
		});
	}

	document.addEventListener("DOMContentLoaded", () => {
		requestAnimationFrame(() => {
			const newMode = getStoredTheme();
			if (mode !== newMode) {
				mode = newMode;
			}
			if (newMode === SYSTEM_MODE) {
				setupSystemThemeListener();
			}
		});
	});
}
</script>

<div class="relative z-50">
    <button aria-label="Light/Dark/System Mode" class="relative btn-plain scale-animation rounded-lg h-11 w-11 active:scale-90" id="scheme-switch" onclick={toggleScheme}>
        <div class="absolute" class:opacity-0={mode !== LIGHT_MODE}>
            <Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.25rem]"></Icon>
        </div>
        <div class="absolute" class:opacity-0={mode !== DARK_MODE}>
            <Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.25rem]"></Icon>
        </div>
        <div class="absolute" class:opacity-0={mode !== SYSTEM_MODE}>
            <Icon icon="material-symbols:brightness-auto-outline-rounded" class="text-[1.25rem]"></Icon>
        </div>
    </button>
</div>
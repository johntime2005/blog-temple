<script lang="ts">
import { onMount } from "svelte";

let isAdmin = false;
let isMounted = false;

onMount(() => {
	isMounted = true;
	checkAdminStatus();

	// Listen for storage changes (in case login happens in another tab)
	window.addEventListener("storage", checkAdminStatus);
	return () => {
		window.removeEventListener("storage", checkAdminStatus);
	};
});

function checkAdminStatus() {
	try {
		// Check standard user token
		const token = localStorage.getItem("user-token");

		// Also check Decap CMS user data which might contain role info now
		const cmsUserStr = localStorage.getItem("netlify-cms-user");
		let cmsUser = null;
		if (cmsUserStr) {
			try {
				cmsUser = JSON.parse(cmsUserStr);
			} catch (e) {
				console.error("Failed to parse cms user", e);
			}
		}

		// We consider the user an admin if:
		// 1. They have a token AND
		// 2. The CMS user data says they are an admin
		// Note: For stronger security, the backend /admin route should also verify this.
		// This button is just a UI convenience.
		if (token && cmsUser && cmsUser.role === "admin") {
			isAdmin = true;
		} else {
			isAdmin = false;
		}
	} catch (e) {
		console.error("Error checking admin status", e);
		isAdmin = false;
	}
}
</script>

{#if isMounted && isAdmin}
    <a href="/admin" class="btn-plain scale-animation rounded-lg h-11 w-11 flex items-center justify-center active:scale-90" aria-label="Backend Panel" title="Backend Panel">
        <svg xmlns="http://www.w3.org/2000/svg" width="1.25em" height="1.25em" viewBox="0 0 24 24"><path fill="currentColor" d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12c5.16-1.26 9-6.45 9-12V5zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>
    </a>
{/if}

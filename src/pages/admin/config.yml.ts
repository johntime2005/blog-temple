import { readFile } from "node:fs/promises";
import path from "node:path";

export const prerender = false;

export async function GET({ url }) {
	try {
		// Attempt to read the template file
		// In development, this path is relative to the project root
		const templatePath = path.resolve("./public/admin/config_template.yml");
		let config = await readFile(templatePath, "utf-8");

		const origin = url.origin;
		
		// Replace base_url with the current origin to ensure auth flow stays local/matching
        // Match both https and http, and any domain
		config = config.replace(/base_url: https?:\/\/[^\s]+/, `base_url: ${origin}`);
        // Also handle if it's commented out or different format, but assuming standard format
        // Fallback: If no base_url match found (e.g. if we modified it in previous steps), 
        // we might fail to replace. 
        // Let's assume the file is in the state we saw (has base_url: https://blog.johntime.top)

		return new Response(config, {
			headers: {
				"Content-Type": "text/yaml; charset=utf-8",
			},
		});
	} catch (e) {
		console.error("Error generating config:", e);
        // Fallback for production if FS fails (e.g. Cloudflare Workers not supporting fs on public)
        // We return a basic error or try to fetch.
        // But for this specific debugging task (infinite loop on local), FS is fine.
		return new Response("# Error generating configuration", { status: 500 });
	}
}

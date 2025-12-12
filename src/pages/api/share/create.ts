import { generateSecureToken } from "@utils/security";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { token, slug, expiresInMinutes, password } = await request.json();

		if (!token || !slug) {
			return new Response(
				JSON.stringify({ success: false, message: "Missing params" }),
				{ status: 400 },
			);
		}

		// Auth Check: Owner Only
		const runtime = (locals as any).runtime as any;
		// Reuse admin token logic from AdminPanel (which uses a simple fixed password or token?)
		// AdminPanel uses 'admin-token' verified via api/admin/verify-token.
		// BUT wait, AdminPanel logic uses `api/admin/*`.
		// Let's check `api/admin/verify-token`.
		// Actually, I should use the Github Owner check for consistency with recent changes.
		// If the user uses `AdminPanel`, they might be logged in via that system's 'adminToken'.
		// The previous interactions showed 'AdminPanel' uses `POST_ENCRYPTION` to store `admin_token`.
		// Let's assume the request comes with a valid Admin Token.

		const POST_ENCRYPTION = runtime?.env?.POST_ENCRYPTION;
		if (!POST_ENCRYPTION) {
			return new Response(
				JSON.stringify({ success: false, message: "KV binding missing" }),
				{ status: 500 },
			);
		}

		// Verify Admin Token (reuse logic from api/admin/verify-token if possible, or duplicate)
		const storedAdminToken = await POST_ENCRYPTION.get("admin_token");
		if (!storedAdminToken || storedAdminToken !== token) {
			// Check if it matches GitHub Owner Token?
			// The `AdminPanel` we saw uses its own login system.
			// Let's stick to `AdminPanel`'s token for this API since it's called from there.
			return new Response(
				JSON.stringify({ success: false, message: "Unauthorized" }),
				{ status: 401 },
			);
		}

		// Generate Share Code
		const sharePassword = password || generateSecureToken(8);
		const expiration = (expiresInMinutes || 60) * 60 * 1000;
		const expiresAt = Date.now() + expiration;

		// Store in KV
		// Key: share:{password}
		// Value: JSON
		// TTL: Cloudflare KV supports 'expiration' (seconds since epoch) or 'expirationTtl'.
		// We use KV's native TTL for auto-cleanup!
		await POST_ENCRYPTION.put(
			`share:${sharePassword}`,
			JSON.stringify({
				slug,
				expiresAt,
				type: "share",
			}),
			{
				expirationTtl: Math.floor(expiration / 1000), // Seconds
			},
		);

		return new Response(
			JSON.stringify({
				success: true,
				password: sharePassword,
				expiresAt,
			}),
			{ status: 200 },
		);
	} catch (error) {
		console.error("Share creation failed:", error);
		return new Response(
			JSON.stringify({ success: false, message: "Server Error" }),
			{ status: 500 },
		);
	}
};

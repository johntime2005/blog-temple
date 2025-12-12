import { hmacSha256, sha256 } from "@utils/security";
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
	try {
		const { encryptionId, password } = await request.json();

		if (!encryptionId || !password) {
			return new Response(
				JSON.stringify({ success: false, message: "Missing parameters" }),
				{ status: 400 },
			);
		}

		const runtime = (locals as any).runtime as any;
		const POST_ENCRYPTION = runtime?.env?.POST_ENCRYPTION;
		// Use GITHUB_CLIENT_SECRET as a fallback for site secret if not explicitly defined
		// In production, best to use a specific SITE_SECRET
		const SITE_SECRET =
			runtime?.env?.SITE_SECRET || runtime?.env?.GITHUB_CLIENT_SECRET;

		if (!POST_ENCRYPTION) {
			console.error("KV binding POST_ENCRYPTION not found");
			return new Response(
				JSON.stringify({
					success: false,
					message: "Server configuration error",
				}),
				{ status: 500 },
			);
		}

		if (!SITE_SECRET) {
			console.error("SITE_SECRET not configured");
			return new Response(
				JSON.stringify({
					success: false,
					message: "Server configuration error",
				}),
				{ status: 500 },
			);
		}

		// 1. Try as Share Password (Dynamic)
		const shareKey = `share:${password}`;
		const shareDataStr = await POST_ENCRYPTION.get(shareKey);

		if (shareDataStr) {
			const shareData = JSON.parse(shareDataStr);
			// Validate match (slug)
			// client sent 'encryptionId' (slug).
			// We check if this password is for this slug.
			if (shareData.slug === encryptionId) {
				// Valid Share Password!
				// Return the TOKEN (password itself acts as token), not the key.
				return new Response(
					JSON.stringify({
						success: true,
						token: `share:${password}`, // Prefix to identify it in api/auth/key
						isSession: true,
					}),
					{ status: 200 },
				);
			}
			// If slug mismatch, fall through to static check (unlikely collision but possible)
		}

		// 2. Verify Static Password
		const passwordHash = await sha256(password); // Client sends raw, we hash it? Or client sends hash?
		// manage-password.mjs uses createHash('sha256').update(password).digest('hex') (Node crypto)
		// Our security.ts sha256 function returns hex string.
		// Let's assume input matches manage-password.mjs logic.

		// However, manage-password.mjs hashes the password before storing in KV.
		// So we should hash the input password and compare with stored hash.
		// Wait, manage-password.mjs: hashPassword(password) -> hex
		// KV content: hash

		const key = `post:${encryptionId}:password`;
		const storedHash = await POST_ENCRYPTION.get(key);

		if (!storedHash) {
			return new Response(
				JSON.stringify({
					success: false,
					message: "Post not found or not encrypted",
				}),
				{ status: 404 },
			);
		}

		// Compare hashes
		// Note: In a real app, we should use bcrypt/argon2, but here we use simple SHA256 as per existing scripts

		// We need to re-implement the hash logic to match manage-password.mjs
		// If manage-password.mjs uses 'sha256' hex, our security.ts sha256 returns hex.
		// But let's verify if manage-password logic is identical.
		// yes: createHash("sha256").update(password).digest("hex") matches our security.ts implementation.

		if (passwordHash !== storedHash) {
			return new Response(
				JSON.stringify({ success: false, message: "Incorrect password" }),
				{ status: 401 },
			);
		}

		// 3. Generate Decryption Key (Static)
		// key = HMAC(SITE_SECRET, encryptionId)
		// encryptionId is the slug/id of the post
		const decryptionKey = await hmacSha256(SITE_SECRET, encryptionId);

		return new Response(
			JSON.stringify({
				success: true,
				token: decryptionKey, // We return the key as the "token"
				isSession: false,
			}),
			{ status: 200 },
		);
	} catch (e) {
		console.error(e);
		return new Response(
			JSON.stringify({ success: false, message: "Internal Error" }),
			{ status: 500 },
		);
	}
};

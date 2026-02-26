export function getEnv(locals: App.Locals, key: string): string | undefined {
	const runtime = (
		locals as unknown as { runtime?: { env?: Record<string, unknown> } }
	).runtime;

	// 1. Try Cloudflare runtime env (production/preview)
	if (runtime?.env?.[key]) {
		const value = runtime.env[key];
		return typeof value === "string" ? value : String(value);
	}

	// 2. Try import.meta.env (local dev with .env)
	// Note: In Vite, import.meta.env is statically replaced, so dynamic access might be limited.
	// But usually checking specific keys works if we access the object.
	// However, for better safety, we check process.env if available (Node).
	if (typeof process !== "undefined" && process.env?.[key]) {
		return process.env[key];
	}

	// 3. Fallback to import.meta.env for widely supported vars
	// We cast to any to allow dynamic access which might work in some modes
	const metaEnv = import.meta.env as Record<string, unknown>;
	if (metaEnv?.[key]) {
		const value = metaEnv[key];
		return typeof value === "string" ? value : String(value);
	}

	return undefined;
}

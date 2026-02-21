import { makeGenericAPIRouteHandler } from "@keystatic/core/api/generic";

export const prerender = false;

const TOKEN_MAX_AGE = 365 * 24 * 60 * 60; // 1 year — GitHub OAuth App tokens don't expire
const KEYSTATIC_ROUTE_REGEX =
	/^branch\/[\s\S]+(\/collection\/[^/]+(|\/(create|item\/[^/]+))|\/singleton\/[^/]+)?$/;

function serializeCookie(
	name: string,
	value: string,
	maxAge: number,
	httpOnly = false,
): string {
	const expires = new Date(Date.now() + maxAge * 1000).toUTCString();
	return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Expires=${expires}; SameSite=Lax; Secure${httpOnly ? "; HttpOnly" : ""}`;
}

function getRouteSegment(url: string): string {
	try {
		return new URL(url).pathname
			.replace(/^\/api\/keystatic\/?/, "")
			.split("/")
			.map((x) => decodeURIComponent(x))
			.filter(Boolean)
			.join("/");
	} catch {
		return "";
	}
}

function bytesToHex(bytes: Uint8Array): string {
	return Array.from(bytes)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/**
 * Custom login handler that adds `scope=repo` to the GitHub OAuth authorize URL.
 * Keystatic's built-in githubLogin does NOT set any scope, resulting in read-only
 * public access which is insufficient for CMS operations.
 */
async function handleGithubLogin(
	req: Request,
	clientId: string,
): Promise<Response> {
	const reqUrl = new URL(req.url);
	const rawFrom = reqUrl.searchParams.get("from");
	const from =
		typeof rawFrom === "string" && KEYSTATIC_ROUTE_REGEX.test(rawFrom)
			? rawFrom
			: "/";

	const state = bytesToHex(crypto.getRandomValues(new Uint8Array(10)));
	const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
	authorizeUrl.searchParams.set("client_id", clientId);
	authorizeUrl.searchParams.set(
		"redirect_uri",
		`${reqUrl.origin}/api/keystatic/github/oauth/callback`,
	);
	authorizeUrl.searchParams.set("scope", "repo");

	if (from === "/") {
		return new Response("Redirecting...", {
			status: 302,
			headers: { Location: authorizeUrl.toString() },
		});
	}

	authorizeUrl.searchParams.set("state", state);

	const stateCookie = serializeCookie(
		`ks-${state}`,
		from,
		60 * 60 * 24, // 1 day
		true,
	);

	const headers = new Headers();
	headers.set("Location", authorizeUrl.toString());
	headers.append("Set-Cookie", stateCookie);
	return new Response("Redirecting...", { status: 302, headers });
}

async function encryptRefreshToken(
	value: string,
	secret: string,
): Promise<string> {
	const encoder = new TextEncoder();
	const SALT_LENGTH = 16;
	const IV_LENGTH = 12;
	const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
	const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		"HKDF",
		false,
		["deriveKey"],
	);
	const key = await crypto.subtle.deriveKey(
		{ name: "HKDF", salt, hash: "SHA-256", info: new Uint8Array(0) },
		keyMaterial,
		{ name: "AES-GCM", length: 256 },
		false,
		["encrypt"],
	);
	const encrypted = await crypto.subtle.encrypt(
		{ name: "AES-GCM", iv },
		key,
		encoder.encode(value),
	);
	const full = new Uint8Array(SALT_LENGTH + IV_LENGTH + encrypted.byteLength);
	full.set(salt);
	full.set(iv, SALT_LENGTH);
	full.set(new Uint8Array(encrypted), SALT_LENGTH + IV_LENGTH);
	let binary = "";
	for (const byte of full) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

async function handleOAuthCallback(
	req: Request,
	clientId: string,
	clientSecret: string,
	secret: string,
): Promise<Response> {
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");
	const errorDesc = url.searchParams.get("error_description");

	if (errorDesc) {
		return new Response(`GitHub OAuth error: ${errorDesc}`, { status: 400 });
	}
	if (!code) {
		return new Response("Bad Request", { status: 400 });
	}

	const tokenUrl = new URL("https://github.com/login/oauth/access_token");
	tokenUrl.searchParams.set("client_id", clientId);
	tokenUrl.searchParams.set("client_secret", clientSecret);
	tokenUrl.searchParams.set("code", code);

	const tokenRes = await fetch(tokenUrl.toString(), {
		method: "POST",
		headers: { Accept: "application/json" },
	});

	if (!tokenRes.ok) {
		return new Response("Authorization failed (token exchange)", {
			status: 401,
		});
	}

	const tokenData = (await tokenRes.json()) as any;
	if (tokenData.error) {
		return new Response(
			`Authorization failed: ${tokenData.error_description || tokenData.error}`,
			{ status: 401 },
		);
	}
	if (!tokenData.access_token || !tokenData.token_type) {
		return new Response("Authorization failed (missing token fields)", {
			status: 401,
		});
	}

	const accessToken = tokenData.access_token;
	const refreshToken = tokenData.refresh_token || "dummy_refresh_token";
	const expiresIn = tokenData.expires_in || TOKEN_MAX_AGE;
	const refreshExpiresIn = tokenData.refresh_token_expires_in || TOKEN_MAX_AGE;

	const encryptedRefresh = await encryptRefreshToken(refreshToken, secret);

	const accessCookie = serializeCookie(
		"keystatic-gh-access-token",
		accessToken,
		expiresIn,
		false,
	);
	const refreshCookie = serializeCookie(
		"keystatic-gh-refresh-token",
		encryptedRefresh,
		refreshExpiresIn,
		true,
	);

	const cookieHeader = req.headers.get("cookie") || "";
	const fromCookie = state
		? cookieHeader.match(new RegExp(`ks-${state}=([^;]+)`))?.[1]
		: undefined;
	const from =
		typeof fromCookie === "string" && KEYSTATIC_ROUTE_REGEX.test(fromCookie)
			? fromCookie
			: undefined;
	const redirectTo = `/keystatic${from ? `/${from}` : ""}`;

	const headers = new Headers();
	headers.set("Location", redirectTo);
	headers.append("Set-Cookie", accessCookie);
	headers.append("Set-Cookie", refreshCookie);
	return new Response("Redirecting...", { status: 302, headers });
}

async function handleRefreshToken(req: Request): Promise<Response> {
	const cookieHeader = req.headers.get("Cookie") || "";
	const accessMatch = cookieHeader.match(/keystatic-gh-access-token=([^;]+)/);
	const currentAccessToken = accessMatch
		? decodeURIComponent(accessMatch[1])
		: null;

	if (!currentAccessToken) {
		return new Response("Authorization failed", { status: 401 });
	}

	const verifyRes = await fetch("https://api.github.com/user", {
		headers: { Authorization: `Bearer ${currentAccessToken}` },
	});

	if (verifyRes.ok) {
		const setCookie = serializeCookie(
			"keystatic-gh-access-token",
			currentAccessToken,
			TOKEN_MAX_AGE,
			false,
		);
		return new Response(
			JSON.stringify({
				access_token: currentAccessToken,
				expires_in: TOKEN_MAX_AGE,
				refresh_token: "dummy_refresh_token",
				refresh_token_expires_in: TOKEN_MAX_AGE,
				scope: "repo,user",
				token_type: "bearer",
			}),
			{
				status: 200,
				headers: {
					"Content-Type": "application/json",
					"Set-Cookie": setCookie,
				},
			},
		);
	}

	return new Response("Authorization failed", { status: 401 });
}

export const ALL = async (context: any) => {
	try {
		if (typeof process !== "undefined") {
			process.env.NODE_ENV = "production";
		} else {
			(globalThis as any).process = { env: { NODE_ENV: "production" } };
		}

		const env = context.locals?.runtime?.env || {};
		const getVar = (k: string) => {
			const val = env[k];
			return typeof val === "string" ? val.trim() : val;
		};

		const siteSecret = getVar("SITE_SECRET");
		const clientId = getVar("GITHUB_CLIENT_ID");
		const clientSecret = getVar("GITHUB_CLIENT_SECRET");
		const owner = getVar("GITHUB_OWNER_USERNAME") || "johntime2005";
		const repoName = `${owner}/blog` as `${string}/${string}`;

		if (!siteSecret || !clientId || !clientSecret) {
			throw new Error(
				`Missing vars: secret=${!!siteSecret}, clientId=${!!clientId}, clientSecret=${!!clientSecret}`,
			);
		}

		const route = getRouteSegment(context.request.url);

		if (route === "github/login") {
			return handleGithubLogin(context.request, clientId);
		}

		if (route === "github/oauth/callback") {
			return handleOAuthCallback(
				context.request,
				clientId,
				clientSecret,
				siteSecret,
			);
		}

		if (route === "github/refresh-token") {
			return handleRefreshToken(context.request);
		}

		const apiHandler = makeGenericAPIRouteHandler({
			config: {
				storage: { kind: "github" as const, repo: repoName },
				collections: {},
				singletons: {},
			} as any,
			clientId,
			clientSecret,
			secret: siteSecret,
		});

		const result = await apiHandler(context.request);
		const { body, headers, status } = result;

		const responseHeaders = new Headers();
		if (headers) {
			const headerEntries = Array.isArray(headers)
				? headers
				: typeof headers.entries === "function"
					? Array.from(headers.entries())
					: Object.entries(headers);
			for (const [key, value] of headerEntries) {
				if (Array.isArray(value)) {
					for (const v of value) {
						responseHeaders.append(key, v);
					}
				} else {
					responseHeaders.append(key, value as string);
				}
			}
		}

		const finalBody =
			body === null && (status === 302 || status === 307)
				? "Redirecting..."
				: body;

		return new Response(finalBody as any, { status, headers: responseHeaders });
	} catch (error: any) {
		return new Response(
			JSON.stringify({
				error: "Keystatic API Handler Error",
				details: error.message,
				stack: error.stack,
			}),
			{ status: 500, headers: { "Content-Type": "application/json" } },
		);
	}
};

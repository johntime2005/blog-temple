import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
    if (typeof process !== 'undefined') {
        process.env.NODE_ENV = 'production';
    } else {
        (globalThis as any).process = { env: { NODE_ENV: 'production' } };
    }

    const env = context.locals?.runtime?.env || {};
    const getVar = (k: string) => {
        const val = env[k];
        return typeof val === 'string' ? val.trim() : val;
    };

    const secret = getVar('SITE_SECRET');
    const clientId = getVar('GITHUB_CLIENT_ID');
    const clientSecret = getVar('GITHUB_CLIENT_SECRET');

    const internalConfig = {
      storage: {
        kind: 'github' as const,
        repo: 'johntime2005/blog',
      },
      github: {
        clientId,
        clientSecret,
      },
      secret,
      collections: {}, 
      singletons: {}
    };

    if (!secret || !clientId || !clientSecret) {
         throw new Error(`Missing vars: secret=${!!secret}, clientId=${!!clientId}, clientSecret=${!!clientSecret}`);
    }

    const handlerOptions = {
        config: internalConfig,
        clientId,
        clientSecret,
        secret
    };

    const apiHandler = makeGenericAPIRouteHandler(handlerOptions, {
      slugEnvName: 'PUBLIC_KEYSTATIC_GITHUB_APP_SLUG'
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        const urlStr = String(input);
        if (urlStr.includes('github.com/login/oauth/access_token')) {
             try {
                 const u = new URL(urlStr);
                 
                 // 1. Handle Login (Code)
                 if (u.searchParams.has('code')) {
                     if (!u.searchParams.has('redirect_uri')) {
                         u.searchParams.set('redirect_uri', 'https://blog.johntime.top/api/keystatic/github/oauth/callback');
                     }
                     const res = await originalFetch(u.toString(), init);
                     if (!res.ok) return res;

                     const data = await res.json() as any;
                     if (data.error) {
                         return new Response(JSON.stringify(data), { status: 200 }); 
                     }
                     
                     if (!data.refresh_token) {
                         data.refresh_token = "dummy_refresh_token_polyfill";
                         data.refresh_token_expires_in = 15552000;
                     }
                     if (!data.expires_in) data.expires_in = 28800; 
                     if (data.token_type) data.token_type = data.token_type.toLowerCase();

                     return new Response(JSON.stringify(data), { status: 200 });
                 }
                 
                 // 2. Handle Refresh (Polyfill)
                 if (u.searchParams.get('refresh_token') === 'dummy_refresh_token_polyfill') {
                     // Get current access token to recycle it
                     const cookieHeader = context.request.headers.get('Cookie') || '';
                     const match = cookieHeader.match(/keystatic-gh-access-token=([^;]+)/);
                     const currentAccessToken = match ? match[1] : "mock_token";

                     return new Response(JSON.stringify({
                         access_token: currentAccessToken,
                         expires_in: 28800,
                         refresh_token: "dummy_refresh_token_polyfill",
                         refresh_token_expires_in: 15552000,
                         token_type: "bearer"
                     }), { status: 200 });
                 }

             } catch (e) {
                 console.error("Fetch patch error:", e);
             }
        }
        return originalFetch(input, init);
    };

    let result;
    try {
        result = await apiHandler(context.request);
    } finally {
        globalThis.fetch = originalFetch;
    }

    const { body, headers, status } = result;

    const responseHeaders = new Headers();
    if (headers) {
        const headerEntries = Array.isArray(headers) 
            ? headers 
            : typeof headers.entries === 'function' 
                ? Array.from(headers.entries())
                : Object.entries(headers);

        for (const [key, value] of headerEntries) {
            if (Array.isArray(value)) {
                value.forEach(v => responseHeaders.append(key, v));
            } else {
                responseHeaders.append(key, value as string);
            }
        }
    }

    const finalBody = body === null && (status === 302 || status === 307) ? "Redirecting..." : body;
    return new Response(finalBody, { status, headers: responseHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

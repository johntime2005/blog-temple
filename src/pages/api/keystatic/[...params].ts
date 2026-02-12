import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
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
             // CLEAN REBUILD STRATEGY
             // Ignore Keystatic's URL construction, build our own pristine request
             try {
                 const currentUrl = new URL(urlStr);
                 const code = currentUrl.searchParams.get('code');
                 
                 if (code) {
                     const cleanUrl = new URL('https://github.com/login/oauth/access_token');
                     cleanUrl.searchParams.set('client_id', clientId);
                     cleanUrl.searchParams.set('client_secret', clientSecret);
                     cleanUrl.searchParams.set('code', code);
                     cleanUrl.searchParams.set('redirect_uri', 'https://blog.johntime.top/api/keystatic/github/oauth/callback');
                     
                     const cleanInit = {
                         method: 'POST',
                         headers: { 'Accept': 'application/json' }
                     };
                     
                     const res = await originalFetch(cleanUrl.toString(), cleanInit);
                     
                     // If error, capture it for debugging
                     if (!res.ok) {
                         const text = await res.clone().text();
                         throw new Error(`GitHub HTTP ${res.status}: ${text}`);
                     }
                     
                     const clone = res.clone();
                     const data = await clone.json() as any;
                     if (data.error) {
                         throw new Error(`GitHub JSON Error: ${data.error} - ${data.error_description}`);
                     }
                     
                     return res;
                 }
             } catch (e: any) {
                 if (e.message.includes('GitHub')) throw e; // Re-throw auth errors
                 // Else ignore parsing errors
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

    return new Response(finalBody, {
        status,
        headers: responseHeaders
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
        error: "Keystatic API Handler Error",
        details: error.message
    }, null, 2), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }
};

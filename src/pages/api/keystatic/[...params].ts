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
        let urlStr = String(input);
        if (input && typeof (input as any).href === 'string') {
             urlStr = (input as any).href;
        }

        if (urlStr.includes('github.com/login/oauth/access_token')) {
             if (!urlStr.includes('redirect_uri=')) {
                 const separator = urlStr.includes('?') ? '&' : '?';
                 const redirectUri = encodeURIComponent('https://blog.johntime.top/api/keystatic/github/oauth/callback');
                 urlStr = `${urlStr}${separator}redirect_uri=${redirectUri}`;
                 
                 const res = await originalFetch(urlStr, init);
                 
                 const clone = res.clone();
                 const text = await clone.text();
                 
                 // DEBUG: check original request URL protocol
                 throw new Error(`DEBUG_TOKEN_DUMP || REQ_URL: ${context.request.url} || TOKEN_URL: ${urlStr.replace(clientSecret, '***')} || BODY: ${text}`);
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

    // ... response logic ...
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
    return new Response(JSON.stringify({ 
        error: "Keystatic API Debug",
        details: error.message,
    }, null, 2), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

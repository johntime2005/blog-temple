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

    // MONKEY PATCH with Safer Logic
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
        let urlStr = String(input);
        if (input && typeof (input as any).href === 'string') {
             urlStr = (input as any).href;
        }

        if (urlStr.includes('github.com/login/oauth/access_token')) {
             try {
                 const url = new URL(urlStr);
                 if (!url.searchParams.has('redirect_uri')) {
                     url.searchParams.set('redirect_uri', 'https://blog.johntime.top/api/keystatic/github/oauth/callback');
                     
                     const finalUrl = url.toString();
                     const res = await originalFetch(finalUrl, init);
                     
                     const clone = res.clone();
                     const text = await clone.text();
                     
                     // DEBUG: Dump URL and Response
                     // Mask secret
                     const safeUrl = finalUrl.replace(clientSecret, '***SECRET***');
                     throw new Error(`DEBUG_TOKEN_DUMP || URL: ${safeUrl} || BODY: ${text}`);
                 }
             } catch (e: any) {
                 if (e.message.startsWith("DEBUG_TOKEN_DUMP")) throw e;
                 // Else ignore
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

    return new Response(body, { status, headers: responseHeaders });

  } catch (error: any) {
    return new Response(JSON.stringify({ 
        error: "Keystatic API Debug",
        details: error.message,
    }, null, 2), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }
};

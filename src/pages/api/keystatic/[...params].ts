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

    // DEBUG: Intercept Callback to test credentials against GitHub directly
    const url = new URL(context.request.url);
    if (url.pathname.includes('/github/oauth/callback') && url.searchParams.get('code')) {
        const code = url.searchParams.get('code');
        const tokenUrl = 'https://github.com/login/oauth/access_token';
        
        // Try Keystatic style (query params)
        const debugUrl = new URL(tokenUrl);
        debugUrl.searchParams.set('client_id', clientId);
        debugUrl.searchParams.set('client_secret', clientSecret);
        debugUrl.searchParams.set('code', code);

        const res = await fetch(debugUrl.toString(), {
            method: 'POST',
            headers: { 'Accept': 'application/json' }
        });
        
        const data = await res.json() as any;
        
        if (data.error) {
             return new Response(JSON.stringify({
                status: "GitHub Error (Manual Check)",
                github_error: data.error,
                github_desc: data.error_description,
                github_uri: data.error_uri,
                debug_info: {
                    clientIdPrefix: clientId?.substring(0, 5),
                    secretLength: clientSecret?.length
                }
            }, null, 2), { headers: { 'Content-Type': 'application/json' }});
        }
        
        // If success, we can't easily proceed because code is one-time use.
        // So we will fail here but show "Success". User will have to login again.
        return new Response(JSON.stringify({
            status: "Success! Credentials are valid.",
            access_token_prefix: data.access_token?.substring(0, 5),
            message: "Please remove this debug code to login normally."
        }, null, 2), { headers: { 'Content-Type': 'application/json' }});
    }

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

    const { body, headers, status } = await apiHandler(context.request);

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
        details: error.message,
        stack: error.stack
    }, null, 2), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }
};

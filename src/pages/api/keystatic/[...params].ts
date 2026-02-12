import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const getVar = (k: string) => env[k];

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

    const { body, headers, status } = await apiHandler(context.request);

    // DEBUG: Intercept Redirects to verify URL generation
    if (status === 307 || status === 302) {
        const debugHeaders: any[] = [];
        let location = '';
        
        if (headers) {
            if (Array.isArray(headers)) {
                headers.forEach(([k, v]) => {
                    debugHeaders.push([k, v]);
                    if (k.toLowerCase() === 'location') location = v;
                });
            } else if (typeof headers.entries === 'function') {
                 for (const [k, v] of headers.entries()) {
                     debugHeaders.push([k, v]);
                     if (k.toLowerCase() === 'location') location = v as string;
                 }
            } else {
                 for (const [k, v] of Object.entries(headers)) {
                     debugHeaders.push([k, v]);
                     if (k.toLowerCase() === 'location') location = v as string;
                 }
            }
        }

        return new Response(JSON.stringify({
            status: 'Debug Intercept',
            originalStatus: status,
            location,
            headers: debugHeaders,
            configClientId: clientId ? clientId.substring(0, 5) + '...' : 'missing'
        }, null, 2), {
            headers: { 'Content-Type': 'application/json' }
        });
    }

    const responseHeaders = new Headers();
    if (headers) {
        if (typeof headers.entries === 'function') {
            for (const [key, value] of headers.entries()) {
                if (Array.isArray(value)) {
                    value.forEach(v => responseHeaders.append(key, v));
                } else {
                    responseHeaders.append(key, value);
                }
            }
        } else if (Array.isArray(headers)) {
            headers.forEach(([key, value]) => responseHeaders.append(key, value));
        } else {
            for (const [key, value] of Object.entries(headers)) {
                if (Array.isArray(value)) {
                    value.forEach(v => responseHeaders.append(key, v as string));
                } else {
                    responseHeaders.append(key, value as string);
                }
            }
        }
    }

    return new Response(body, {
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

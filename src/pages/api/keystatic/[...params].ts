import { makeGenericAPIRouteHandler } from '@keystatic/core/api/generic';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const getVar = (k: string) => env[k];

    const secret = getVar('SITE_SECRET');
    const clientId = getVar('GITHUB_CLIENT_ID');
    const clientSecret = getVar('GITHUB_CLIENT_SECRET');

    // Internal config structure (the 'config' property)
    const internalConfig = {
      storage: {
        kind: 'github' as const,
        repo: 'johntime2005/blog',
      },
      github: {
        clientId,
        clientSecret,
      },
      // Note: 'secret' inside config is used by some internal logic, 
      // but 'secret' at top level of makeGenericAPIRouteHandler is used for auth.
      secret,
      collections: {}, 
      singletons: {}
    };

    if (!secret || !clientId || !clientSecret) {
         throw new Error(`Missing vars: secret=${!!secret}, clientId=${!!clientId}, clientSecret=${!!clientSecret}`);
    }

    // Wrapper object expected by makeGenericAPIRouteHandler
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
        error: "Keystatic API Handler Error (Wrapper Fix)",
        details: error.message,
        stack: error.stack
    }, null, 2), { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
    });
  }
};

import { makeHandler } from '@keystatic/astro/api';
import config from '../../../../keystatic.config';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
    const env = context.locals?.runtime?.env || {};
    // Fallback to process.env or import.meta.env if needed, but Cloudflare usually puts it in locals.runtime.env
    
    // Helper to get var
    const getVar = (key: string) => env[key] || import.meta.env[key];

    const clientId = getVar('GITHUB_CLIENT_ID');
    const clientSecret = getVar('GITHUB_CLIENT_SECRET');
    const secret = getVar('SITE_SECRET') || getVar('KEYSTATIC_SECRET');

    const enrichedConfig = {
      ...config,
      github: {
        ...(config.github || {}),
        clientId: clientId || config.github?.clientId,
        clientSecret: clientSecret || config.github?.clientSecret,
      },
      secret: secret || config.secret,
    };
    
    if (!enrichedConfig.secret) {
       throw new Error("Missing 'secret' (SITE_SECRET or KEYSTATIC_SECRET).");
    }
    if (!enrichedConfig.github?.clientId) {
       throw new Error("Missing 'GITHUB_CLIENT_ID'.");
    }
    if (!enrichedConfig.github?.clientSecret) {
       throw new Error("Missing 'GITHUB_CLIENT_SECRET'.");
    }

    return await makeHandler(enrichedConfig)(context);
  } catch (error: any) {
    return new Response(JSON.stringify({
      message: "Keystatic API Error",
      error: error.message,
      stack: error.stack,
      debug: {
          hasRuntimeEnv: !!context.locals?.runtime?.env,
          envKeys: Object.keys(context.locals?.runtime?.env || {}),
          metaKeys: Object.keys(import.meta.env || {}).filter(k => !k.startsWith('Private')),
      }
    }, null, 2), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

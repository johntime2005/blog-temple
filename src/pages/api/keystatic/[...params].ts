import { makeHandler } from '@keystatic/astro/api';
import config from '../../../../keystatic.config';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
    const env = context.locals?.runtime?.env || {};
    // Helper to get var from runtime or build time
    const getVar = (key: string) => env[key] || (import.meta.env ? import.meta.env[key] : undefined);

    const clientId = getVar('GITHUB_CLIENT_ID');
    const clientSecret = getVar('GITHUB_CLIENT_SECRET');
    const secret = getVar('SITE_SECRET') || getVar('KEYSTATIC_SECRET');
    const repoOwner = getVar('GITHUB_OWNER_USERNAME') || 'johntime2005';

    // DEBUG: Check imported config
    if (!config) {
        throw new Error("Imported 'config' is undefined.");
    }

    const enrichedConfig = {
      ...config,
      storage: {
        kind: 'github',
        repo: `${repoOwner}/blog`
      },
      github: {
        ...(config.github || {}),
        clientId: clientId || config.github?.clientId,
        clientSecret: clientSecret || config.github?.clientSecret,
      },
      secret: secret || config.secret,
    };
    
    if (!enrichedConfig.secret) {
       throw new Error("Missing 'secret'. Enriched config: " + JSON.stringify(Object.keys(enrichedConfig)));
    }

    return await makeHandler(enrichedConfig)(context);
  } catch (error: any) {
    return new Response(JSON.stringify({
      message: "Keystatic API Error",
      error: error.message,
      stack: error.stack,
      debug: {
          configKeys: config ? Object.keys(config) : 'null',
          envKeys: Object.keys(env),
      }
    }, null, 2), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
};

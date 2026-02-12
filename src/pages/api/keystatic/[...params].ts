import { makeHandler } from '@keystatic/astro/api';
import { config, fields, collection, singleton } from '@keystatic/core';

export const prerender = false;

export const ALL = async (context: any) => {
  try {
    const env = context.locals?.runtime?.env || {};
    const getVar = (k: string) => env[k];

    const secret = getVar('SITE_SECRET');
    const clientId = getVar('GITHUB_CLIENT_ID');
    const clientSecret = getVar('GITHUB_CLIENT_SECRET');

    if (!secret || !clientId || !clientSecret) {
        throw new Error(`Missing vars: secret=${!!secret}, clientId=${!!clientId}, clientSecret=${!!clientSecret}`);
    }

    // Inline configuration to avoid import side-effects
    const inlineConfig = config({
      storage: {
        kind: 'github',
        repo: 'johntime2005/blog',
      },
      github: {
        clientId,
        clientSecret,
      },
      secret,
      collections: {
        posts: collection({
          label: 'Posts',
          slugField: 'title',
          path: 'src/content/posts/*/',
          format: { contentField: 'content' },
          schema: {
            title: fields.slug({ name: { label: 'Title' } }),
            content: fields.mdx({ label: 'Content' }),
          },
        }),
      },
    });

    return await makeHandler(inlineConfig)(context);
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

import { makeHandler } from '@keystatic/astro/api';
import config from '../../../../keystatic.config';

export const prerender = false;

export const ALL = async (context: any) => {
  const env = context.locals?.runtime?.env || import.meta.env;

  const enrichedConfig = {
    ...config,
    github: {
      ...(config.github || {}),
      clientId: env.GITHUB_CLIENT_ID || config.github?.clientId,
      clientSecret: env.GITHUB_CLIENT_SECRET || config.github?.clientSecret,
    },
    // Keystatic needs a secret for session cookies.
    // We map SITE_SECRET (from user env) to this field.
    secret: env.SITE_SECRET || env.KEYSTATIC_SECRET || config.secret,
  };

  return makeHandler(enrichedConfig)(context);
};

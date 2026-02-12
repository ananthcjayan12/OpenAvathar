import type { Env } from './types';
import { jsonResponse } from './types';
import { validateLicense } from './license/validate';
import { activateLicense } from './license/activate';
import { checkGenerationLimit } from './generation/check';
import { trackGeneration } from './generation/track';
import { handleGumroadWebhook } from './gumroad/webhook';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Gumroad-Signature',
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    try {
      if (url.pathname === '/api/license/validate' && request.method === 'POST') {
        return withCors(await validateLicense(request, env));
      }

      if (url.pathname === '/api/license/activate' && request.method === 'POST') {
        return withCors(await activateLicense(request, env));
      }

      if (url.pathname === '/api/generation/check' && request.method === 'GET') {
        return withCors(await checkGenerationLimit(request, env));
      }

      if (url.pathname === '/api/generation/track' && request.method === 'POST') {
        return withCors(await trackGeneration(request, env));
      }

      if (url.pathname === '/api/gumroad/webhook' && request.method === 'POST') {
        // Intentionally no CORS: server-to-server webhook.
        return await handleGumroadWebhook(request, env);
      }

      return withCors(new Response('Not Found', { status: 404 }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return withCors(jsonResponse({ error: message }, { status: 500 }));
    }
  },
};

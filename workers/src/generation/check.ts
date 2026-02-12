import type { Env } from '../types';
import { jsonResponse } from '../types';

function formatResetsIn(now: Date): string {
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const ms = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${minutes}m`;
}

export async function checkGenerationLimit(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const fingerprint = url.searchParams.get('fingerprint')?.trim();

  if (!fingerprint) {
    return jsonResponse({ error: 'Missing fingerprint' }, { status: 400 });
  }

  const licenseKey = await env.LICENSES_KV.get(`fp:${fingerprint}`);
  if (licenseKey) {
    return jsonResponse({ canGenerate: true, isPro: true, licenseKey });
  }

  const today = new Date().toISOString().split('T')[0];
  const generationKey = `gen:${fingerprint}:${today}`;

  const countStr = await env.LICENSES_KV.get(generationKey);
  const used = countStr ? Number.parseInt(countStr, 10) : 0;
  const limit = 1;

  const resetsIn = formatResetsIn(new Date());

  if (used >= limit) {
    return jsonResponse({ canGenerate: false, isPro: false, limit, used, resetsIn });
  }

  return jsonResponse({ canGenerate: true, isPro: false, limit, used, resetsIn });
}

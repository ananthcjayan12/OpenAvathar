import type { Env } from '../types';
import { jsonResponse } from '../types';

export async function trackGeneration(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { fingerprint?: string } | null;
  const fingerprint = body?.fingerprint?.trim();

  if (!fingerprint) {
    return jsonResponse({ error: 'Missing fingerprint' }, { status: 400 });
  }

  const licenseKey = await env.LICENSES_KV.get(`fp:${fingerprint}`);
  if (licenseKey) {
    return jsonResponse({ success: true, count: 0, isPro: true });
  }

  const today = new Date().toISOString().split('T')[0];
  const generationKey = `gen:${fingerprint}:${today}`;

  const countStr = await env.LICENSES_KV.get(generationKey);
  const newCount = countStr ? Number.parseInt(countStr, 10) + 1 : 1;

  await env.LICENSES_KV.put(generationKey, String(newCount), {
    expirationTtl: 60 * 60 * 24,
  });

  return jsonResponse({ success: true, count: newCount, isPro: false });
}

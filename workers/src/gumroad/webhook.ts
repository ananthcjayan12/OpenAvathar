import type { Env } from '../types';
import { generateLicenseKey } from '../utils/license-gen';
import { verifyGumroadSignature } from '../utils/signature';

interface GumroadPayload {
  email?: string;
  sale_id?: string;
  product_name?: string;
  price?: string;
  currency?: string;
}

function parseGumroadBody(raw: string): GumroadPayload {
  // Gumroad webhooks are typically application/x-www-form-urlencoded
  // If caller sends JSON in tests, try JSON parse as a fallback.
  // Heuristic: form bodies typically include '='.
  if (!raw.includes('=')) {
    try {
      return JSON.parse(raw) as GumroadPayload;
    } catch {
      return {};
    }
  }

  const params = new URLSearchParams(raw);
  return {
    email: params.get('email') ?? undefined,
    sale_id: params.get('sale_id') ?? undefined,
    product_name: params.get('product_name') ?? undefined,
    price: params.get('price') ?? undefined,
    currency: params.get('currency') ?? undefined,
  };
}

export async function handleGumroadWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('X-Gumroad-Signature');
  const rawBody = await request.text();

  const ok = await verifyGumroadSignature(rawBody, signature, env.GUMROAD_SECRET);
  if (!ok) {
    return new Response('Unauthorized', { status: 403 });
  }

  const data = parseGumroadBody(rawBody);
  const licenseKey = generateLicenseKey();

  await env.LICENSES_KV.put(
    licenseKey,
    JSON.stringify({
      email: data.email ?? null,
      purchaseId: data.sale_id ?? null,
      purchaseDate: new Date().toISOString(),
      activations: [],
      maxActivations: 3,
      product: data.product_name ?? 'OpenAvathar Pro (Lifetime)',
      price: data.price ?? null,
      currency: data.currency ?? null,
    })
  );

  // Note: delivery of the key is handled by Gumroad (license key in email),
  // or by manual fulfillment. This endpoint just records it.
  return new Response('OK', { status: 200 });
}

import type { Env } from '../types';
import { generateLicenseKey } from '../utils/license-gen';
import { verifyGumroadSignature } from '../utils/signature';
import { getLicenseFromDb, putLicenseInDb, type LicenseRecord } from '../license/verification';

interface GumroadPayload {
  email?: string;
  sale_id?: string;
  product_name?: string;
  price?: string;
  currency?: string;
  license_key?: string;
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
    license_key: params.get('license_key') ?? undefined,
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
  const licenseKey = data.license_key?.trim() || generateLicenseKey();

  const existing = await getLicenseFromDb(licenseKey, env);
  const upserted: LicenseRecord = {
    source: 'gumroad',
    email: data.email ?? existing?.email ?? null,
    purchaseId: data.sale_id ?? existing?.purchaseId ?? null,
    purchaseDate: existing?.purchaseDate ?? new Date().toISOString(),
    activations: existing?.activations ?? [],
    maxActivations: existing?.maxActivations ?? 3,
    product: data.product_name ?? existing?.product ?? 'OpenAvathar Pro (Lifetime)',
    price: data.price ?? existing?.price ?? null,
    currency: data.currency ?? existing?.currency ?? null,
    lastActivated: existing?.lastActivated,
    lastVerifiedAt: new Date().toISOString(),
  };

  await putLicenseInDb(licenseKey, upserted, env);

  // Note: delivery of the key is handled by Gumroad (license key in email),
  // or by manual fulfillment. This endpoint just records it.
  return new Response('OK', { status: 200 });
}

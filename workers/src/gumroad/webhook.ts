import type { Env } from '../types';
import { generateLicenseKey } from '../utils/license-gen';
import { verifyGumroadSignature } from '../utils/signature';
import { getLicenseFromDb, putLicenseInDb, type LicenseRecord } from '../license/verification';

interface GumroadPayload {
  sale_id?: string;
  sale_timestamp?: string;
  order_number?: string;
  seller_id?: string;
  product_id?: string;
  product_permalink?: string;
  short_product_id?: string;
  product_name?: string;
  email?: string;
  url_params?: string;
  full_name?: string;
  purchaser_id?: string;
  subscription_id?: string;
  ip_country?: string;
  price?: string; // in USD cents
  recurrence?: string;
  variants?: string;
  offer_code?: string;
  test?: string; // "true" or "false"
  custom_fields?: string;
  shipping_information?: string;
  is_recurring_charge?: string;
  is_preorder_authorization?: string;
  license_key?: string;
  quantity?: string;
  shipping_rate?: string;
  affiliate?: string;
  affiliate_credit_amount_cents?: string;
  is_gift_receiver_purchase?: string;
  gifter_email?: string;
  gift_price?: string;
  refunded?: string;
  discover_fee_charged?: string;
  can_contact?: string;
  referrer?: string;
  gumroad_fee?: string;
  card?: string;
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
  const payload: GumroadPayload = {};

  // Extract all fields that Gumroad sends
  params.forEach((value, key) => {
    (payload as any)[key] = value;
  });

  return payload;
}

export async function handleGumroadWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get('X-Gumroad-Signature');
  const rawBody = await request.text();

  // Log incoming webhook for debugging
  console.log('[Gumroad Webhook] Received webhook');
  console.log('[Gumroad Webhook] Raw body:', rawBody);

  const ok = await verifyGumroadSignature(rawBody, signature, env.GUMROAD_SECRET);
  if (!ok) {
    console.error('[Gumroad Webhook] Signature verification failed');
    return new Response('Unauthorized', { status: 403 });
  }

  const data = parseGumroadBody(rawBody);
  console.log('[Gumroad Webhook] Parsed data:', JSON.stringify(data, null, 2));

  // Check if this is a test purchase
  const isTest = data.test === 'true';
  console.log('[Gumroad Webhook] Is test purchase:', isTest);

  // Check if refunded
  const isRefunded = data.refunded === 'true';
  if (isRefunded) {
    console.log('[Gumroad Webhook] Purchase was refunded, skipping license creation');
    return new Response('OK - Refunded', { status: 200 });
  }

  const licenseKey = data.license_key?.trim() || generateLicenseKey();
  console.log('[Gumroad Webhook] License key:', licenseKey);

  const existing = await getLicenseFromDb(licenseKey, env);
  console.log('[Gumroad Webhook] Existing license:', existing ? 'Found' : 'Not found');

  const upserted: LicenseRecord = {
    source: 'gumroad',
    email: data.email ?? existing?.email ?? null,
    purchaseId: data.sale_id ?? existing?.purchaseId ?? null,
    // Use Gumroad's sale_timestamp for new purchases, preserve existing for updates
    purchaseDate: data.sale_timestamp ?? existing?.purchaseDate ?? new Date().toISOString(),
    activations: existing?.activations ?? [],
    maxActivations: existing?.maxActivations ?? 3,
    product: data.product_name ?? existing?.product ?? 'OpenAvathar Pro (Lifetime)',
    price: data.price ?? existing?.price ?? null,
    currency: data.currency ?? existing?.currency ?? null,
    lastActivated: existing?.lastActivated,
    lastVerifiedAt: new Date().toISOString(),
  };

  console.log('[Gumroad Webhook] Upserting license:', JSON.stringify(upserted, null, 2));
  await putLicenseInDb(licenseKey, upserted, env);
  console.log('[Gumroad Webhook] License stored successfully');

  // Note: delivery of the key is handled by Gumroad (license key in email),
  // or by manual fulfillment. This endpoint just records it.
  return new Response('OK', { status: 200 });
}

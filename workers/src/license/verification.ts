import type { Env } from '../types';

export interface LicenseRecord {
  source?: 'gumroad' | 'manual' | 'legacy';
  email?: string | null;
  purchaseId?: string | null;
  purchaseDate?: string | null;
  activations: string[];
  maxActivations: number;
  product?: string | null;
  price?: string | null;
  currency?: string | null;
  lastActivated?: string;
  lastVerifiedAt?: string;
}

interface GumroadLicenseVerifyResponse {
  success?: boolean;
  uses?: number;
  purchase?: {
    email?: string;
    id?: string;
    created_at?: string;
    product_name?: string;
    price?: number | string;
    currency?: string;
  };
}

const DEFAULT_MAX_ACTIVATIONS = 3;

function normalizeLicenseRecord(input: Partial<LicenseRecord>): LicenseRecord {
  return {
    source: input.source ?? 'legacy',
    email: input.email ?? null,
    purchaseId: input.purchaseId ?? null,
    purchaseDate: input.purchaseDate ?? null,
    activations: Array.isArray(input.activations) ? input.activations : [],
    maxActivations: Number.isFinite(input.maxActivations) ? Number(input.maxActivations) : DEFAULT_MAX_ACTIVATIONS,
    product: input.product ?? null,
    price: input.price ?? null,
    currency: input.currency ?? null,
    lastActivated: input.lastActivated,
    lastVerifiedAt: input.lastVerifiedAt,
  };
}

export async function getLicenseFromDb(licenseKey: string, env: Env): Promise<LicenseRecord | null> {
  const raw = await env.LICENSES_KV.get(licenseKey);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<LicenseRecord>;
    return normalizeLicenseRecord(parsed);
  } catch {
    return null;
  }
}

export async function putLicenseInDb(licenseKey: string, license: LicenseRecord, env: Env): Promise<void> {
  await env.LICENSES_KV.put(licenseKey, JSON.stringify(normalizeLicenseRecord(license)));
}

async function verifyWithGumroadServer(licenseKey: string, env: Env): Promise<LicenseRecord | null> {
  if (!env.GUMROAD_PRODUCT_ID) return null;

  const params = new URLSearchParams({
    product_id: env.GUMROAD_PRODUCT_ID,
    license_key: licenseKey,
    increment_uses_count: 'false',
  });

  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as GumroadLicenseVerifyResponse | null;
  if (!payload?.success) return null;

  const purchase = payload.purchase;

  return normalizeLicenseRecord({
    source: 'gumroad',
    email: purchase?.email ?? null,
    purchaseId: purchase?.id ?? null,
    purchaseDate: purchase?.created_at ?? null,
    activations: [],
    maxActivations: DEFAULT_MAX_ACTIVATIONS,
    product: purchase?.product_name ?? 'OpenAvathar Pro (Lifetime)',
    price: purchase?.price != null ? String(purchase.price) : null,
    currency: purchase?.currency ?? null,
    lastVerifiedAt: new Date().toISOString(),
  });
}

export async function resolveLicense(licenseKey: string, env: Env): Promise<LicenseRecord | null> {
  const dbLicense = await getLicenseFromDb(licenseKey, env);
  if (dbLicense) return dbLicense;

  const gumroadLicense = await verifyWithGumroadServer(licenseKey, env);
  if (!gumroadLicense) return null;

  await putLicenseInDb(licenseKey, gumroadLicense, env);
  return gumroadLicense;
}

export async function ensureGumroadLicenseStillValid(
  licenseKey: string,
  license: LicenseRecord,
  env: Env
): Promise<boolean> {
  if (license.source !== 'gumroad') return true;
  if (!env.GUMROAD_PRODUCT_ID) return true;

  const verified = await verifyWithGumroadServer(licenseKey, env);
  if (!verified) return false;

  const merged = normalizeLicenseRecord({
    ...license,
    email: verified.email ?? license.email ?? null,
    purchaseId: verified.purchaseId ?? license.purchaseId ?? null,
    purchaseDate: verified.purchaseDate ?? license.purchaseDate ?? null,
    product: verified.product ?? license.product ?? null,
    price: verified.price ?? license.price ?? null,
    currency: verified.currency ?? license.currency ?? null,
    lastVerifiedAt: new Date().toISOString(),
  });

  await putLicenseInDb(licenseKey, merged, env);
  return true;
}

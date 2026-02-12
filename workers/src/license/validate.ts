import type { Env } from '../types';
import { jsonResponse } from '../types';

interface LicenseRecord {
  email?: string;
  purchaseId?: string;
  purchaseDate?: string;
  activations: string[];
  maxActivations: number;
  product?: string;
  price?: string;
  currency?: string;
  lastActivated?: string;
}

export async function validateLicense(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { licenseKey?: string } | null;
  const licenseKey = body?.licenseKey?.trim();

  if (!licenseKey) {
    return jsonResponse({ valid: false, error: 'Missing licenseKey' }, { status: 400 });
  }

  const licenseData = await env.LICENSES_KV.get(licenseKey);
  if (!licenseData) {
    return jsonResponse({ valid: false, error: 'License key not found' }, { status: 404 });
  }

  const data = JSON.parse(licenseData) as LicenseRecord;

  return jsonResponse({
    valid: true,
    email: data.email ?? null,
    activationsUsed: data.activations?.length ?? 0,
    maxActivations: data.maxActivations ?? 0,
    purchaseDate: data.purchaseDate ?? null,
  });
}

import type { Env } from '../types';
import { jsonResponse } from '../types';

interface LicenseRecord {
  email?: string;
  purchaseId?: string;
  purchaseDate?: string;
  activations: string[];
  maxActivations: number;
  lastActivated?: string;
}

export async function activateLicense(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { licenseKey?: string; fingerprint?: string } | null;
  const licenseKey = body?.licenseKey?.trim();
  const fingerprint = body?.fingerprint?.trim();

  if (!licenseKey || !fingerprint) {
    return jsonResponse({ success: false, error: 'Missing licenseKey or fingerprint' }, { status: 400 });
  }

  const licenseData = await env.LICENSES_KV.get(licenseKey);
  if (!licenseData) {
    return jsonResponse({ success: false, error: 'Invalid license key' }, { status: 404 });
  }

  const license = JSON.parse(licenseData) as LicenseRecord;
  license.activations = Array.isArray(license.activations) ? license.activations : [];

  if (license.activations.includes(fingerprint)) {
    return jsonResponse({ success: true, message: 'Already activated on this device' });
  }

  if ((license.activations.length ?? 0) >= (license.maxActivations ?? 0)) {
    return jsonResponse(
      { success: false, error: `License already activated on ${license.maxActivations} devices` },
      { status: 403 }
    );
  }

  license.activations.push(fingerprint);
  license.lastActivated = new Date().toISOString();

  await env.LICENSES_KV.put(licenseKey, JSON.stringify(license));
  await env.LICENSES_KV.put(`fp:${fingerprint}`, licenseKey);

  return jsonResponse({ success: true, message: 'License activated on this device' });
}

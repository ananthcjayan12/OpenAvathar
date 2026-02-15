import type { Env } from '../types';
import { jsonResponse } from '../types';
import { ensureGumroadLicenseStillValid, resolveLicense } from './verification';

export async function validateLicense(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { licenseKey?: string } | null;
  const licenseKey = body?.licenseKey?.trim();

  if (!licenseKey) {
    return jsonResponse({ valid: false, error: 'Missing licenseKey' }, { status: 400 });
  }

  const data = await resolveLicense(licenseKey, env);
  if (!data) {
    return jsonResponse({ valid: false, error: 'License key not found' }, { status: 404 });
  }

  const stillValid = await ensureGumroadLicenseStillValid(licenseKey, data, env);
  if (!stillValid) {
    return jsonResponse({ valid: false, error: 'License is no longer valid with Gumroad' }, { status: 403 });
  }

  return jsonResponse({
    valid: true,
    source: data.source ?? 'legacy',
    email: data.email ?? null,
    activationsUsed: data.activations?.length ?? 0,
    maxActivations: data.maxActivations ?? 0,
    purchaseDate: data.purchaseDate ?? null,
  });
}

import type { Env } from '../types';
import { jsonResponse } from '../types';
import {
  ensureGumroadLicenseStillValid,
  putLicenseInDb,
  resolveLicense,
  type LicenseRecord,
} from './verification';

export async function activateLicense(request: Request, env: Env): Promise<Response> {
  const body = (await request.json().catch(() => null)) as { licenseKey?: string; fingerprint?: string } | null;
  const licenseKey = body?.licenseKey?.trim();
  const fingerprint = body?.fingerprint?.trim();

  if (!licenseKey || !fingerprint) {
    return jsonResponse({ success: false, error: 'Missing licenseKey or fingerprint' }, { status: 400 });
  }

  const license = await resolveLicense(licenseKey, env);
  if (!license) {
    return jsonResponse({ success: false, error: 'Invalid license key' }, { status: 404 });
  }

  const stillValid = await ensureGumroadLicenseStillValid(licenseKey, license, env);
  if (!stillValid) {
    return jsonResponse({ success: false, error: 'License is no longer valid with Gumroad' }, { status: 403 });
  }

  const mutableLicense: LicenseRecord = {
    ...license,
    activations: Array.isArray(license.activations) ? license.activations : [],
  };

  if (mutableLicense.activations.includes(fingerprint)) {
    return jsonResponse({ success: true, message: 'Already activated on this device' });
  }

  if ((mutableLicense.activations.length ?? 0) >= (mutableLicense.maxActivations ?? 0)) {
    return jsonResponse(
      { success: false, error: `License already activated on ${mutableLicense.maxActivations} devices` },
      { status: 403 }
    );
  }

  mutableLicense.activations.push(fingerprint);
  mutableLicense.lastActivated = new Date().toISOString();

  await putLicenseInDb(licenseKey, mutableLicense, env);
  await env.LICENSES_KV.put(`fp:${fingerprint}`, licenseKey);

  return jsonResponse({ success: true, message: 'License activated on this device' });
}

const WORKER_URL = (import.meta.env.VITE_WORKER_URL as string | undefined)?.replace(/\/$/, '');

export interface LicenseStatus {
  isPro: boolean;
  canGenerate: boolean;
  limit?: number;
  used?: number;
  resetsIn?: string;
  licenseKey?: string;
}

async function parseJsonOrThrow<T>(response: Response, context: string): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`${context} failed (${response.status}). ${text.slice(0, 200)}`);
  }

  // Common misconfig: VITE_WORKER_URL points at Vite dev server and returns index.html
  if (contentType.includes('text/html') || text.trimStart().startsWith('<!doctype') || text.trimStart().startsWith('<html')) {
    throw new Error(
      `${context} returned HTML. Check VITE_WORKER_URL (it should be your Cloudflare Worker origin, e.g. https://<name>.<subdomain>.workers.dev, not localhost).`
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${context} returned non-JSON. content-type=${contentType}. body=${text.slice(0, 200)}`);
  }
}

function requireWorkerUrl(): string {
  if (!WORKER_URL) {
    throw new Error('VITE_WORKER_URL is not configured');
  }
  return WORKER_URL;
}

export async function checkGeneration(fingerprint: string): Promise<LicenseStatus> {
  const base = requireWorkerUrl();
  const response = await fetch(`${base}/api/generation/check?fingerprint=${encodeURIComponent(fingerprint)}`);
  return parseJsonOrThrow<LicenseStatus>(response, 'checkGeneration');
}

export async function trackGeneration(fingerprint: string): Promise<{ success: boolean; count: number; isPro: boolean }>
{
  const base = requireWorkerUrl();
  const response = await fetch(`${base}/api/generation/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint }),
  });
  return parseJsonOrThrow(response, 'trackGeneration');
}

export async function activateLicense(
  licenseKey: string,
  fingerprint: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const base = requireWorkerUrl();
  const response = await fetch(`${base}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey, fingerprint }),
  });
  return parseJsonOrThrow(response, 'activateLicense');
}

export async function validateLicense(
  licenseKey: string
): Promise<{ valid: boolean; email?: string | null; activationsUsed?: number; maxActivations?: number; purchaseDate?: string | null; error?: string }> {
  const base = requireWorkerUrl();
  const response = await fetch(`${base}/api/license/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey }),
  });
  return parseJsonOrThrow(response, 'validateLicense');
}

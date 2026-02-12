import { constantTimeEqualHex, toHex } from './crypto';

export async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ]);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return toHex(sig);
}

export async function verifyGumroadSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string
): Promise<boolean> {
  if (!signatureHeader) return false;
  const computed = await hmacSha256Hex(rawBody, secret);
  // Gumroad sends lowercase hex digest
  return constantTimeEqualHex(computed, signatureHeader.trim().toLowerCase());
}

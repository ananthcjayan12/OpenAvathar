const LICENSE_PREFIX = 'OAVR';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomChar(): string {
  const buf = new Uint8Array(1);
  crypto.getRandomValues(buf);
  return CHARS[buf[0] % CHARS.length];
}

function randomPart(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) out += randomChar();
  return out;
}

export function generateLicenseKey(): string {
  const parts = [randomPart(4), randomPart(4), randomPart(4), randomPart(4)];
  return `${LICENSE_PREFIX}-${parts.join('-')}`;
}

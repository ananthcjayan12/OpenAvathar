import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;
let agentPromise: ReturnType<typeof FingerprintJS.load> | null = null;

export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) return cachedFingerprint;

  if (!agentPromise) {
    agentPromise = FingerprintJS.load();
  }

  const agent = await agentPromise;
  const result = await agent.get();
  cachedFingerprint = result.visitorId;
  return cachedFingerprint;
}

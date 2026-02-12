export interface Env {
  LICENSES_KV: KVNamespace;
  GUMROAD_SECRET: string;
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export function jsonResponse(body: JsonValue, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json; charset=utf-8');
  }
  return new Response(JSON.stringify(body), { ...init, headers });
}

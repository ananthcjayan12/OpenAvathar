# OpenAvathar API (Cloudflare Workers)

This folder contains the serverless API used for licensing + generation limits.

## What’s in here

- Worker entry: `src/index.ts`
- KV namespace binding: `LICENSES_KV`
- Secret (Cloudflare-managed): `GUMROAD_SECRET`

## Endpoints

- `POST /api/license/validate`
- `POST /api/license/activate`
- `GET /api/generation/check?fingerprint=...`
- `POST /api/generation/track`
- `POST /api/gumroad/webhook` (server-to-server)

## Local development

```bash
cd workers
npm install
npm run dev
```

Notes:
- Use `.dev.vars` for local secrets (never commit).
- `wrangler dev --local` will run locally; KV access may require a remote dev KV depending on your setup.

## Cloudflare setup (one-time)

### 1) Create KV namespace

```bash
cd workers
# Wrangler v4+ syntax:
wrangler kv namespace create LICENSES_KV
# Optional (for local/preview bindings):
# wrangler kv namespace create LICENSES_KV --preview
```

**For GitHub Actions deploy:**
Store the namespace ID as a repository secret named `LICENSES_KV_ID` (the workflow will inject it at deploy time).

**For local development/deploy:**
Replace `${LICENSES_KV_ID}` in `wrangler.toml` with your actual KV namespace ID, then run:
```bash
npm run deploy
```

Notes:
- KV namespace IDs are **not secrets** (they're just resource identifiers).
- The security comes from your API token, not the namespace ID.
- CI injects the ID at deploy time via `sed` so we don't commit it to the repo.

### 2) Set secrets (do not put these in `wrangler.toml`)

```bash
cd workers
wrangler secret put GUMROAD_SECRET --env production
```

## Deploy

### Deploy from your machine

```bash
cd workers
npm run deploy
```

### Deploy via GitHub Actions

Workflow: `.github/workflows/deploy-workers.yml`

Required GitHub secrets:
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `LICENSES_KV_ID`

Branch trigger:
- pushes to `prod` deploy the Worker to the `production` env.

## Gumroad webhook

- Header: `X-Gumroad-Signature`
- Body: typically `application/x-www-form-urlencoded`
- Signature verification: HMAC-SHA256 of the raw request body using `GUMROAD_SECRET`

### Gumroad setup checklist (Phase 4)

1) Create a Gumroad product (e.g. “OpenAvathar Pro (Lifetime)”).

2) Configure the webhook in Gumroad:
- Webhook URL: `https://<your-worker-domain>/api/gumroad/webhook`
- Set the webhook signing secret in Gumroad (copy this value).

3) Store that secret in Cloudflare (not GitHub, not wrangler.toml):

```bash
cd workers
wrangler secret put GUMROAD_SECRET --env production
```

4) Test the webhook:
- Trigger a test purchase (or Gumroad’s test webhook)
- Verify the Worker logs show an `OK` response
- Confirm a new license key record appears in KV (`LICENSES_KV`) with `activations: []`

## Quick smoke checks (after deploy)

- `GET /api/generation/check?fingerprint=test123` should return `{ canGenerate: true, ... }` on a fresh fingerprint.
- `POST /api/generation/track` with `{ "fingerprint": "test123" }` increments daily count.

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

Store it as an environment variable for deploy:

- Local: `export LICENSES_KV_ID=...`
- GitHub Actions: set `LICENSES_KV_ID` as a repository secret

Notes:
- Use the **non-preview** namespace id for `LICENSES_KV_ID` (production).
- The `--preview` id is only for preview/dev if you choose to wire that up later.

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

## Quick smoke checks (after deploy)

- `GET /api/generation/check?fingerprint=test123` should return `{ canGenerate: true, ... }` on a fresh fingerprint.
- `POST /api/generation/track` with `{ "fingerprint": "test123" }` increments daily count.

# Gumroad + License Testing (No Real Payment)

This guide helps you verify checkout, webhook, and license activation flows **without completing a real payment**.

## Required env/config

Frontend (`OpenAvathar/.env.local`):

```bash
VITE_WORKER_URL=https://<your-worker>.<subdomain>.workers.dev
VITE_GUMROAD_URL=https://<yourname>.gumroad.com/l/<product_permalink>
```

Worker secrets/vars:

- `GUMROAD_SECRET` (webhook signing secret from Gumroad)
- `GUMROAD_PRODUCT_ID` (product ID used for `/v2/licenses/verify` fallback)

## 1) Checkout UX test (no payment)

1. Start frontend and open landing pricing card.
2. Click `Get Lifetime Access`.
3. Expected:
   - You are taken to Gumroad checkout flow (overlay or Gumroad page depending on browser/script behavior).
   - No broken white screen.
4. Stop here (do not complete payment).

## 2) Worker manual-license test (no Gumroad purchase)

Use KV to seed a manual license and test activation/validation.

### Seed license in KV

```bash
cd workers
wrangler kv key put --binding LICENSES_KV "TEST-MANUAL-KEY" '{"source":"manual","email":"qa@example.com","activations":[],"maxActivations":3}' --env production
```

### Validate license

```bash
curl -X POST "https://<your-worker>/api/license/validate" \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"TEST-MANUAL-KEY"}'
```

Expected: `valid: true`, `source: "manual"`.

### Activate license

```bash
curl -X POST "https://<your-worker>/api/license/activate" \
  -H "Content-Type: application/json" \
  -d '{"licenseKey":"TEST-MANUAL-KEY","fingerprint":"qa-device-1"}'
```

Expected: success, then generation check for this fingerprint should report `isPro: true`.

## 3) Webhook endpoint test (without real sale)

You can validate signature verification and payload handling by sending a signed webhook payload locally.

### Example payload (form-encoded)

```text
email=qa%40example.com&sale_id=sale_test_123&product_name=OpenAvathar%20Pro&price=39&currency=usd&license_key=TEST-GUMROAD-KEY
```

### Signature

Compute HMAC-SHA256 hex using `GUMROAD_SECRET` on the **raw body string**.

### Send request

```bash
curl -X POST "https://<your-worker>/api/gumroad/webhook" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -H "X-Gumroad-Signature: <computed_hex_signature>" \
  --data 'email=qa%40example.com&sale_id=sale_test_123&product_name=OpenAvathar%20Pro&price=39&currency=usd&license_key=TEST-GUMROAD-KEY'
```

Expected: `200 OK`; KV contains `TEST-GUMROAD-KEY` as a `source: "gumroad"` record.

## 4) Gumroad server-verify fallback test

This path is used when a key is not in KV and worker verifies via Gumroad `/v2/licenses/verify`.

1. Ensure `GUMROAD_PRODUCT_ID` is set.
2. Use a real Gumroad-issued key (from a previous test purchase/license).
3. Call `/api/license/validate` with that key.
4. Expected:
   - Valid response from worker.
   - Key is auto-synced into KV for later DB-first validation.

## Do we need a Gumroad API key?

Short answer: **No**, not for your current flow.

- Checkout button/overlay: **No API key**.
- Webhook security: uses **`GUMROAD_SECRET`** (signing secret), not OAuth API key.
- License verify endpoint (`/v2/licenses/verify`): **does not require OAuth access token**.

You only need Gumroad OAuth API access tokens for advanced seller API operations (products/sales/payout management), which your current runtime flow does not require.

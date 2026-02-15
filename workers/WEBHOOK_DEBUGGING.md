# Gumroad Webhook Debugging Guide

## Overview
This guide helps you debug issues with the Gumroad webhook integration for license activation.

## Changes Made

### 1. **Fixed Payload Parsing**
The webhook now correctly extracts **all** fields sent by Gumroad, not just a subset. This includes:
- `sale_id`, `sale_timestamp`, `order_number`
- `product_id`, `product_name`, `license_key`
- `email`, `full_name`, `purchaser_id`
- `price`, `currency`, `quantity`
- `test`, `refunded`, and many more

### 2. **Fixed Purchase Date Bug**
**Critical Fix**: Previously, the code was using the current timestamp instead of Gumroad's `sale_timestamp`. Now it correctly uses:
```typescript
purchaseDate: data.sale_timestamp ?? existing?.purchaseDate ?? new Date().toISOString()
```

### 3. **Added Refund Handling**
The webhook now checks if a purchase was refunded and skips license creation:
```typescript
const isRefunded = data.refunded === 'true';
if (isRefunded) {
  return new Response('OK - Refunded', { status: 200 });
}
```

### 4. **Added Comprehensive Logging**
The webhook now logs:
- Raw incoming payload
- Parsed data (JSON formatted)
- Whether it's a test purchase
- License key being used
- Whether an existing license was found
- The final license record being stored

## Testing the Webhook

### Option 1: Local Testing with Test Script

1. **Start the worker locally:**
   ```bash
   cd workers
   npm run dev
   ```

2. **In another terminal, run the test script:**
   ```bash
   node test-webhook.js http://localhost:8787
   ```

3. **Check the console output** from the worker to see the logs.

### Option 2: Test with Gumroad's Test Mode

1. **Deploy your worker:**
   ```bash
   cd workers
   npm run deploy
   ```

2. **Configure Gumroad webhook URL:**
   - Go to your Gumroad product settings
   - Set webhook URL to: `https://your-worker.workers.dev/api/gumroad/webhook`

3. **Make a test purchase:**
   - Use Gumroad's test mode to purchase your product
   - Check the Cloudflare Worker logs in your dashboard

### Option 3: Check Cloudflare Logs

**The worker is configured with observability enabled**, so all `console.log` statements will appear in the Cloudflare dashboard.

1. Go to Cloudflare Dashboard → Workers & Pages → Your Worker
2. Click on "Logs" tab (or "Real-time Logs")
3. Look for `[Gumroad Webhook]` entries
4. You should see detailed logs of the webhook processing

**Configuration in `wrangler.toml`:**
```toml
[observability]
enabled = true

[observability.logs]
enabled = true
persist = true
invocation_logs = true
```

This means all the detailed logging we added will be visible directly in your Cloudflare dashboard!

## Common Issues & Solutions

### Issue 1: License Not Created After Purchase

**Symptoms:**
- Purchase completes successfully
- License key is not in Cloudflare KV
- No errors in logs

**Possible Causes:**
1. **Signature verification failing**
   - Check logs for `[Gumroad Webhook] Signature verification failed`
   - Verify `GUMROAD_SECRET` is set correctly: `wrangler secret put GUMROAD_SECRET`
   - The secret should match what's in your Gumroad settings

2. **Webhook URL not configured**
   - Verify webhook URL in Gumroad settings
   - Should be: `https://your-worker.workers.dev/api/gumroad/webhook`

3. **KV namespace not bound**
   - Check `wrangler.toml` has correct KV binding
   - Verify `LICENSES_KV_ID` environment variable is set

### Issue 2: License Key Not Matching

**Symptoms:**
- License is created but user can't activate it
- User has a different license key than what's in KV

**Solution:**
- Gumroad must be configured to generate and send license keys
- In Gumroad product settings, enable "Generate license keys"
- The `license_key` field will be included in the webhook payload

### Issue 3: Test Purchases Not Working

**Symptoms:**
- Real purchases work but test purchases don't

**Check:**
- Look for log: `[Gumroad Webhook] Is test purchase: true`
- Test purchases are processed the same way as real ones
- The only difference is the `test` field is set to `"true"`

## Verifying License in KV

### Using Wrangler CLI:
```bash
# List all keys
wrangler kv:key list --binding LICENSES_KV --env production

# Get a specific license
wrangler kv:key get "YOUR-LICENSE-KEY" --binding LICENSES_KV --env production
```

### Using Cloudflare Dashboard:
1. Go to Workers & Pages → KV
2. Select your `LICENSES_KV` namespace
3. Search for the license key
4. View the stored JSON data

## Expected License Record Format

```json
{
  "source": "gumroad",
  "email": "customer@example.com",
  "purchaseId": "sale_abc123",
  "purchaseDate": "2026-02-15T06:23:00.000Z",
  "activations": [],
  "maxActivations": 3,
  "product": "OpenAvathar Pro (Lifetime)",
  "price": "9900",
  "currency": "usd",
  "lastVerifiedAt": "2026-02-15T06:23:00.000Z"
}
```

## Webhook Payload Example

Here's what Gumroad sends (form-urlencoded):

```
sale_id=abc123&
sale_timestamp=2026-02-15T06:23:00Z&
product_name=OpenAvathar+Pro+(Lifetime)&
email=customer@example.com&
license_key=OAVT-XXXX-XXXX-XXXX&
price=9900&
currency=usd&
test=false&
refunded=false
```

## Next Steps

1. **Deploy the updated worker:**
   ```bash
   cd workers
   npm run deploy
   ```

2. **Make a test purchase** and check the logs

3. **Verify the license** was created in KV

4. **Test license activation** from your app

## Need More Help?

If issues persist:
1. Check the full worker logs in Cloudflare Dashboard
2. Verify all environment variables are set correctly
3. Test with the provided `test-webhook.js` script locally first
4. Enable verbose logging by checking the console output

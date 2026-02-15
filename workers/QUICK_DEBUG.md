# Quick Debugging Checklist

## 🚨 License Not Activating After Purchase?

Follow these steps in order:

### 1. Check Cloudflare Worker Logs

**✨ Observability is enabled** - All logs appear in the Cloudflare dashboard!

```bash
# View logs in real-time
wrangler tail --env production
```

Or go to: **Cloudflare Dashboard → Workers & Pages → openavathar-api → Logs**

Look for these log messages:
- ✅ `[Gumroad Webhook] Received webhook`
- ✅ `[Gumroad Webhook] Parsed data: {...}`
- ✅ `[Gumroad Webhook] License stored successfully`

### 2. Verify Webhook Configuration

**In Gumroad:**
- Product Settings → Advanced → Ping URL
- Should be: `https://openavathar-api.YOUR-SUBDOMAIN.workers.dev/api/gumroad/webhook`
- Test it by clicking "Send test ping"

### 3. Check Environment Variables

```bash
# List all secrets (won't show values, just names)
wrangler secret list --env production

# Should see:
# - GUMROAD_SECRET
# - GUMROAD_PRODUCT_ID (optional)
```

If missing, set them:
```bash
wrangler secret put GUMROAD_SECRET --env production
# Paste your Gumroad webhook secret when prompted
```

### 4. Verify KV Namespace

```bash
# List all license keys
wrangler kv:key list --binding LICENSES_KV --env production

# Get a specific license (replace with actual key)
wrangler kv:key get "OAVT-XXXX-XXXX" --binding LICENSES_KV --env production
```

### 5. Test Locally

```bash
# Terminal 1: Start worker
cd workers
npm run dev

# Terminal 2: Send test webhook
node test-webhook.js http://localhost:8787
```

Watch Terminal 1 for the detailed logs.

## 🔍 Common Error Messages

| Error                           | Cause                    | Solution                       |
| ------------------------------- | ------------------------ | ------------------------------ |
| `Signature verification failed` | Wrong `GUMROAD_SECRET`   | Reset secret in Cloudflare     |
| `Unauthorized (403)`            | Missing signature header | Check Gumroad webhook config   |
| `Not Found (404)`               | Wrong webhook URL        | Verify URL in Gumroad settings |
| No logs at all                  | Webhook not triggered    | Check Gumroad ping history     |

## ✅ Success Indicators

When working correctly, you should see:

1. **In Gumroad:** Ping history shows 200 OK responses
2. **In Cloudflare Logs:** All `[Gumroad Webhook]` messages appear
3. **In KV:** License key exists with correct data
4. **In App:** User can activate with their license key

## 📝 What Data is Stored?

```json
{
  "source": "gumroad",
  "email": "customer@example.com",
  "purchaseId": "abc123",
  "purchaseDate": "2026-02-15T06:23:00Z",
  "activations": [],
  "maxActivations": 3,
  "product": "OpenAvathar Pro (Lifetime)",
  "price": "9900",
  "currency": "usd",
  "lastVerifiedAt": "2026-02-15T06:23:00Z"
}
```

## 🚀 Deploy Changes

After making any changes:

```bash
cd workers
npm run deploy
```

## 📚 More Help

See `WEBHOOK_DEBUGGING.md` for detailed troubleshooting guide.

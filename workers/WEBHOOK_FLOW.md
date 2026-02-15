# Gumroad Webhook Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GUMROAD WEBHOOK FLOW                            │
└─────────────────────────────────────────────────────────────────────────┘

1. CUSTOMER PURCHASES
   ┌──────────────┐
   │   Customer   │
   │   Buys on    │──────► Purchase Complete
   │   Gumroad    │
   └──────────────┘
          │
          │ Gumroad generates license key
          │ and sends webhook
          ▼

2. WEBHOOK SENT TO CLOUDFLARE WORKER
   ┌─────────────────────────────────────────────────────────────┐
   │  POST /api/gumroad/webhook                                  │
   │  Headers:                                                   │
   │    - Content-Type: application/x-www-form-urlencoded       │
   │    - X-Gumroad-Signature: <hmac-sha256-signature>          │
   │  Body (form-encoded):                                       │
   │    sale_id=abc123&                                          │
   │    sale_timestamp=2026-02-15T06:23:00Z&                    │
   │    email=customer@example.com&                              │
   │    license_key=OAVT-XXXX-XXXX&                             │
   │    product_name=OpenAvathar+Pro&                            │
   │    price=9900&                                              │
   │    currency=usd&                                            │
   │    test=false&                                              │
   │    refunded=false&                                          │
   │    ... (40+ fields total)                                   │
   └─────────────────────────────────────────────────────────────┘
          │
          ▼

3. WORKER PROCESSES REQUEST
   ┌─────────────────────────────────────────────────────────────┐
   │  handleGumroadWebhook()                                     │
   │                                                             │
   │  Step 1: Extract signature from header                     │
   │  Step 2: Read raw body                                     │
   │  Step 3: Log incoming webhook ✨ NEW                       │
   │  Step 4: Verify HMAC-SHA256 signature                      │
   │          ├─ Invalid? → Return 403 Unauthorized             │
   │          └─ Valid? → Continue                              │
   │                                                             │
   │  Step 5: Parse form-encoded body ✨ IMPROVED               │
   │          - Extract ALL 40+ fields dynamically              │
   │          - Log parsed data                                 │
   │                                                             │
   │  Step 6: Check if test purchase ✨ NEW                     │
   │          - Log test status                                 │
   │                                                             │
   │  Step 7: Check if refunded ✨ NEW                          │
   │          ├─ Refunded? → Return 200 OK (skip license)       │
   │          └─ Not refunded? → Continue                       │
   │                                                             │
   │  Step 8: Extract/generate license key                      │
   │          - Use Gumroad's license_key if provided           │
   │          - Otherwise generate new one                      │
   │          - Log license key ✨ NEW                          │
   │                                                             │
   │  Step 9: Check for existing license in KV                  │
   │          - Log if found or not ✨ NEW                      │
   │                                                             │
   │  Step 10: Create/update license record                     │
   │           - Use sale_timestamp for purchaseDate ✨ FIXED   │
   │           - Preserve existing activations                  │
   │           - Set maxActivations to 3                        │
   │           - Log full record ✨ NEW                         │
   │                                                             │
   │  Step 11: Store in Cloudflare KV                           │
   │           - Key: license_key                               │
   │           - Value: JSON license record                     │
   │           - Log success ✨ NEW                             │
   │                                                             │
   │  Step 12: Return 200 OK to Gumroad                         │
   └─────────────────────────────────────────────────────────────┘
          │
          ▼

4. LICENSE STORED IN CLOUDFLARE KV
   ┌─────────────────────────────────────────────────────────────┐
   │  Key: "OAVT-XXXX-XXXX-XXXX"                                │
   │  Value:                                                     │
   │  {                                                          │
   │    "source": "gumroad",                                     │
   │    "email": "customer@example.com",                         │
   │    "purchaseId": "abc123",                                  │
   │    "purchaseDate": "2026-02-15T06:23:00Z", ✨ FIXED        │
   │    "activations": [],                                       │
   │    "maxActivations": 3,                                     │
   │    "product": "OpenAvathar Pro (Lifetime)",                 │
   │    "price": "9900",                                         │
   │    "currency": "usd",                                       │
   │    "lastVerifiedAt": "2026-02-15T06:23:05Z"                │
   │  }                                                          │
   └─────────────────────────────────────────────────────────────┘
          │
          ▼

5. CUSTOMER ACTIVATES LICENSE
   ┌──────────────┐
   │   Customer   │
   │   Opens App  │──────► Enters license key
   │              │
   └──────────────┘
          │
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  POST /api/license/activate                                 │
   │  {                                                          │
   │    "licenseKey": "OAVT-XXXX-XXXX-XXXX",                    │
   │    "fingerprint": "device-fingerprint-hash"                 │
   │  }                                                          │
   └─────────────────────────────────────────────────────────────┘
          │
          ▼
   ┌─────────────────────────────────────────────────────────────┐
   │  Worker validates:                                          │
   │  1. License exists in KV ✅                                 │
   │  2. Not refunded ✅                                         │
   │  3. Activations < maxActivations ✅                         │
   │  4. Adds fingerprint to activations array                   │
   │  5. Returns success                                         │
   └─────────────────────────────────────────────────────────────┘
          │
          ▼
   ┌──────────────┐
   │   Customer   │
   │   Can Now    │──────► Generate unlimited videos!
   │   Use App    │
   └──────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                         DEBUGGING CHECKPOINTS                           │
└─────────────────────────────────────────────────────────────────────────┘

✅ Checkpoint 1: Gumroad sends webhook
   → Check: Gumroad dashboard → Product → Ping history

✅ Checkpoint 2: Worker receives webhook
   → Check: Cloudflare logs for "[Gumroad Webhook] Received webhook"

✅ Checkpoint 3: Signature verified
   → Check: No "Signature verification failed" error

✅ Checkpoint 4: Data parsed correctly
   → Check: "[Gumroad Webhook] Parsed data: {...}" shows all fields

✅ Checkpoint 5: License stored in KV
   → Check: "[Gumroad Webhook] License stored successfully"
   → Verify: wrangler kv:key get "LICENSE-KEY" --binding LICENSES_KV

✅ Checkpoint 6: Customer can activate
   → Check: POST /api/license/activate returns success


┌─────────────────────────────────────────────────────────────────────────┐
│                         KEY IMPROVEMENTS                                │
└─────────────────────────────────────────────────────────────────────────┘

✨ Complete Payload Parsing
   Before: Only 6 fields extracted
   After:  All 40+ fields extracted dynamically

✨ Correct Purchase Date
   Before: Used current timestamp (wrong!)
   After:  Uses Gumroad's sale_timestamp (correct!)

✨ Comprehensive Logging
   Before: No logs
   After:  Detailed logs at every step

✨ Refund Handling
   Before: No refund check
   After:  Skips license creation for refunds

✨ Test Purchase Detection
   Before: No test flag logging
   After:  Logs whether purchase is test or real

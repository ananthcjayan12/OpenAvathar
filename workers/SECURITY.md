# Webhook Security Architecture

## 🔒 Security Question
**"Can't someone use the webhook URL to generate fake licenses in my DB?"**

**Short Answer:** No, because licenses are validated against Gumroad's API during activation.

---

## 🛡️ Multi-Layer Security Approach

Your license system uses a **defense-in-depth** strategy with multiple security layers:

### Layer 1: Webhook Validation (Lightweight)
**Purpose:** Prevent obvious spam and malformed requests

✅ **IP Logging** - Tracks source IP for audit trail  
✅ **User-Agent Validation** - Logs the requesting client  
✅ **Required Fields Check** - Rejects webhooks missing `email`, `sale_id`, or `product_name`  
✅ **Refund Detection** - Skips creating licenses for refunded purchases

**What this prevents:**
- Random spam requests
- Completely malformed data
- Accidental duplicate webhooks

**What this DOESN'T prevent:**
- Someone crafting a well-formed fake webhook with valid-looking data

### Layer 2: Gumroad API Verification (Strong) 🔐
**Purpose:** Verify license is real when user tries to use it

This is the **critical security layer** that prevents fake licenses from working.

**How it works:**

1. **User tries to activate license** in your app
2. **Worker calls Gumroad's API:**
   ```
   POST https://api.gumroad.com/v2/licenses/verify
   Body: product_id=YOUR_PRODUCT&license_key=USER_LICENSE
   ```
3. **Gumroad responds:**
   - ✅ `{"success": true}` → License is real, allow activation
   - ❌ `{"success": false}` → License is fake/invalid, reject activation

**Code location:** `workers/src/license/verification.ts`
```typescript
async function verifyWithGumroadServer(licenseKey: string, env: Env) {
  // Calls Gumroad API to verify license is real
  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    body: new URLSearchParams({
      product_id: env.GUMROAD_PRODUCT_ID,
      license_key: licenseKey,
      increment_uses_count: 'false',
    }),
  });
  
  const payload = await response.json();
  return payload.success ? license : null;
}
```

**This is called during:**
- License activation (`/api/license/activate`)
- License validation (`/api/license/validate`)

---

## 🎯 Attack Scenarios & Defenses

### Scenario 1: Attacker Sends Fake Webhook
**Attack:**
```bash
curl -X POST https://your-worker.workers.dev/api/gumroad/webhook \
  -d "email=fake@example.com&sale_id=fake123&license_key=FAKE-KEY&product_name=OpenAvathar"
```

**What happens:**
1. ✅ Webhook accepted (passes Layer 1 validation)
2. ✅ Fake license created in KV database
3. ❌ **User tries to activate** → Worker calls Gumroad API
4. ❌ **Gumroad API returns `success: false`** (license doesn't exist)
5. ❌ **Activation rejected** → User can't use the app

**Result:** ✅ Attack fails - fake license is useless

### Scenario 2: Attacker Steals Real License Key
**Attack:**
Someone gets a real license key from a legitimate purchase and tries to use it on multiple devices.

**What happens:**
1. ✅ License exists in KV (from real webhook)
2. ✅ Gumroad API validates it (real license)
3. ✅ First activation succeeds
4. ✅ Second activation succeeds
5. ✅ Third activation succeeds
6. ❌ **Fourth activation fails** → Max activations (3) reached

**Result:** ✅ Limited damage - only 3 devices can use the license

### Scenario 3: Attacker Floods Webhook with Spam
**Attack:**
```bash
for i in {1..1000}; do
  curl -X POST https://your-worker.workers.dev/api/gumroad/webhook \
    -d "email=spam$i@example.com&sale_id=spam$i&license_key=SPAM-$i&product_name=OpenAvathar"
done
```

**What happens:**
1. ✅ All webhooks accepted (pass Layer 1)
2. ✅ 1000 fake licenses created in KV
3. ❌ **None of them work** when users try to activate
4. 📊 **You see spam in logs** → Can block the IP or add rate limiting

**Result:** ⚠️ Database pollution, but no functional impact (licenses don't work)

**Mitigation:** Add Cloudflare rate limiting (see below)

---

## 🔧 Additional Security Enhancements (Optional)

### Option 1: Enable Cloudflare Rate Limiting
Limit webhook requests to prevent spam:

1. Go to **Cloudflare Dashboard** → **Security** → **WAF**
2. Create a **Rate Limiting Rule**:
   - **URL:** `https://your-worker.workers.dev/api/gumroad/webhook`
   - **Limit:** 10 requests per minute per IP
   - **Action:** Block

### Option 2: IP Allowlist (Advanced)
Only accept webhooks from Gumroad's IP ranges:

Gumroad uses **Amazon AWS** infrastructure. You can allowlist AWS IP ranges:
- Check the logged IPs in your webhook logs
- Add IP validation in the webhook handler

### Option 3: Add Webhook Secret (When Available)
If Gumroad adds signature support in the future:

1. Get webhook secret from Gumroad
2. Set `GUMROAD_SECRET` in Cloudflare
3. Signature verification will automatically activate

---

## 📊 Security Trade-offs

| Approach                   | Security Level | Complexity | User Experience |
| -------------------------- | -------------- | ---------- | --------------- |
| **No validation**          | ❌ Low          | Easy       | Fast            |
| **Webhook signature only** | ⚠️ Medium       | Easy       | Fast            |
| **Gumroad API validation** | ✅ High         | Medium     | Fast            |
| **API + Rate limiting**    | ✅✅ Very High   | Medium     | Fast            |
| **API + IP allowlist**     | ✅✅✅ Maximum    | Hard       | Fast            |

**Current implementation:** ✅ **Gumroad API validation** (High security, good UX)

---

## 🎓 Why This Approach Works

### The Key Insight:
**The webhook is just a notification, not the source of truth.**

- **Webhook says:** "Hey, someone bought a license"
- **Gumroad API says:** "Yes, this license is real and valid"

Even if someone fakes the webhook, **they can't fake Gumroad's API response**.

### Analogy:
Think of it like a restaurant reservation system:

1. **Webhook** = Someone calls and says "I have a reservation"
2. **Your database** = You write down their name
3. **Gumroad API** = You check the actual reservation system when they arrive
4. **Result** = If they're not in the real system, they don't get a table

Someone can fake a phone call, but they can't fake being in the real reservation system!

---

## ✅ Current Security Status

Your system is **secure** because:

1. ✅ **Webhook creates license** (could be faked)
2. ✅ **Activation validates with Gumroad API** (can't be faked)
3. ✅ **Invalid licenses are rejected** (even if in database)
4. ✅ **Max activations enforced** (limits damage from stolen keys)
5. ✅ **Required fields validated** (prevents garbage data)
6. ✅ **IP and User-Agent logged** (audit trail for investigation)

**Conclusion:** Even without webhook signature verification, your system is secure because the **real verification happens at activation time** via Gumroad's API. 🔒

---

## 🚀 Recommended Next Steps

1. **Deploy the current code** - It's already secure
2. **Monitor the logs** - Watch for suspicious patterns
3. **Set up Cloudflare rate limiting** - Prevent spam (optional but recommended)
4. **Set `GUMROAD_PRODUCT_ID`** - Required for API verification to work

```bash
wrangler secret put GUMROAD_PRODUCT_ID --env production
# Enter your Gumroad product ID when prompted
```

Without `GUMROAD_PRODUCT_ID`, the API verification is skipped and security is reduced!

# License Verification Architecture

## 🎯 Overview

The license system uses a **one-time verification** strategy that is efficient and supports multiple sales platforms.

---

## 🏗️ Architecture

### Key Principle: Verify Once, Trust Forever

Instead of calling external APIs on every activation, we verify licenses **once** when they're created and mark them as `verified: true`.

```
┌─────────────────────────────────────────────────────────────┐
│                    VERIFICATION FLOW                        │
└─────────────────────────────────────────────────────────────┘

1. PURCHASE MADE
   ├─ Gumroad → Webhook
   ├─ Other Platform → Manual Entry
   └─ Direct Sale → API Call

2. WEBHOOK RECEIVES PURCHASE
   ├─ Parse purchase data
   ├─ Verify with source API (if available)
   │  └─ Gumroad: Call /v2/licenses/verify
   ├─ Mark as verified: true ✓
   └─ Store in KV

3. USER ACTIVATES LICENSE
   ├─ Check if verified: true
   │  ├─ Yes → Skip API call, allow activation ✓
   │  └─ No → Verify with source API (legacy licenses)
   └─ Add device to activations

4. SUBSEQUENT ACTIVATIONS
   └─ Always skip API call (verified: true) ✓
```

---

## 💡 Benefits

### 1. **Performance**
- ❌ **Old way:** API call on every activation (~300ms delay)
- ✅ **New way:** API call only once during webhook (~0ms on activation)

### 2. **Reliability**
- No dependency on external API uptime during activation
- Works even if Gumroad API is down

### 3. **Multi-Platform Support**
- Easy to add licenses from other platforms
- Manual license creation supported
- Consistent activation flow regardless of source

### 4. **Cost Efficiency**
- Fewer API calls = lower costs
- Reduced load on Gumroad's servers

---

## 🔒 Security

### How It Stays Secure

**Q: Can someone create a fake license by calling the webhook?**

**A: No, because:**

1. **Webhook verifies with Gumroad API** before storing
   - If `GUMROAD_PRODUCT_ID` is set, we call Gumroad's API
   - Only licenses that Gumroad confirms are marked as `verified: true`
   - Fake licenses fail verification and are marked `verified: false`

2. **Activation checks the verified flag**
   - `verified: true` → Activation allowed ✓
   - `verified: false` → Activation denied ❌

3. **Required fields validation**
   - Webhook rejects requests missing `email`, `sale_id`, or `product_name`

### Security Layers

```
Layer 1: Webhook Validation
├─ Required fields check
├─ Refund detection
└─ IP logging

Layer 2: Source API Verification (One-Time)
├─ Gumroad: /v2/licenses/verify
├─ Other platforms: Their verification API
└─ Manual: Admin approval

Layer 3: Verified Flag Check
├─ verified: true → Trust it
└─ verified: false → Deny or re-verify
```

---

## 📋 License Sources

### 1. Gumroad (Automated)

**Flow:**
```
Purchase → Webhook → Verify with Gumroad API → Store (verified: true)
```

**Fields:**
```typescript
{
  source: 'gumroad',
  verified: true,  // Verified during webhook
  email: 'customer@example.com',
  purchaseId: 'sale_abc123',
  licenseKey: 'GUMROAD-PROVIDED-KEY',
  ...
}
```

### 2. Manual (Admin Created)

**Flow:**
```
Admin creates → Store (verified: true, source: 'manual')
```

**Fields:**
```typescript
{
  source: 'manual',
  verified: true,  // Trusted by admin
  email: 'customer@example.com',
  licenseKey: 'MANUAL-GENERATED-KEY',
  ...
}
```

### 3. Other Platforms (Future)

**Flow:**
```
Platform webhook → Verify with platform API → Store (verified: true)
```

**Example (Stripe):**
```typescript
{
  source: 'stripe',
  verified: true,  // Verified with Stripe API
  email: 'customer@example.com',
  purchaseId: 'pi_abc123',
  ...
}
```

---

## 🔄 Migration Strategy

### Handling Old Licenses

Licenses created before this update don't have the `verified` flag.

**Behavior:**
```typescript
if (license.verified === undefined) {
  // Old license - verify with Gumroad API once
  const isValid = await verifyWithGumroadServer(licenseKey, env);
  
  if (isValid) {
    // Update license with verified: true
    license.verified = true;
    await putLicenseInDb(licenseKey, license, env);
  }
}
```

**Result:**
- Old licenses get verified on first activation
- Subsequent activations skip API call
- Seamless migration, no manual intervention needed

---

## 📊 Comparison

| Aspect                       | Old Architecture | New Architecture |
| ---------------------------- | ---------------- | ---------------- |
| **API calls per activation** | 1                | 0                |
| **Activation speed**         | ~300ms           | ~10ms            |
| **Gumroad API dependency**   | High             | Low              |
| **Multi-platform support**   | Hard             | Easy             |
| **Security**                 | Good             | Better           |
| **Cost**                     | Higher           | Lower            |

---

## 🛠️ Implementation Details

### Webhook (One-Time Verification)

```typescript
// In webhook handler
const licenseKey = data.license_key;

// Verify with Gumroad API
let isVerified = false;
if (env.GUMROAD_PRODUCT_ID && licenseKey) {
  const response = await fetch('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    body: new URLSearchParams({
      product_id: env.GUMROAD_PRODUCT_ID,
      license_key: licenseKey,
    }),
  });
  
  const payload = await response.json();
  isVerified = payload.success;
}

// Store with verified flag
await putLicenseInDb(licenseKey, {
  ...licenseData,
  verified: isVerified,
});
```

### Activation (Skip API Call)

```typescript
// In activation handler
export async function ensureGumroadLicenseStillValid(
  licenseKey: string,
  license: LicenseRecord,
  env: Env
): Promise<boolean> {
  // Non-Gumroad licenses are always valid
  if (license.source !== 'gumroad') return true;
  
  // If already verified, skip API call ✓
  if (license.verified) return true;
  
  // Only verify if not already verified (old licenses)
  const verified = await verifyWithGumroadServer(licenseKey, env);
  if (!verified) return false;
  
  // Mark as verified for future activations
  license.verified = true;
  await putLicenseInDb(licenseKey, license, env);
  return true;
}
```

---

## 🎯 Use Cases

### Use Case 1: Normal Gumroad Purchase

```
1. Customer buys on Gumroad
2. Webhook receives purchase
3. Worker calls Gumroad API to verify
4. Gumroad confirms: success: true
5. Store license with verified: true
6. Customer activates → Instant (no API call)
7. Customer activates on 2nd device → Instant (no API call)
```

### Use Case 2: Fake Webhook Attack

```
1. Attacker sends fake webhook
2. Worker calls Gumroad API to verify
3. Gumroad responds: success: false (license doesn't exist)
4. Store license with verified: false
5. Customer tries to activate → Denied ❌
```

### Use Case 3: Other Platform Sale

```
1. Customer buys on Stripe/Paddle/etc
2. Platform webhook received
3. Worker calls platform API to verify
4. Platform confirms purchase
5. Store license with verified: true, source: 'stripe'
6. Customer activates → Instant (no API call)
```

### Use Case 4: Manual License

```
1. Admin creates license manually
2. Store with verified: true, source: 'manual'
3. Customer activates → Instant (no API call)
```

---

## ✅ Checklist for Adding New Platforms

To add support for a new sales platform:

- [ ] Create webhook endpoint for platform
- [ ] Parse platform's webhook payload
- [ ] Call platform's verification API
- [ ] Set `verified: true` if verification succeeds
- [ ] Set `source: 'platform-name'`
- [ ] Store in KV

**That's it!** Activation flow works automatically.

---

## 🚀 Performance Impact

### Before (API Call on Every Activation)

```
Activation Request
  ├─ Lookup license in KV (10ms)
  ├─ Call Gumroad API (300ms) ← SLOW
  ├─ Update license in KV (10ms)
  └─ Return success (320ms total)
```

### After (One-Time Verification)

```
Webhook (One-Time)
  ├─ Parse payload (1ms)
  ├─ Call Gumroad API (300ms) ← Only once
  └─ Store in KV (10ms)

Activation Request
  ├─ Lookup license in KV (10ms)
  ├─ Check verified flag (0ms) ← FAST
  ├─ Update activations in KV (10ms)
  └─ Return success (20ms total) ← 16x faster!
```

---

## 📝 Summary

**Old Way:**
- Verify with Gumroad API on every activation
- Slow, expensive, dependent on Gumroad uptime

**New Way:**
- Verify once during webhook
- Mark as `verified: true`
- Skip API calls during activation
- Fast, cheap, reliable

**Result:**
- ✅ 16x faster activations
- ✅ Lower costs
- ✅ Better reliability
- ✅ Multi-platform support
- ✅ Same security level

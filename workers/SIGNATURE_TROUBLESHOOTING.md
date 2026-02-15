# Gumroad Webhook Signature Troubleshooting

## 🔴 Problem: Signature Verification Failed

Your logs show:
```
[Gumroad Webhook] Signature verification failed
Response: 403 Unauthorized
```

This means the webhook is being received, but the HMAC signature doesn't match.

## 🔍 Diagnosis Steps

### Step 1: Check if GUMROAD_SECRET is Set

```bash
cd workers
wrangler secret list --env production
```

**Expected output:** You should see `GUMROAD_SECRET` in the list.

**If missing:** The secret is not set. Proceed to Step 2.

### Step 2: Get Your Gumroad Webhook Secret

1. **Log in to Gumroad**
2. Go to **Settings** (click your profile icon)
3. Click **Advanced**
4. Scroll to **Webhooks** section
5. Look for **"Webhook Secret"** or **"Ping Secret"**
6. Copy the secret (it's a long alphanumeric string)

**Important:** This is NOT the same as your API key or product ID!

### Step 3: Set the Secret in Cloudflare

```bash
cd workers
wrangler secret put GUMROAD_SECRET --env production
```

When prompted, **paste the webhook secret** you copied from Gumroad.

### Step 4: Verify the Secret is Set

```bash
wrangler secret list --env production
```

You should now see:
```
GUMROAD_SECRET
GUMROAD_PRODUCT_ID (if you set this)
```

### Step 5: Test Again

1. Go to Gumroad → Your Product → Advanced → Ping URL
2. Click **"Send test ping"**
3. Check Cloudflare logs

You should now see:
```
✅ [Gumroad Webhook] Received webhook
✅ [Gumroad Webhook] Signature header present: Yes
✅ [Gumroad Webhook] GUMROAD_SECRET configured: Yes
✅ [Gumroad Webhook] Signature verified successfully ✓
✅ [Gumroad Webhook] Parsed data: {...}
✅ [Gumroad Webhook] License stored successfully
```

## 🔧 Alternative: Check Signature Details (Advanced)

If the secret is set but verification still fails, the issue might be:

### 1. Wrong Secret
- Make sure you copied the **webhook secret**, not the API key
- The secret should be from: Gumroad Settings → Advanced → Webhooks

### 2. Secret Has Whitespace
- The secret might have leading/trailing spaces
- When setting it, make sure to trim any whitespace

### 3. Gumroad Changed the Secret
- Gumroad may have regenerated the secret
- Get a fresh copy from Gumroad settings

## 📋 Quick Checklist

- [ ] Logged into Gumroad
- [ ] Found Settings → Advanced → Webhooks
- [ ] Copied the webhook secret (not API key)
- [ ] Ran `wrangler secret put GUMROAD_SECRET --env production`
- [ ] Pasted the secret when prompted
- [ ] Verified with `wrangler secret list --env production`
- [ ] Sent test ping from Gumroad
- [ ] Checked Cloudflare logs for success

## 🎯 Expected Gumroad Configuration

In your Gumroad product settings:

**Ping URL:**
```
https://openavathar-api-production.ananth-c-jayan.workers.dev/api/gumroad/webhook
```

**License Keys:**
- ✅ Enabled
- ✅ Generate license keys automatically

**Webhook Secret:**
- Copy this exact value and set it as `GUMROAD_SECRET` in Cloudflare

## 🚨 Common Mistakes

1. **Using API Key instead of Webhook Secret**
   - API Key: Used for API calls
   - Webhook Secret: Used for signature verification
   - These are DIFFERENT!

2. **Not deploying after setting secret**
   - Secrets are available immediately, no need to redeploy
   - But if you changed code, you need to deploy

3. **Wrong environment**
   - Make sure you're setting the secret for `--env production`
   - Not for local development

## 📞 Still Not Working?

If you've followed all steps and it still fails, check the new enhanced logs:

```
[Gumroad Webhook] Signature header present: Yes/No
[Gumroad Webhook] GUMROAD_SECRET configured: Yes/No
```

This will tell you exactly what's missing!

---

**Next:** Once signature verification passes, the license will be automatically stored in KV! 🎉

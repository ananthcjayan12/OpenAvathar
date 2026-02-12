# OpenAvathar Implementation Plan
## Complete Architecture & Implementation Guide

**Last Updated:** February 12, 2026  
**Status:** Phase 1 In Progress (Core UX underway)  
**Architecture:** Serverless + One-Time Payment

---

## 📋 Table of Contents

1. Executive Summary
2. Core Decisions
3. Architecture Overview
4. User Flows
5. Technical Stack
6. Cloudflare Workers API
7. Frontend Integration
8. Licensing System
9. UI/UX Changes
10. Implementation Phases
11. Cost Analysis
12. Future Enhancements

---

## 📖 Executive Summary

### Goal
Transform OpenAvathar from a developer-centric tool into a consumer-friendly application where **non-technical users can easily generate talking avatar videos** without understanding pods, deployments, or infrastructure.

### Key Principles
✅ **Studio-First Navigation** - Land users directly in creation mode  
✅ **Auto-Start Pods** - Automatically deploy infrastructure when needed  
✅ **Progressive Disclosure** - Show advanced features only when relevant  
✅ **Serverless & Lightweight** - Zero backend servers, minimal cost  
✅ **One-Time Payment** - Simple licensing via Gumroad  
✅ **InfiniteTalk Focus** - Remove Wan2.2 to prevent confusion  

---

## 🎯 Core Decisions

### What Changed (Problems Identified)
❌ Users forced through technical setup flow (Setup → Deploy → Generate)  
❌ Exposed backend concepts (Pods, GPU Types, Cloud Types)  
❌ Terminal logs in Deploy page scared non-tech users  
❌ Setup wizard blocked access to main generation feature  
❌ Multiple workflow types confused users  

### What We're Building
✅ **Simplified Navigation:** 3 core pages (Studio, Pods, Videos)  
✅ **Auto-Start Logic:** Deploy pods automatically on first generate  
✅ **Progressive Disclosure:** Show complexity only when needed  
✅ **Serverless Licensing:** Cloudflare Workers + KV for minimal cost  
✅ **One-Time Payment:** $29 lifetime via Gumroad (no subscriptions)  
✅ **Device Fingerprinting:** No accounts needed, license keys for portability  

---

## 🏗️ Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Public Landing Page (Marketing + SEO)                  │
│  - Hero section                                         │
│  - Pricing ($0 free, $29 pro)                          │
│  - Blog/SEO content                                     │
│  - [Try Free] → /studio                                 │
│  - [Buy Pro] → Gumroad                                  │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  React Frontend (Vite + TypeScript)                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🎬 Studio (GeneratePage)                        │   │
│  │   - Upload Image + Audio                        │   │
│  │   - Generate Video button                       │   │
│  │   - Auto-start pod if needed                    │   │
│  │   - Show queue/pod selector (if relevant)       │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 📹 Videos (Gallery)                             │   │
│  │   - Generated videos history                    │   │
│  │   - Download/share options                      │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 🚀 Pods (Management)                            │   │
│  │   - List all pods (cards)                       │   │
│  │   - Live logs (expandable)                      │   │
│  │   - Manual start/stop/delete                    │   │
│  │   - [+ New Pod] → Setup flow                    │   │
│  └─────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────┐   │
│  │ ⚙️ Settings                                      │   │
│  │   - RunPod API Key                              │   │
│  │   - License activation                          │   │
│  │   - Default GPU/Cloud settings                  │   │
│  │   - Usage stats (free: 1/1 today)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  Cloudflare Workers (Serverless Functions)              │
│  - /api/license/validate                                │
│  - /api/license/activate                                │
│  - /api/gumroad/webhook                                 │
│  - /api/generation/check                                │
│  - /api/generation/track                                │
└─────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────┐
│  Cloudflare KV (Key-Value Store)                        │
│  - License keys → {email, activations[], maxActivations}│
│  - Fingerprint → license mapping                        │
│  - Generation counts (24h TTL for free tier)            │
└─────────────────────────────────────────────────────────┘
                      ↑
┌─────────────────────────────────────────────────────────┐
│  Gumroad (Payment Processing)                           │
│  - Product: OpenAvathar Pro ($29 one-time)              │
│  - Webhook → Cloudflare Worker on purchase              │
│  - License key delivery via email                       │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

**Generation Flow:**
```
User clicks "Generate" 
  → Check fingerprint + license status (KV)
  → Free user: Check daily limit (1/day)
  → Pro user: No limit
  → Auto-start pod if none running
  → Queue job
  → Track generation (increment count)
  → Show video in gallery
```

**License Activation Flow:**
```
User buys on Gumroad
  → Gumroad webhook → Cloudflare Worker
  → Generate license key (OAVR-XXXX-XXXX-XXXX)
  → Store in KV with metadata
  → Email license key to user
  → User enters key in Settings
  → Validate + bind to device fingerprint
  → Mark as Pro in KV
  → Remove daily limits
```

---

## 👤 User Flows

### Flow A: First-Time Free User

```
1. Land on marketing page (/)
2. Click "Try Free"
3. → Redirect to /studio
4. System generates device fingerprint (silent)
5. Prompt: "Enter your RunPod API Key"
   - Link: "Get one at runpod.io"
6. User enters API key → Saved in localStorage
7. UI shows Studio page
   - "Free: 1/1 videos today"
   - Upload Image + Audio
   - [Generate Video] button
8. User uploads files + clicks Generate
9. System checks: No pod running
10. Show overlay: "Starting your studio (1-2 mins)..."
11. Deploy pod with defaults (RTX 4090, Community Cloud, InfiniteTalk)
12. Once ready, queue job automatically
13. Video appears in gallery
14. Track generation: 1/1 used today
```

### Flow B: Returning Free User (Daily Limit Hit)

```
1. Open app → /studio (direct)
2. System checks fingerprint in KV
   - Not Pro
   - Used 1/1 today
3. UI shows: "Daily limit reached (resets in 14h 23m)"
4. User clicks Generate anyway
5. Modal appears:
   ┌──────────────────────────────────────┐
   │ Daily Limit Reached                  │
   │                                      │
   │ Free users: 1 video/day              │
   │ Upgrade to Pro: Unlimited forever    │
   │                                      │
   │ [Wait Until Tomorrow]  [Upgrade $29] │
   └──────────────────────────────────────┘
6. Click [Upgrade] → Redirect to Gumroad
```

### Flow C: Buying & Activating Pro

```
1. User clicks "Upgrade to Pro" (Settings or modal)
2. → Redirect to Gumroad checkout page
3. User completes payment ($29)
4. Gumroad sends webhook to Cloudflare Worker
5. Worker:
   - Verifies webhook signature
   - Generates license key: OAVR-A1B2-C3D4-E5F6
   - Stores in KV:
     {
       email: "user@example.com",
       purchaseDate: "2026-02-11",
       activations: [],
       maxActivations: 3
     }
6. User receives email with license key
7. User returns to app → Settings → "Activate License"
8. Enter license key → Submit
9. Frontend calls /api/license/activate
10. Worker validates:
    - Key exists?
    - Under 3-device limit?
11. Bind fingerprint to license
12. Update KV: activations.push(fingerprint)
13. Frontend updates: isPro = true
14. UI changes:
    - Remove daily limit banner
    - Show "Pro" badge
    - Unlimited generations enabled
```

### Flow D: Developer User (Multiple Pods)

```
1. User is Pro (unlimited)
2. Go to /pods page
3. See existing pod: Pod-abc123 (Running)
4. Click [+ New Pod]
5. → /setup flow opens
6. Select GPU: RTX 4090
7. Select Cloud: Community
8. Click [Deploy]
9. → Deploy page shows logs
10. Once ready, return to /pods
11. Now have 2 pods running
12. Go to /studio
13. Pod selector dropdown appears (progressive disclosure)
    - Pod-abc123 (Idle)
    - Pod-xyz789 (Busy - 1 job)
14. Select Pod-abc123
15. Upload + Generate → Job goes to specific pod
16. Go back to /pods to view logs
```

---

## 🛠️ Technical Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Routing:** React Router v6
- **State Management:** Zustand (existing stores)
- **Styling:** CSS + Framer Motion
- **Fingerprinting:** FingerprintJS (@fingerprintjs/fingerprintjs)

### Backend (Serverless)
- **Functions:** Cloudflare Workers
- **Storage:** Cloudflare KV
- **Deployment:** Wrangler CLI
- **Language:** TypeScript

### External Services
- **Payment:** Gumroad (8.5% + $0.30 per sale)
- **Infrastructure:** RunPod API (user's own account)
- **Hosting:** Cloudflare Pages (frontend)

### Existing Services (Keep)
- RunPod API integration
- ComfyUI API client
- Job queue system
- Workflow patcher

---

## ☁️ Cloudflare Workers API

### Project Structure
```
workers/
├── wrangler.toml              # Config
├── src/
│   ├── index.ts               # Router
│   ├── license/
│   │   ├── validate.ts
│   │   └── activate.ts
│   ├── generation/
│   │   ├── check.ts
│   │   └── track.ts
│   ├── gumroad/
│   │   └── webhook.ts
│   └── utils/
│       ├── signature.ts       # Gumroad signature verification
│       └── license-gen.ts     # License key generation
└── package.json
```

### wrangler.toml
```toml
name = "openavathar-api"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[env.production]
kv_namespaces = [
  { binding = "LICENSES_KV", id = "YOUR_KV_ID" }
]

# NOTE: Do NOT put secrets in this file.
# KV namespace IDs are not secrets, but webhook secrets/API keys must never be committed.
#
# Set secrets via Wrangler (stored in Cloudflare):
#   wrangler secret put GUMROAD_SECRET --env production
```

### CI/CD (GitHub Actions) + Secret Hygiene

#### Devil’s Critique (why this can go wrong)
- **Risk: accidental secret leaks** if we embed secrets in `wrangler.toml` or commit `.dev.vars`.
- **Risk: “CI owns prod secrets”** if we push secret rotation into every deploy step; a compromised GitHub token would be higher blast radius.
- **Risk: drift between environments** if we deploy from different branches without a clear mapping (dev/staging/prod).

#### Recommendation
- Use GitHub Actions to deploy Workers (same approach as Pages) for repeatable releases.
- Keep **all real secrets in Cloudflare** via `wrangler secret put ...` (one-time setup per environment).
- In GitHub Actions, only store the minimum needed to deploy:
  - `CLOUDFLARE_API_TOKEN` (scoped to Workers/KV/Pages as needed)
  - `CLOUDFLARE_ACCOUNT_ID`
- Keep `wrangler.toml` free of secret values; bind names only.

#### Final Decision
✅ **Proceed with GitHub Actions for Workers deploy**, but **do not** inject app secrets from GitHub on every run by default.
We’ll set `GUMROAD_SECRET` once via Wrangler/Cloudflare, and CI will only perform build + deploy.

#### Example Workflow (Workers)
```yml
name: Deploy Cloudflare Worker

on:
  push:
    branches:
      - prod
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: workers/package-lock.json
      - name: Install
        working-directory: workers
        run: npm ci
      - name: Deploy
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          workingDirectory: workers
          command: deploy --env production
```

### API Endpoints

#### 1. POST /api/license/validate
**Purpose:** Check if a license key is valid

**Request:**
```json
{
  "licenseKey": "OAVR-A1B2-C3D4-E5F6"
}
```

**Response (200):**
```json
{
  "valid": true,
  "email": "user@example.com",
  "activationsUsed": 2,
  "maxActivations": 3,
  "purchaseDate": "2026-02-11"
}
```

**Implementation:**
```typescript
// src/license/validate.ts
export async function validateLicense(request: Request, env: Env) {
  const { licenseKey } = await request.json();
  
  const license = await env.LICENSES_KV.get(licenseKey);
  
  if (!license) {
    return Response.json({ valid: false, error: 'License key not found' }, { status: 404 });
  }
  
  const data = JSON.parse(license);
  
  return Response.json({
    valid: true,
    email: data.email,
    activationsUsed: data.activations.length,
    maxActivations: data.maxActivations,
    purchaseDate: data.purchaseDate
  });
}
```

---

#### 2. POST /api/license/activate
**Purpose:** Bind a license key to a device fingerprint

**Request:**
```json
{
  "licenseKey": "OAVR-A1B2-C3D4-E5F6",
  "fingerprint": "abc123def456"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "License activated on this device"
}
```

**Implementation:**
```typescript
// src/license/activate.ts
export async function activateLicense(request: Request, env: Env) {
  const { licenseKey, fingerprint } = await request.json();
  
  const licenseData = await env.LICENSES_KV.get(licenseKey);
  if (!licenseData) {
    return Response.json({ success: false, error: 'Invalid license key' }, { status: 404 });
  }
  
  const license = JSON.parse(licenseData);
  
  if (license.activations.includes(fingerprint)) {
    return Response.json({ success: true, message: 'Already activated on this device' });
  }
  
  if (license.activations.length >= license.maxActivations) {
    return Response.json({ 
      success: false, 
      error: `License already activated on ${license.maxActivations} devices` 
    }, { status: 403 });
  }
  
  license.activations.push(fingerprint);
  license.lastActivated = new Date().toISOString();
  
  await env.LICENSES_KV.put(licenseKey, JSON.stringify(license));
  await env.LICENSES_KV.put(`fp:${fingerprint}`, licenseKey);
  
  return Response.json({ success: true, message: 'License activated on this device' });
}
```

---

#### 3. POST /api/gumroad/webhook
**Purpose:** Receive purchase notifications from Gumroad

**Implementation:**
```typescript
// src/gumroad/webhook.ts
import { verifyGumroadSignature } from '../utils/signature';
import { generateLicenseKey } from '../utils/license-gen';

export async function handleGumroadWebhook(request: Request, env: Env) {
  const signature = request.headers.get('X-Gumroad-Signature');
  const body = await request.text();
  
  const isValid = await verifyGumroadSignature(body, signature, env.GUMROAD_SECRET);
  
  if (!isValid) {
    console.error('[Webhook] Invalid signature');
    return new Response('Unauthorized', { status: 403 });
  }
  
  const data = JSON.parse(body);
  const licenseKey = generateLicenseKey();
  
  await env.LICENSES_KV.put(licenseKey, JSON.stringify({
    email: data.email,
    purchaseId: data.sale_id,
    purchaseDate: new Date().toISOString(),
    activations: [],
    maxActivations: 3,
    product: 'OpenAvathar Pro (Lifetime)',
    price: data.price,
    currency: data.currency
  }));
  
  console.log('[Webhook] License created:', licenseKey);
  
  return new Response('OK', { status: 200 });
}
```

**Utils:**
```typescript
// src/utils/license-gen.ts
export function generateLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const parts: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    let part = '';
    for (let j = 0; j < 4; j++) {
      part += chars[Math.floor(Math.random() * chars.length)];
    }
    parts.push(part);
  }
  
  return `OAVR-${parts.join('-')}`;
}

// src/utils/signature.ts
export async function verifyGumroadSignature(
  body: string, 
  signature: string | null, 
  secret: string
): Promise<boolean> {
  if (!signature) return false;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(body);
  const key = encoder.encode(secret);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, data);
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex === signature;
}
```

---

#### 4. GET /api/generation/check
**Purpose:** Check if user can generate (Pro or within daily limit)

**Implementation:**
```typescript
// src/generation/check.ts
export async function checkGenerationLimit(request: Request, env: Env) {
  const url = new URL(request.url);
  const fingerprint = url.searchParams.get('fingerprint');
  
  if (!fingerprint) {
    return Response.json({ error: 'Missing fingerprint' }, { status: 400 });
  }
  
  const licenseKey = await env.LICENSES_KV.get(`fp:${fingerprint}`);
  
  if (licenseKey) {
    return Response.json({ 
      canGenerate: true, 
      isPro: true,
      licenseKey 
    });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const generationKey = `gen:${fingerprint}:${today}`;
  
  const countStr = await env.LICENSES_KV.get(generationKey);
  const count = countStr ? parseInt(countStr) : 0;
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  const resetsInMs = tomorrow.getTime() - now.getTime();
  const resetsInHours = Math.floor(resetsInMs / (1000 * 60 * 60));
  const resetsInMinutes = Math.floor((resetsInMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (count >= 1) {
    return Response.json({ 
      canGenerate: false, 
      isPro: false,
      limit: 1,
      used: count,
      resetsIn: `${resetsInHours}h ${resetsInMinutes}m`
    });
  }
  
  return Response.json({ 
    canGenerate: true, 
    isPro: false,
    limit: 1,
    used: count,
    resetsIn: `${resetsInHours}h ${resetsInMinutes}m`
  });
}
```

---

#### 5. POST /api/generation/track
**Purpose:** Increment generation count for free users

**Implementation:**
```typescript
// src/generation/track.ts
export async function trackGeneration(request: Request, env: Env) {
  const { fingerprint } = await request.json();
  
  if (!fingerprint) {
    return Response.json({ error: 'Missing fingerprint' }, { status: 400 });
  }
  
  const licenseKey = await env.LICENSES_KV.get(`fp:${fingerprint}`);
  if (licenseKey) {
    return Response.json({ success: true, count: 0, isPro: true });
  }
  
  const today = new Date().toISOString().split('T')[0];
  const generationKey = `gen:${fingerprint}:${today}`;
  
  const countStr = await env.LICENSES_KV.get(generationKey);
  const newCount = countStr ? parseInt(countStr) + 1 : 1;
  
  await env.LICENSES_KV.put(generationKey, newCount.toString(), {
    expirationTtl: 86400 // 24 hours
  });
  
  return Response.json({ success: true, count: newCount });
}
```

---

#### Main Router
```typescript
// src/index.ts
import { validateLicense } from './license/validate';
import { activateLicense } from './license/activate';
import { handleGumroadWebhook } from './gumroad/webhook';
import { checkGenerationLimit } from './generation/check';
import { trackGeneration } from './generation/track';

export interface Env {
  LICENSES_KV: KVNamespace;
  GUMROAD_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    try {
      if (url.pathname === '/api/license/validate' && request.method === 'POST') {
        const response = await validateLicense(request, env);
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      }
      
      if (url.pathname === '/api/license/activate' && request.method === 'POST') {
        const response = await activateLicense(request, env);
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      }
      
      if (url.pathname === '/api/gumroad/webhook' && request.method === 'POST') {
        return handleGumroadWebhook(request, env);
      }
      
      if (url.pathname === '/api/generation/check' && request.method === 'GET') {
        const response = await checkGenerationLimit(request, env);
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      }
      
      if (url.pathname === '/api/generation/track' && request.method === 'POST') {
        const response = await trackGeneration(request, env);
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
        return response;
      }
      
      return new Response('Not Found', { status: 404 });
      
    } catch (error: any) {
      console.error('[Worker Error]', error);
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
};
```

---

## 💻 Frontend Integration

### Install Dependencies
```bash
npm install @fingerprintjs/fingerprintjs
```

### Environment Variables
```env
# .env
VITE_WORKER_URL=https://openavathar-api.your-subdomain.workers.dev
VITE_GUMROAD_URL=https://yourname.gumroad.com/l/openavathar-pro
```

### Fingerprint Service
```typescript
// src/services/fingerprintService.ts
import FingerprintJS from '@fingerprintjs/fingerprintjs';

let cachedFingerprint: string | null = null;
let fpPromise: Promise<FingerprintJS.Agent> | null = null;

export async function getFingerprint(): Promise<string> {
  if (cachedFingerprint) {
    return cachedFingerprint;
  }
  
  if (!fpPromise) {
    fpPromise = FingerprintJS.load();
  }
  
  const fp = await fpPromise;
  const result = await fp.get();
  
  cachedFingerprint = result.visitorId;
  
  return cachedFingerprint;
}
```

### License Service
```typescript
// src/services/licenseService.ts

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

export interface LicenseStatus {
  isPro: boolean;
  canGenerate: boolean;
  limit?: number;
  used?: number;
  resetsIn?: string;
  licenseKey?: string;
}

export async function checkLicense(fingerprint: string): Promise<LicenseStatus> {
  const response = await fetch(`${WORKER_URL}/api/generation/check?fingerprint=${fingerprint}`);
  
  if (!response.ok) {
    throw new Error('Failed to check license status');
  }
  
  return response.json();
}

export async function activateLicense(
  licenseKey: string, 
  fingerprint: string
): Promise<{ success: boolean; message?: string; error?: string }> {
  const response = await fetch(`${WORKER_URL}/api/license/activate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey, fingerprint })
  });
  
  return response.json();
}

export async function trackGeneration(fingerprint: string) {
  const response = await fetch(`${WORKER_URL}/api/generation/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fingerprint })
  });
  
  return response.json();
}
```

### Pod Auto-Starter Service
```typescript
// src/services/podAutoStarter.ts
import { useAppStore } from '@/stores/appStore';
import { runpodApi } from './runpodApi';

export interface AutoStartOptions {
  showLoadingOverlay?: boolean;
  onProgress?: (message: string) => void;
}

export class AutoStartError extends Error {
  canRetry: boolean;
  canManual: boolean;
  
  constructor(message: string, options: { canRetry: boolean; canManual: boolean }) {
    super(message);
    this.name = 'AutoStartError';
    this.canRetry = options.canRetry;
    this.canManual = options.canManual;
  }
}

export async function ensurePodAvailable(options: AutoStartOptions = {}): Promise<string> {
  const { pods, activePodId, purpose, gpuType, cloudType, apiKey, addPod } = useAppStore.getState();
  
  // Step 1: Check if activePodId exists and is running
  if (activePodId && pods[activePodId]?.status === 'running') {
    console.log('[AutoStart] Active pod is running:', activePodId);
    return activePodId;
  }
  
  // Step 2: Find any running pod matching purpose
  const availablePod = Object.values(pods).find(
    p => p.status === 'running' && p.purpose === (purpose || 'infinitetalk')
  );
  
  if (availablePod) {
    console.log('[AutoStart] Found available pod:', availablePod.id);
    useAppStore.getState().setActivePodId(availablePod.id);
    return availablePod.id;
  }
  
  // Step 3: No pod available, deploy new one
  if (!apiKey) {
    throw new AutoStartError('RunPod API key not set. Please add it in Settings.', {
      canRetry: false,
      canManual: true
    });
  }
  
  console.log('[AutoStart] No pod available, deploying new one...');
  
  try {
    options.onProgress?.('Requesting GPU pod from RunPod...');
    
    const TEMPLATE_ID = 'qvidd7ityi'; // InfiniteTalk template
    
    const pod = await runpodApi.deployPod(apiKey, {
      name: `OpenAvathar-${Date.now().toString().slice(-4)}`,
      templateId: TEMPLATE_ID,
      gpuTypeId: gpuType || 'NVIDIA GeForce RTX 4090',
      gpuCount: 1,
      cloudType: cloudType || 'COMMUNITY',
    });
    
    console.log('[AutoStart] Pod deployed:', pod.id);
    
    // Add to store
    addPod({
      id: pod.id,
      name: `OpenAvathar-${Date.now().toString().slice(-4)}`,
      status: 'deploying',
      purpose: 'infinitetalk',
      gpuType: gpuType || 'NVIDIA GeForce RTX 4090',
      cloudType: cloudType || 'COMMUNITY',
      comfyuiUrl: null,
      logServerUrl: null,
    });
    
    options.onProgress?.('Pod created, waiting for it to start...');
    
    // Wait for pod to be running (with timeout)
    const startTime = Date.now();
    const timeout = 5 * 60 * 1000; // 5 minutes
    
    while (true) {
      if (Date.now() - startTime > timeout) {
        throw new AutoStartError('Pod deployment timed out. Please check Pods page.', {
          canRetry: true,
          canManual: true
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Poll every 10s
      
      const status = await runpodApi.getPodStatus(apiKey, pod.id);
      
      if (status.desiredStatus === 'RUNNING' && status.runtime) {
        const comfyUrl = `https://${pod.id}-8188.proxy.runpod.net`;
        const logUrl = `https://${pod.id}-8001.proxy.runpod.net`;
        
        useAppStore.getState().updatePod(pod.id, {
          status: 'running',
          comfyuiUrl: comfyUrl,
          logServerUrl: logUrl
        });
        
        console.log('[AutoStart] Pod is now running!');
        options.onProgress?.('Pod is ready!');
        
        return pod.id;
      }
      
      options.onProgress?.('Still waiting for pod to start...');
    }
    
  } catch (error: any) {
    console.error('[AutoStart] Failed to deploy pod:', error);
    
    throw new AutoStartError(error.message || 'Failed to start pod', {
      canRetry: true,
      canManual: true
    });
  }
}
```

### Update App Store
```typescript
// src/stores/appStore.ts (add to existing)

interface AppState {
  // ... existing fields
  
  // Licensing
  isPro: boolean;
  licenseKey: string | null;
  fingerprint: string | null;
  generationsToday: number;
  dailyLimit: number;
  
  // Auto-start settings
  autoStartPods: boolean;
  showJobQueue: boolean;
  
  // Actions
  setLicenseStatus: (isPro: boolean, licenseKey?: string) => void;
  setFingerprint: (fp: string) => void;
  setGenerationsToday: (count: number) => void;
  setAutoStartPods: (enabled: boolean) => void;
  setShowJobQueue: (show: boolean) => void;
}

// Add to defaults:
isPro: false,
licenseKey: null,
fingerprint: null,
generationsToday: 0,
dailyLimit: 1,
autoStartPods: true,
showJobQueue: false,

// Add to actions:
setLicenseStatus: (isPro, licenseKey) => set({ isPro, licenseKey }),
setFingerprint: (fingerprint) => set({ fingerprint }),
setGenerationsToday: (generationsToday) => set({ generationsToday }),
setAutoStartPods: (autoStartPods) => set({ autoStartPods }),
setShowJobQueue: (showJobQueue) => set({ showJobQueue }),
```

### Initialize App
```typescript
// src/App.tsx

import { useEffect } from 'react';
import { getFingerprint } from '@/services/fingerprintService';
import { checkLicense } from '@/services/licenseService';

function App() {
  const { setFingerprint, setLicenseStatus, setGenerationsToday } = useAppStore();
  
  useEffect(() => {
    async function initializeLicense() {
      try {
        const fp = await getFingerprint();
        setFingerprint(fp);
        
        const status = await checkLicense(fp);
        
        if (status.isPro) {
          setLicenseStatus(true, status.licenseKey);
        } else {
          setGenerationsToday(status.used || 0);
        }
      } catch (error) {
        console.error('[App] Failed to initialize license:', error);
      }
    }
    
    initializeLicense();
  }, []);
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicLanding />} />
        <Route path="/studio" element={
          <ProtectedRoute><MainLayout><GeneratePage /></MainLayout></ProtectedRoute>
        } />
        {/* ... other routes */}
      </Routes>
    </BrowserRouter>
  );
}
```

---

## 🎨 UI/UX Changes

### New Sidebar Navigation

```typescript
// src/components/layout/Sidebar.tsx

const navItems = [
  { path: '/studio', label: 'Studio', icon: <Wand2 size={18} /> },
  { path: '/videos', label: 'Videos', icon: <Film size={18} /> },
  { path: '/pods', label: 'Pods', icon: <Rocket size={18} /> },
];

const secondaryItems = [
  { path: '/settings', label: 'Settings', icon: <Settings size={18} /> },
  { path: '/docs', label: 'Docs', icon: <BookOpen size={18} /> },
];
```

### Update GeneratePage
```typescript
// src/pages/GeneratePage.tsx

import { useState } from 'react';
import { getFingerprint } from '@/services/fingerprintService';
import { checkLicense, trackGeneration } from '@/services/licenseService';
import { ensurePodAvailable, AutoStartError } from '@/services/podAutoStarter';
import UpgradeModal from '@/components/UpgradeModal';

const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [autoStartProgress, setAutoStartProgress] = useState<string | null>(null);

const handleGenerate = async () => {
  if (!selectedImage || !selectedAudio) return;
  
  try {
    // 1. Check license status
    const fingerprint = await getFingerprint();
    const status = await checkLicense(fingerprint);
    
    if (!status.canGenerate) {
      setShowUpgradeModal(true);
      return;
    }
    
    // 2. Show loading overlay
    setAutoStartProgress('Checking pod availability...');
    
    // 3. Ensure pod is available (auto-start if needed)
    const podId = await ensurePodAvailable({
      onProgress: (msg) => setAutoStartProgress(msg)
    });
    
    setAutoStartProgress(null);
    
    // 4. Queue job
    const jobId = addJob(
      {
        imageFile: selectedImage,
        audioFile: selectedAudio,
        prompt: prompt || 'high quality video',
        orientation: videoOrientation,
        maxFrames: maxFrames,
        workflowType: 'infinitetalk',
        audioCfgScale: audioCfgScale,
      },
      podId
    );
    
    // 5. Start processing
    jobProcessor.processJob(jobId);
    
    // 6. Track generation (increments free user count)
    if (!status.isPro) {
      await trackGeneration(fingerprint);
      setGenerationsToday(prev => prev + 1);
    }
    
    // Reset form
    setSelectedImage(null);
    setSelectedAudio(null);
    setImagePreview(null);
    setPrompt('');
    
  } catch (error: any) {
    setAutoStartProgress(null);
    
    if (error instanceof AutoStartError) {
      // Show error modal with retry/manual options
      setError(error.message);
    } else {
      setError('Failed to generate video. Please try again.');
    }
  }
};

// Show auto-start loading overlay
{autoStartProgress && (
  <div className="auto-start-overlay">
    <div className="loader"></div>
    <p>{autoStartProgress}</p>
  </div>
)}

// Show upgrade modal
<UpgradeModal 
  isOpen={showUpgradeModal} 
  onClose={() => setShowUpgradeModal(false)}
  resetsIn={status?.resetsIn}
/>
```

---

## 🚀 Implementation Phases

### ✅ Progress Update (as of Feb 12, 2026)
- Auto-start pod orchestration is implemented (including ComfyUI warm-up probing) and wired into Studio generation.
- Studio now shows a friendly “auto-start / warm-up” status banner while infrastructure spins up.
- Job queue UX improved: pending job count badge in Sidebar, and job queue persistence with safe reset-on-refresh behavior.
- Pod detail log streaming is safer (connect logs only after runtime is available; clean disconnect on unmount).
- InfiniteTalk workflow tuned for better runtime behavior (device load target + reduced block swapping).

### Phase 1: Core UX (Week 1)
- [x] Update Sidebar navigation
- [ ] Create VideosPage
- [ ] Create PodsPage
- [ ] Create SettingsPage
- [x] Implement podAutoStarter service
- [x] Update GeneratePage with auto-start
- [x] Add progressive disclosure (pod selector)
- [ ] Test auto-start flow

#### Phase 1 (Additional Completed Work)
- [x] Persist job queue across refresh (reset any in-progress jobs back to queued on hydration)
- [x] Sidebar shows active queued/running job count badge for quick visibility
- [x] Improve PodDetail log streaming lifecycle (poll runtime first; connect/disconnect reliably)

### Phase 2: Cloudflare Workers (Week 2)
- [ ] Set up Cloudflare account
- [ ] Create KV namespace
- [x] Initialize Wrangler project
- [x] Implement all API endpoints
- [ ] Deploy workers
- [x] Add GitHub Actions workflow for Workers deploy
- [ ] Configure Cloudflare secrets via Wrangler (`wrangler secret put ...`) and keep secrets out of `wrangler.toml`
- [ ] Test with Postman

### Phase 3: Frontend Licensing (Week 3)
- [ ] Install FingerprintJS
- [ ] Create fingerprint service
- [ ] Create license service
- [ ] Update appStore
- [ ] Add limit enforcement
- [ ] Create UpgradeModal
- [ ] Test free tier limits

### Phase 4: Payment (Week 4)
- [ ] Set up Gumroad
- [ ] Implement webhook
- [ ] Test purchase flow
- [ ] Add license activation UI
- [ ] Test full end-to-end

### Phase 5: Landing Page (Week 5)
- [ ] Create PublicLanding
- [ ] Add SEO
- [ ] Deploy to Cloudflare Pages
- [ ] A/B test CTAs

### Phase 6: Polish (Week 6)
- [ ] Bug fixes
- [ ] Error handling
- [ ] Performance optimization
- [ ] Documentation

---

## 💰 Cost Analysis

| Service | Cost |
|---------|------|
| Cloudflare Workers | Free (100k req/day) |
| Cloudflare KV | Free (100k reads/day) |
| Cloudflare Pages | Free |
| FingerprintJS | Free (20k calls/month) |
| Gumroad | 8.5% + $0.30 per sale |
| Domain | ~$10/year |

**Total: ~$1/month**

---

## 🔮 Future Enhancements

- Team/Enterprise plans
- API access
- Pre-built templates
- Cloud storage integration
- Mobile app
- Social features

---

**END OF PLAN.MD**

You can now copy this entire content and save it as `PLAN.md` in your repository root!

Similar code found with 1 license type
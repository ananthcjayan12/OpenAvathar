# OpenAvathar Frontend Issues & Fixes

## Executive Summary
After a thorough code review as a senior React engineer, I've identified **12 critical issues** across the codebase that are preventing the deployment flow from working correctly. The main problem is that clicking "Confirm & Launch" navigates directly to `/deploy` without actually triggering any API calls—the pod creation happens, but the monitoring never starts properly.

---

## 🔴 CRITICAL ISSUES (Blocking Functionality)

### Issue #1: SetupPage Does NOT Deploy - Just Navigates
**File:** `SetupPage.tsx` (Line 221)
**Severity:** 🔴 CRITICAL

**Problem:**
The "Confirm & Launch" button only calls `navigate('/deploy')`. It doesn't save state, set any flag, or prepare deployment. DeployPage then has complex logic to decide whether to deploy or monitor, but it never gets correct info.

```tsx
// CURRENT (BROKEN)
onClick={() => navigate('/deploy')}
```

**Fix:**
SetupPage should either:
1. Start deployment here and pass podId to DeployPage, OR
2. Set a clear flag in store that DeployPage reads

```tsx
// FIX OPTION A: Just navigate, but reset podId to ensure fresh deploy
onClick={() => {
    setPodId(null);  // Clear any stale pod
    setPodStatus('idle');
    navigate('/deploy');
}}

// FIX OPTION B: Pre-start deployment here
onClick={async () => {
    const pod = await runpodApi.deployPod(...);
    setPodId(pod.id);
    navigate('/deploy');
}}
```

---

### Issue #2: DeployPage useEffect Has Race Condition
**File:** `DeployPage.tsx` (Lines 45-137)
**Severity:** 🔴 CRITICAL

**Problem:**
The useEffect has `[apiKey, podId, purpose, cloudType, gpuType]` as dependencies. When `setPodId(pod.id)` is called after deployment, it triggers a RE-RUN of the effect. But `deploymentStarted.current` is already `true`, so it skips everything.

The sequence:
1. User lands on page → podId=null, purpose='wan2.2', podStatus='idle'
2. Effect runs → startDeployment() called → deploymentStarted=true
3. API returns → setPodId('xyz') called
4. Effect RE-RUNS because podId changed
5. podId exists, so `monitorPod(podId)` should run
6. BUT! It DOES run, but then the cleanup from the PREVIOUS effect run clears the interval!

```tsx
// PROBLEM: Cleanup runs BEFORE new effect finishes setting up
return () => {
    isMounted = false;  // This kills the interval immediately
    if (pollInterval) clearInterval(pollInterval);
};
```

**Fix:**
Don't put `podId` in the dependency array. Use a separate effect to monitor podId changes:

```tsx
// Effect 1: Deployment (runs once)
useEffect(() => {
    if (!podId && purpose && podStatus === 'idle') {
        startDeployment();
    }
}, []); // Empty deps - only on mount

// Effect 2: Monitoring (reacts to podId)
useEffect(() => {
    if (podId && podStatus !== 'running') {
        const interval = startMonitoring(podId);
        return () => clearInterval(interval);
    }
}, [podId]);
```

---

### Issue #3: Unused Variables in SetupPage (Lint Errors)
**File:** `SetupPage.tsx` (Lines 13, 18, 28, 29)
**Severity:** 🟡 MEDIUM

**Problem:**
Multiple unused imports/variables causing TypeScript warnings:
- `Loader2` imported but never used
- `CloudType` imported but never used
- `gpuType` and `setGpuType` destructured but never used

**Fix:**
```tsx
// Remove from imports
import { Video, Mic, Settings, Cpu, Shield, Globe, CheckCircle2, ChevronRight, Info } from 'lucide-react';
import type { GPU, Purpose } from '@/types';

// Remove from destructuring
const { apiKey, purpose, setPurpose, cloudType, setCloudType } = useAppStore();
```

---

### Issue #4: podStatus Never Resets on Fresh Deploy
**File:** `appStore.ts` (partialize function, Lines 102-109)
**Severity:** 🔴 CRITICAL

**Problem:**
`podStatus` is NOT included in partialize, so it's not persisted. But also, it's never explicitly reset when starting a fresh deployment from SetupPage.

If a previous session ended with `podStatus='running'` and the user clears only `podId`, the status remains stale.

**Fix:**
Either persist podStatus, or explicitly reset it on navigation:

```tsx
// In SetupPage, before navigating:
setPodStatus('idle');
navigate('/deploy');
```

---

### Issue #5: DeployPage Shows Wrong UI When podStatus is 'idle'
**File:** `DeployPage.tsx` (Lines 231-240)
**Severity:** 🟡 MEDIUM

**Problem:**
The ternary logic for the status icon shows:
- `deploying` → Spinner
- `running` → Green checkmark
- ELSE → Red error triangle

But `idle` is also a valid status and shouldn't show an error!

```tsx
// CURRENT (SHOWS ERROR FOR IDLE)
: podStatus === 'running' ? ( <CheckCircle2 /> ) : ( <AlertTriangle /> )
```

**Fix:**
```tsx
{podStatus === 'idle' || podStatus === 'deploying' ? (
    <Loader2 className="animate-spin" />
) : podStatus === 'running' ? (
    <CheckCircle2 />
) : (
    <AlertTriangle />
)}
```

---

### Issue #6: Duplicate Store Actions
**File:** `appStore.ts` (Lines 39-40, 75-76)
**Severity:** 🟢 LOW

**Problem:**
Both `setPromptId` and `setCurrentPromptId` exist and do the exact same thing.

**Fix:**
Remove one of them and update all usages to use a single action name:

```tsx
// Keep only one
setCurrentPromptId: (currentPromptId) => set({ currentPromptId }),
```

---

## 🟡 MEDIUM ISSUES (Causing Bugs But Not Blocking)

### Issue #7: No API Call Visible in Network Tab
**File:** `runpodApi.ts` (Line 4)
**Severity:** 🟡 MEDIUM

**Problem:**
The URL is `/graphql` which requires a Vite proxy to forward to RunPod. If proxy is misconfigured, calls silently fail or go to wrong endpoint.

**Diagnosis:**
Check `vite.config.ts` for proxy configuration. Should have:
```tsx
server: {
    proxy: {
        '/graphql': {
            target: 'https://api.runpod.io',
            changeOrigin: true,
        },
    },
},
```

**Fix:**
Verify proxy is configured. If not, add it. Alternatively, use full URL:
```tsx
const RUNPOD_URL = 'https://api.runpod.io/graphql';
```

---

### Issue #8: 'type' Parameter Unused in comfyuiApi
**File:** `comfyuiApi.ts` (Line 16)
**Severity:** 🟢 LOW

**Problem:**
The `uploadFile` function accepts a `type` parameter but never uses it.

```tsx
async uploadFile(comfyuiUrl: string, file: File, type: 'image' | 'audio' = 'image')
```

**Fix:**
Either remove the parameter or use it:
```tsx
async uploadFile(comfyuiUrl: string, file: File): Promise<string>
```

---

### Issue #9: No Error Handling for Missing Purpose in DeployPage
**File:** `DeployPage.tsx` (Line 101)
**Severity:** 🟡 MEDIUM

**Problem:**
If `purpose` is null/undefined, the templateId selection fails silently:
```tsx
const templateId = purpose === 'wan2.2' ? '6au21jp9c9' : 'qvidd7ityi';
```

If purpose is null, it uses InfiniteTalk template by default, which may not be intentional.

**Fix:**
```tsx
if (!purpose) {
    setError('No purpose selected');
    setPodStatus('failed');
    return;
}
const templateId = purpose === 'wan2.2' ? '6au21jp9c9' : 'qvidd7ityi';
```

---

### Issue #10: Logs Not Cleared on New Deployment
**File:** `DeployPage.tsx`
**Severity:** 🟢 LOW

**Problem:**
When starting a fresh deployment, old logs from previous session may still be visible.

**Fix:**
```tsx
// At start of startDeployment()
clearLogs();
setPodStatus('deploying');
```

---

## 🟢 NICE-TO-HAVE IMPROVEMENTS

### Issue #11: Magic Template IDs
**File:** `DeployPage.tsx` (Line 101)
**Severity:** 🟢 LOW

**Problem:**
Template IDs are hardcoded strings that are meaningless without context.

**Fix:**
Move to constants:
```tsx
const TEMPLATES = {
    'wan2.2': '6au21jp9c9',
    'infinitetalk': 'qvidd7ityi',
} as const;

const templateId = TEMPLATES[purpose];
```

---

### Issue #12: No Timeout for Pod Polling
**File:** `DeployPage.tsx` (Line 62)
**Severity:** 🟢 LOW

**Problem:**
If pod never becomes RUNNING, polling continues forever.

**Fix:**
```tsx
const MAX_POLL_ATTEMPTS = 60; // 5 minutes
let attempts = 0;

pollInterval = window.setInterval(async () => {
    attempts++;
    if (attempts > MAX_POLL_ATTEMPTS) {
        clearInterval(pollInterval);
        setError('Deployment timed out');
        setPodStatus('failed');
        return;
    }
    // ... rest of polling logic
}, 5000);
```

---

## 📋 RECOMMENDED FIX ORDER

1. **Issue #1** - Fix SetupPage to reset state before navigating
2. **Issue #2** - Split DeployPage into two effects
3. **Issue #4** - Ensure podStatus resets properly
4. **Issue #5** - Fix status icon logic for idle state
5. **Issue #7** - Verify proxy configuration
6. **Issue #3** - Clean up unused imports
7. **Issue #9** - Add purpose validation
8. Remaining issues as time permits

---

## 🧪 TEST PLAN

After fixing:
1. Clear localStorage
2. Enter API key on LandingPage
3. Select purpose on SetupPage
4. Click "Confirm & Launch"
5. **EXPECTED:** Network tab shows GraphQL mutation to create pod
6. **EXPECTED:** DeployPage shows spinner with "Requesting GPU Pod..."
7. **EXPECTED:** After pod created, shows "Waiting for container..."
8. **EXPECTED:** After pod running, shows green checkmark and "Go to Generator" button

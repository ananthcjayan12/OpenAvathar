# CORS Fix for File Upload Issues

## Problem
When uploading images/audio files and clicking "Generate Video", the browser throws a **CORS (Cross-Origin Resource Sharing)** error. This happens because the frontend is making requests from one origin (e.g., `localhost:5173`) to ComfyUI running on a different origin (e.g., `https://podid-8188.proxy.runpod.net`).

---

## Root Cause
ComfyUI by default **does not enable CORS headers**, which prevents browsers from making cross-origin requests for security reasons. When you try to upload files or queue workflows from the browser, the request is blocked.

---

## ✅ Solution

### 1. **Backend Fix: Enable CORS in ComfyUI** (REQUIRED)

**File:** `for_ref/entrypoint.sh` (Line 72)

**Change:**
```bash
# BEFORE (BROKEN - No CORS)
exec python3 main.py --listen 0.0.0.0 --port 8188 >> "$LOG_FILE" 2>&1

# AFTER (FIXED - CORS Enabled)
exec python3 main.py --listen 0.0.0.0 --port 8188 --enable-cors-header >> "$LOG_FILE" 2>&1
```

**What this does:**
- The `--enable-cors-header` flag tells ComfyUI to add CORS headers to all HTTP responses
- This allows browsers to make cross-origin requests for file uploads and API calls
- **This is the critical fix** - without this, uploads will always fail

---

### 2. **Frontend Improvements: Better Error Handling**

**File:** `src/services/comfyuiApi.ts`

We've also improved the frontend to:

#### A. Remove Manual Content-Type Header
```typescript
// BEFORE (BROKEN)
const response = await axios.post(`${comfyuiUrl}/upload/image`, formData, {
    headers: {
        'Content-Type': 'multipart/form-data',  // ❌ Don't set this manually
    },
});

// AFTER (FIXED)
const response = await axios.post(`${comfyuiUrl}${endpoint}`, formData, {
    headers: {
        // ✅ Let browser set Content-Type with boundary automatically
    },
    timeout: 60000,
});
```

**Why?** When you manually set `Content-Type: multipart/form-data`, the browser doesn't add the required `boundary` parameter, causing uploads to fail.

#### B. Use Same Endpoint for All Files
```typescript
// ComfyUI uses /upload/image for ALL file types (images AND audio)
formData.append('image', file);  // Always use 'image' field name

const response = await axios.post(`${comfyuiUrl}/upload/image`, formData, {
    // ...
});
```

**Important:** ComfyUI doesn't have a separate `/upload/audio` endpoint. All files (images and audio) are uploaded to `/upload/image` and stored in the input folder.

#### C. Better Error Messages
```typescript
try {
    const response = await axios.post(...);
    return response.data.name;
} catch (error: any) {
    if (error.response) {
        throw new Error(`Upload failed: ${error.response.status} - ${error.response.statusText}`);
    } else if (error.request) {
        throw new Error('Upload failed: No response from server. Check CORS settings.');
    } else {
        throw new Error(`Upload failed: ${error.message}`);
    }
}
```

#### D. Added Timeouts
```typescript
// File upload: 60 seconds (for large files)
timeout: 60000

// Workflow queue: 30 seconds
timeout: 30000

// Status check: 10 seconds
timeout: 10000
```

---

## 🔧 How to Apply the Fix

### Step 1: Update Your Docker Image/Template

If you're using a **RunPod template**, you need to:

1. **Update the entrypoint.sh** in your Docker image with the CORS flag
2. **Rebuild your Docker image**:
   ```bash
   docker build -t your-registry/comfyui-wan:latest .
   docker push your-registry/comfyui-wan:latest
   ```
3. **Update your RunPod template** to use the new image

### Step 2: For Existing Pods (Temporary Fix)

If you have a pod already running and want to test without rebuilding:

1. **SSH into your pod**:
   ```bash
   ssh root@pod-ip -p port
   ```

2. **Stop ComfyUI**:
   ```bash
   pkill -f "python3 main.py"
   ```

3. **Restart with CORS enabled**:
   ```bash
   cd /workspace/runpod-slim/ComfyUI
   python3 main.py --listen 0.0.0.0 --port 8188 --enable-cors-header
   ```

### Step 3: Verify the Fix

1. **Open browser DevTools** (F12)
2. **Go to Network tab**
3. **Upload an image** in your app
4. **Check the request headers**:
   - Should see `Access-Control-Allow-Origin: *` in the response
5. **Upload should succeed** without CORS errors

---

## 🧪 Testing Checklist

After applying the fix:

- [ ] **Image Upload**: Upload a test image
  - ✅ No CORS error in console
  - ✅ File uploads successfully
  - ✅ Returns filename in response

- [ ] **Audio Upload** (InfiniteTalk): Upload a test audio file
  - ✅ No CORS error in console
  - ✅ File uploads successfully
  - ✅ Returns filename in response

- [ ] **Workflow Queue**: Click "Generate Video"
  - ✅ No CORS error in console
  - ✅ Workflow queues successfully
  - ✅ Returns prompt_id in response

- [ ] **Status Polling**: Check generation status
  - ✅ No CORS error in console
  - ✅ Status updates correctly
  - ✅ Video URL returned on completion

---

## 🔍 Debugging CORS Issues

### Check if CORS is enabled:

**Method 1: Browser DevTools**
1. Open DevTools (F12) → Network tab
2. Upload a file
3. Click on the request
4. Check **Response Headers**:
   ```
   Access-Control-Allow-Origin: *
   Access-Control-Allow-Methods: GET, POST, OPTIONS
   Access-Control-Allow-Headers: Content-Type
   ```

**Method 2: cURL Test**
```bash
curl -I https://your-pod-id-8188.proxy.runpod.net/upload/image
```

Look for CORS headers in the response.

### Common CORS Error Messages:

**Error 1:**
```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:5173' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```
**Fix:** Add `--enable-cors-header` to ComfyUI startup

**Error 2:**
```
Access to XMLHttpRequest at 'https://...' from origin 'http://localhost:5173' 
has been blocked by CORS policy: Request header field content-type is not allowed
```
**Fix:** Remove manual `Content-Type` header (already fixed in our code)

**Error 3:**
```
Failed to load resource: net::ERR_FAILED
```
**Fix:** Check if ComfyUI is actually running and accessible

---

## 📋 Summary of Changes

### Backend (entrypoint.sh)
```diff
- exec python3 main.py --listen 0.0.0.0 --port 8188 >> "$LOG_FILE" 2>&1
+ exec python3 main.py --listen 0.0.0.0 --port 8188 --enable-cors-header >> "$LOG_FILE" 2>&1
```

### Frontend (comfyuiApi.ts)
1. ✅ Removed manual `Content-Type` header
2. ✅ Use `/upload/image` for all file types (images and audio)
3. ✅ Added proper error handling
4. ✅ Added timeouts for all requests
5. ✅ Better error messages

---

## 🚀 Next Steps

1. **Update your entrypoint.sh** with the CORS flag
2. **Rebuild your Docker image** (if using custom image)
3. **Update your RunPod template** (if using template)
4. **Deploy a new pod** with the updated configuration
5. **Test file uploads** to verify CORS is working

---

## ⚠️ Important Notes

1. **`--enable-cors-header` is safe** for development and internal use
2. **For production**, you may want to restrict CORS to specific origins:
   - This would require modifying ComfyUI's source code
   - Or using a reverse proxy (nginx) with CORS configuration

3. **The fix is permanent** once applied to your Docker image/template
4. **Existing pods** need to be restarted or manually updated

---

## ✅ Verification

After applying the fix, you should see:

**In Browser Console:**
```
✅ File uploaded successfully: image_12345.png
✅ Workflow queued: prompt_id_67890
✅ Generation status: running
✅ Generation complete: output/video_final.mp4
```

**No CORS errors!** 🎉

---

## 📞 Troubleshooting

If you still see CORS errors after applying the fix:

1. **Verify ComfyUI restarted** with the new flag
2. **Check ComfyUI logs** for startup messages
3. **Clear browser cache** and hard reload (Ctrl+Shift+R)
4. **Check if pod is using the updated image/template**
5. **Verify the flag is actually in the command**:
   ```bash
   ps aux | grep "main.py"
   # Should show: --enable-cors-header
   ```

If issues persist, check:
- Is ComfyUI actually running?
- Is the port 8188 accessible?
- Are there any firewall/network issues?
- Is the RunPod proxy working correctly?

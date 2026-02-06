# Audio Upload Fix - 405 Method Not Allowed

## Problem
When uploading audio files and clicking "Generate", the upload failed with:
```
405 Method Not Allowed
POST https://.../upload/audio
```

## Root Cause
ComfyUI **does not have a separate `/upload/audio` endpoint**. 

The code was trying to use:
- `/upload/image` for images
- `/upload/audio` for audio files ❌

But ComfyUI only has **one upload endpoint**: `/upload/image` for ALL file types.

## Solution

### Changed in `src/services/comfyuiApi.ts`:

**BEFORE (BROKEN):**
```typescript
// Tried to detect file type and use different endpoints
const isAudio = file.type.startsWith('audio/');

if (isAudio) {
    formData.append('audio', file);
    endpoint = '/upload/audio';  // ❌ This endpoint doesn't exist!
} else {
    formData.append('image', file);
    endpoint = '/upload/image';
}
```

**AFTER (FIXED):**
```typescript
// Use /upload/image for ALL file types
formData.append('image', file);  // Always use 'image' field name

const response = await axios.post(`${comfyuiUrl}/upload/image`, formData, {
    // ...
});
```

## How ComfyUI Handles Uploads

ComfyUI stores all uploaded files in the **`input/`** folder, regardless of file type:
- Images: `input/image_001.png`
- Audio: `input/audio_001.mp3`
- Videos: `input/video_001.mp4`

The `/upload/image` endpoint accepts any file type and stores it in the input folder. The workflow nodes then reference these files by filename.

## Testing

After this fix, you should be able to:
1. ✅ Upload images successfully
2. ✅ Upload audio files successfully  
3. ✅ Generate videos with both Wan 2.2 and InfiniteTalk
4. ✅ No more 405 errors

## Try Again!

The fix is now live. Please try uploading your image and audio again and clicking "Generate". It should work now! 🎉

---

**Note:** Make sure you've also applied the CORS fix in `entrypoint.sh` (adding `--enable-cors-header` flag) for the uploads to work properly.

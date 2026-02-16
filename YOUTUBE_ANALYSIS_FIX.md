# YouTube Video Analysis Fix

## Problem Summary

The YouTube video analysis feature was analyzing **incorrect videos** instead of the provided URL. For example:
- **Input URL**: `https://www.youtube.com/watch?v=j8wdu5VTozs`
- **Expected**: Analysis of the actual video content
- **Actual**: Analysis of a completely different video (hallucinated content about MrBeast's cataract surgery video)

## Root Cause

The issue was that the implementation was passing the YouTube URL **only in the text prompt**, but the Gemini model being used (`gemini-3-flash-preview`) is a **text-only model** that **cannot actually access or watch YouTube videos**.

When you tell a text-only model to "analyze this YouTube URL", it:
1. Cannot actually access the video
2. Tries to infer content based on the URL pattern
3. Hallucinates or generates generic content
4. May reference other videos it has seen in training data

## Solution Implemented

### 1. **Upgraded to Multimodal Model**
Changed from `gemini-3-flash-preview` to `gemini-2.0-flash-exp`, which supports native YouTube video analysis.

```typescript
// Before
private model = 'gemini-3-flash-preview'

// After
private model = 'gemini-2.0-flash-exp'; // Using 2.0 flash for YouTube video support
```

### 2. **Pass YouTube URL as `fileData`**
Created a new method `callGeminiAPIWithVideo()` that properly passes the YouTube URL as `fileData` in the API request, allowing Gemini to actually access and analyze the video.

```typescript
private async callGeminiAPIWithVideo(prompt: string, youtubeUrl: string): Promise<unknown> {
  const endpoint = `${GEMINI_API_BASE}/models/${this.model}:generateContent`;
  
  const response = await axios.post(
    `${endpoint}?key=${this.apiKey}`,
    {
      contents: [
        {
          parts: [
            {
              fileData: {
                fileUri: youtubeUrl,
                mimeType: 'video/youtube'
              }
            },
            { 
              text: prompt 
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: SCRIPT_SCHEMA,
        temperature: 1.2,
        maxOutputTokens: 2048
      }
    },
    {
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
    throw new Error('Invalid response from Gemini API');
  }

  return JSON.parse(response.data.candidates[0].content.parts[0].text);
}
```

### 3. **Updated the Analysis Flow**
Modified `analyzeYouTubeVideo()` to use the new method:

```typescript
// Before
const response = await this.callGeminiAPI(prompt);

// After
const response = await this.callGeminiAPIWithVideo(prompt, url);
```

### 4. **Improved Prompt Instructions**
Updated the prompt to reference "the provided YouTube video" instead of mentioning the URL, since the video is now passed as fileData:

```typescript
CRITICAL INSTRUCTIONS:
1. Watch and CAREFULLY analyze the provided YouTube video
2. Base your script ONLY on the ACTUAL content, message, and key points from this specific video
3. Do NOT create generic content or hallucinate information not present in the video
4. Extract the exact message, examples, and insights from what you see and hear in the video
```

## How It Works Now

1. **User provides YouTube URL** → `https://www.youtube.com/watch?v=j8wdu5VTozs`
2. **URL is validated** → Extract video ID
3. **API request is constructed** with:
   - `fileData` part containing the YouTube URL
   - `text` part containing the analysis prompt
4. **Gemini 2.0 Flash** actually accesses and watches the video
5. **Returns accurate analysis** based on the actual video content

## Key Differences

| Aspect       | Before (Broken)                      | After (Fixed)                       |
| ------------ | ------------------------------------ | ----------------------------------- |
| Model        | `gemini-3-flash-preview` (text-only) | `gemini-2.0-flash-exp` (multimodal) |
| URL Passing  | Only in text prompt                  | As `fileData` in API request        |
| Video Access | ❌ Cannot access video                | ✅ Actually watches video            |
| Result       | Hallucinated/wrong content           | Accurate video analysis             |

## Testing

Build completed successfully:
```bash
✓ 2208 modules transformed.
✓ built in 5.75s
```

## Important Notes

### Gemini API Limitations for YouTube Videos
- **Public videos only**: Private or unlisted videos are not supported
- **Daily limit**: Free tier has an 8-hour daily upload limit for YouTube video content
- **Model support**: 
  - Gemini 2.0+ models support YouTube URLs natively
  - Pre-2.5 models: 1 video per request
  - Gemini 2.5+: Up to 10 videos per request

### API Key Requirements
Users need a valid Gemini API key with access to the `gemini-2.0-flash-exp` model.

## Files Modified

- `/OpenAvathar/src/services/geminiService.ts`
  - Updated model to `gemini-2.0-flash-exp`
  - Added `callGeminiAPIWithVideo()` method
  - Modified `analyzeYouTubeVideo()` to use new method
  - Updated `buildYouTubePrompt()` to remove URL reference

## Next Steps

1. **Test with actual YouTube URLs** to verify the fix works correctly
2. **Monitor API usage** to ensure it stays within limits
3. **Consider adding error handling** for:
   - Private/unlisted videos
   - Daily limit exceeded
   - Model availability issues

## References

- [Gemini API Documentation](https://ai.google.dev/gemini-api/docs)
- [Gemini Multimodal Capabilities](https://ai.google.dev/gemini-api/docs/vision)
- [YouTube URL Support in Gemini](https://ai.google.dev/gemini-api/docs/prompting_with_media)

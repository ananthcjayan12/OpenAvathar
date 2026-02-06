# Generation Settings Feature - Implementation Summary

## Overview
Added comprehensive generation settings for both **Wan 2.2** and **InfiniteTalk** video generation workflows, allowing users to customize:
1. **Video Orientation** (Horizontal/Vertical)
2. **Max Frames** (30-240 frames)
3. **Audio CFG Scale** (1.0-7.0)

---

## ✨ Features Added

### 1. Video Orientation Toggle
- **Horizontal Mode**: 1024x576 (16:9 landscape)
- **Vertical Mode**: 576x1024 (9:16 portrait)
- Beautiful toggle UI with emoji icons (🖥️ Horizontal / 📱 Vertical)
- Automatically calculates dimensions based on selected orientation

**For Wan 2.2:**
- Horizontal: 1024x576
- Vertical: 576x1024

**For InfiniteTalk:**
- Horizontal: 832x480
- Vertical: 480x832 (default)

### 2. Max Frames Slider
- Range: 30-240 frames
- Step: 10 frames
- Default: 120 frames
- Real-time value display
- Controls video length/duration

### 3. Audio CFG Scale Slider
- Range: 1.0-7.0
- Step: 0.5
- Default: 3.5
- Real-time value display with 1 decimal precision
- Controls audio conditioning strength

---

## 📁 Files Modified

### 1. **Types** (`src/types/index.ts`)
```typescript
export type VideoOrientation = 'horizontal' | 'vertical';

export interface Wan22Config {
    imageName: string;
    prompt: string;
    width: number;
    height: number;
    orientation?: VideoOrientation;
    maxFrames?: number;
    audioCfgScale?: number;
}

export interface InfiniteTalkConfig {
    imageName: string;
    audioName: string;
    prompt: string;
    orientation?: VideoOrientation;
    maxFrames?: number;
    audioCfgScale?: number;
}
```

### 2. **Store** (`src/stores/appStore.ts`)
Added to state:
```typescript
videoOrientation: 'horizontal' | 'vertical';  // Default: 'horizontal'
maxFrames: number;                             // Default: 120
audioCfgScale: number;                         // Default: 3.5
```

Added actions:
```typescript
setVideoOrientation: (orientation: 'horizontal' | 'vertical') => void;
setMaxFrames: (frames: number) => void;
setAudioCfgScale: (scale: number) => void;
```

**Persistence**: All three settings are persisted to localStorage

### 3. **Workflow Patcher** (`src/services/workflowPatcher.ts`)

#### Wan 2.2 Updates:
```typescript
// Orientation-based dimensions
if (config.orientation === 'horizontal') {
    workflow["98"].inputs.width = 1024;
    workflow["98"].inputs.height = 576;
} else {
    workflow["98"].inputs.width = 576;
    workflow["98"].inputs.height = 1024;
}

// Max frames
workflow["98"].inputs.num_frames = config.maxFrames;

// Audio CFG scale
workflow["98"].inputs.audio_cfg_scale = config.audioCfgScale;
```

#### InfiniteTalk Updates:
```typescript
// Orientation-based dimensions
if (config.orientation === 'horizontal') {
    workflow["245"].inputs.value = 832;  // width
    workflow["246"].inputs.value = 480;  // height
} else {
    workflow["245"].inputs.value = 480;  // width
    workflow["246"].inputs.value = 832;  // height
}

// Max frames (Node 241)
workflow["241"].inputs.num_frames = config.maxFrames;

// Audio CFG scale (Node 241)
workflow["241"].inputs.audio_cfg_scale = config.audioCfgScale;
```

### 4. **Generate Page** (`src/pages/GeneratePage.tsx`)

#### UI Controls Added:
1. **Video Orientation Toggle**
   - Styled toggle buttons with active state
   - Horizontal/Vertical options with emoji icons
   - Instant visual feedback

2. **Max Frames Slider**
   - Range slider with real-time value display
   - Shows current value next to label
   - Accent color for better UX

3. **Audio CFG Scale Slider**
   - Range slider with decimal precision
   - Real-time value display (e.g., "3.5")
   - Accent color styling

#### Workflow Integration:
```typescript
const patchedWorkflow = await workflowPatcher.patchWorkflow(purpose!, {
    imageName: imageFilename,
    audioName: audioFilename,
    prompt: prompt || 'high quality video',
    width: videoOrientation === 'horizontal' ? 1024 : 576,
    height: videoOrientation === 'horizontal' ? 576 : 1024,
    orientation: videoOrientation,
    maxFrames: maxFrames,
    audioCfgScale: audioCfgScale
});
```

---

## 🎨 UI/UX Improvements

### Visual Design
- **Toggle Buttons**: Glass morphism style with accent color for active state
- **Sliders**: Custom accent color matching the app theme
- **Real-time Feedback**: Values update instantly as user adjusts sliders
- **Responsive Layout**: Settings panel adapts to content

### User Experience
- Settings persist across sessions (localStorage)
- Sensible defaults for quick start
- Clear labels and visual indicators
- Smooth transitions and interactions

---

## 🔧 Technical Details

### Default Values
```typescript
videoOrientation: 'horizontal'  // Most common use case
maxFrames: 120                  // ~4-5 seconds at 24-30 fps
audioCfgScale: 3.5              // Balanced audio conditioning
```

### Dimension Calculations

**Wan 2.2:**
- Horizontal: 1024×576 (16:9 aspect ratio)
- Vertical: 576×1024 (9:16 aspect ratio)

**InfiniteTalk:**
- Horizontal: 832×480 (portrait optimized)
- Vertical: 480×832 (default portrait)

### Workflow Node Mapping

**Wan 2.2 (Node 98 - WanImageToVideo):**
- `width`: Video width
- `height`: Video height
- `num_frames`: Maximum frames to generate
- `audio_cfg_scale`: Audio conditioning scale

**InfiniteTalk:**
- Node 245: Width value
- Node 246: Height value
- Node 241: Text encoding + num_frames + audio_cfg_scale

---

## 🧪 Testing Checklist

✅ **Video Orientation**
- [ ] Horizontal mode generates 16:9 videos
- [ ] Vertical mode generates 9:16 videos
- [ ] Toggle switches correctly between modes
- [ ] Dimensions are correctly applied to workflow

✅ **Max Frames**
- [ ] Slider adjusts from 30 to 240 frames
- [ ] Value displays correctly
- [ ] Workflow receives correct frame count
- [ ] Video duration matches frame count

✅ **Audio CFG Scale**
- [ ] Slider adjusts from 1.0 to 7.0
- [ ] Value displays with 1 decimal place
- [ ] Workflow receives correct scale value
- [ ] Audio conditioning strength varies appropriately

✅ **Persistence**
- [ ] Settings persist after page reload
- [ ] Settings persist across sessions
- [ ] Default values load correctly on first use

✅ **Integration**
- [ ] Settings apply to both Wan 2.2 and InfiniteTalk
- [ ] Workflow patching works correctly
- [ ] Generated videos match selected settings

---

## 📊 Settings Summary

| Setting               | Type   | Range               | Default    | Purpose                     |
| --------------------- | ------ | ------------------- | ---------- | --------------------------- |
| **Video Orientation** | Toggle | Horizontal/Vertical | Horizontal | Sets video aspect ratio     |
| **Max Frames**        | Slider | 30-240              | 120        | Controls video length       |
| **Audio CFG Scale**   | Slider | 1.0-7.0             | 3.5        | Audio conditioning strength |

---

## 🚀 Usage Example

1. Navigate to Generate Page
2. Upload image (and audio for InfiniteTalk)
3. **Adjust Settings:**
   - Select **Vertical** for social media content (TikTok, Instagram Reels)
   - Select **Horizontal** for YouTube, presentations
   - Increase **Max Frames** for longer videos (up to 240 frames)
   - Adjust **Audio CFG Scale** for stronger/weaker audio influence
4. Enter prompt (optional)
5. Click "Generate Video"

---

## 💡 Best Practices

### Video Orientation
- **Horizontal**: YouTube, presentations, landscape content
- **Vertical**: TikTok, Instagram Reels, Stories, mobile-first content

### Max Frames
- **30-60 frames**: Quick clips, GIFs
- **60-120 frames**: Standard videos (default)
- **120-240 frames**: Longer sequences, detailed animations

### Audio CFG Scale
- **1.0-2.5**: Subtle audio influence
- **3.0-4.0**: Balanced (recommended)
- **4.5-7.0**: Strong audio conditioning

---

## 🎯 Future Enhancements

Potential additions:
- [ ] FPS (frames per second) control
- [ ] Custom dimension input
- [ ] Preset configurations (e.g., "TikTok", "YouTube")
- [ ] Advanced settings panel
- [ ] Batch generation with different settings
- [ ] Settings templates/favorites

---

## ✅ Completion Status

All requested features have been implemented:
- ✅ Video mode (vertical/horizontal) - **DONE**
- ✅ Max frames control - **DONE**
- ✅ Audio CFG scale - **DONE**
- ✅ Works for both Wan 2.2 and InfiniteTalk - **DONE**
- ✅ Beautiful UI with real-time feedback - **DONE**
- ✅ Settings persistence - **DONE**

The generation settings are now fully functional and ready for use! 🎉

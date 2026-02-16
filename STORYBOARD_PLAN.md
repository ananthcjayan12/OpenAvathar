# Storyboard Feature: Architectural Plan

## Executive Summary
The Storyboard feature transforms OpenAvathar from a pure video generation tool into a comprehensive content creation platform. This feature enables users to convert ideas or YouTube content into professional narration scripts and audio, which can then be used with OpenAvathar's avatar generation capabilities.

**Key Principles:**
- **Non-Breaking Integration**: Seamlessly extends existing workflow without disrupting current users
- **Progressive Enhancement**: Optional feature that adds value without being mandatory
- **Security-First**: Client-side architecture with user-managed API keys
- **Maintainable Architecture**: Clear separation of concerns, testable components
- **Production-Ready**: Proper error handling, loading states, and user feedback

---

## 1. Strategic Product Vision

### 1.1 User Stories

**Primary User Journey:**
> "As a content creator, I want to quickly convert my video ideas into professional scripts and audio narrations, so that I can use them with OpenAvathar to create engaging avatar videos."

**Secondary User Journey:**
> "As a marketer, I want to repurpose existing YouTube content into viral-style scripts for social media, so that I can create consistent content across platforms."

### 1.2 Value Proposition
- **Time Savings**: Automated script generation from rough ideas
- **Quality Enhancement**: AI-powered optimization for viral potential
- **Workflow Integration**: Seamless connection with avatar generation
- **Flexibility**: Support for both original ideas and content adaptation

### 1.3 Integration Philosophy
The Storyboard is positioned as a **creative preparation tool** that feeds into the main avatar generation workflow:

```
Existing Flow: Upload Image → Upload Audio → Generate Avatar Video
Enhanced Flow: [Storyboard: Idea → Script → Audio] → Upload to Studio → Generate Avatar Video
```

This keeps the core flow intact while adding an optional upstream step.

---

## 2. Technical Architecture

### 2.1 System Design Principles

**Separation of Concerns:**
```
┌─────────────────────────────────────────────┐
│              Presentation Layer              │
│  (StoryboardPage, Components)               │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           Business Logic Layer              │
│  (StoryboardStore - State Management)       │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Service Layer                     │
│  (geminiService, elevenLabsService)         │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            External APIs                     │
│  (Google Gemini, ElevenLabs)                │
└─────────────────────────────────────────────┘
```

### 2.2 State Management Strategy

Using Zustand (consistent with existing codebase):

```typescript
interface StoryboardState {
  // Configuration
  geminiApiKey: string | null;
  elevenLabsApiKey: string | null;
  
  // Current Session
  inputMode: 'idea' | 'youtube';
  inputContent: string;
  
  // Generation State
  isGeneratingScript: boolean;
  isGeneratingAudio: boolean;
  
  // Output
  currentScript: Script | null;
  audioUrl: string | null;
  
  // History
  savedScripts: Script[];
  
  // Error Handling
  error: string | null;
}
```

**Persistence Strategy:**
- API keys: `localStorage` (encrypted if possible, with clear security warnings)
- Scripts: `localStorage` for recent items, `IndexedDB` for full history
- Audio: `IndexedDB` for larger files

### 2.3 Service Layer Design

#### Gemini Service (`geminiService.ts`)
```typescript
export class GeminiService {
  // Configuration
  private apiKey: string;
  
  // Core Methods
  async generateScript(input: ScriptInput): Promise<Script>
  async analyzeYouTubeVideo(url: string): Promise<VideoAnalysis>
  async refineScript(script: Script, feedback: string): Promise<Script>
  
  // Error Handling
  private handleApiError(error: unknown): ServiceError
}
```

#### ElevenLabs Service (`elevenLabsService.ts`)
```typescript
export class ElevenLabsService {
  // Configuration
  private apiKey: string;
  
  // Core Methods
  async getVoices(): Promise<Voice[]>
  async generateAudio(text: string, voiceId: string): Promise<Blob>
  async streamAudio(text: string, voiceId: string): AsyncGenerator<Blob>
  
  // Utilities
  private estimateAudioDuration(text: string): number
}
```

### 2.4 Component Architecture

**Component Hierarchy:**
```
StoryboardPage
├── StoryboardHeader
│   └── ModeToggle (Idea / YouTube)
├── InputPanel
│   ├── IdeaInput (TextArea with formatting)
│   └── YouTubeInput (URL input with validation)
├── GenerationPanel
│   ├── ScriptDisplay (Editable preview)
│   ├── AudioControls (Voice selection, generation)
│   └── AudioPlayer (Playback with download)
└── HistoryPanel
    └── SavedScriptsList
```

**Component Design Pattern:**
- Container/Presenter pattern for complex components
- Custom hooks for shared logic
- Error boundaries for graceful degradation

---

## 3. Feature Specifications

### 3.1 Input Modes

#### Mode 1: Idea Input
**UI Elements:**
- Rich text area (minimum 50 characters)
- Bullet point formatting helper
- Character counter
- Example prompts for guidance

**Validation:**
- Minimum length check
- Content quality hints (e.g., "Add more specific details")

#### Mode 2: YouTube URL
**UI Elements:**
- URL input with real-time validation
- Thumbnail preview (when available)
- Video duration display
- Warning for long videos (>10 minutes)

**Processing:**
- URL format validation
- Video accessibility check
- Automatic transcript extraction via Gemini

### 3.2 Script Generation

#### Structured Output Schema
```typescript
interface Script {
  id: string;
  timestamp: number;
  title: string;
  hook: string; // First 3-5 seconds
  narrationScript: string; // Full script
  segments: ScriptSegment[];
  metadata: {
    wordCount: number;
    estimatedDuration: number;
    tone: 'professional' | 'casual' | 'energetic';
  };
}

interface ScriptSegment {
  text: string;
  visualHint?: string; // Suggestion for what should be shown
  timestamp?: number; // For sync with audio
}
```

#### Prompt Engineering Strategy
```typescript
const SCRIPT_GENERATION_PROMPT = `
You are a viral content strategist specializing in social media reels.

Requirements:
1. Hook: Create a compelling 3-5 second opener that stops scrolling
2. Pacing: Use short, punchy sentences (max 15 words each)
3. Engagement: Include pattern interrupts every 7-10 seconds
4. Tone: ${userPreference}
5. Length: Target ${targetDuration} seconds total

Structure:
- Opening hook (attention-grabber)
- Main content (value delivery)
- Call to action (clear next step)

Output Format: JSON matching the Schema
`;
```

### 3.3 Audio Generation

**Voice Management:**
- Fetch available voices on Settings page load
- Cache voice list locally (24-hour expiry)
- Default voice selection based on script tone

**Generation Options:**
- Quality presets: Draft (faster) / Production (higher quality)
- Speed adjustment: 0.75x - 1.25x
- Emphasis markers in script editor

**Audio Processing:**
- Stream audio for long scripts (chunked generation)
- Progress indicators with time estimates
- Automatic retry on failure (max 3 attempts)

### 3.4 Script Editor

**Features:**
- Inline editing with live preview
- Segment-level editing for granular control
- Word count and duration updates
- Export to common formats (TXT, JSON, SRT)

**Collaboration Features (Future):**
- Version history
- Comments/annotations
- Share links (requires backend)

---

## 4. User Experience Design

### 4.1 Navigation Integration

**Sidebar Addition:**
```typescript
const navItems = [
  { path: '/studio', label: 'Studio', icon: <Wand2 /> },
  { path: '/storyboard', label: 'Storyboard', icon: <FileText />, badge: 'NEW' },
  { path: '/videos', label: 'Videos', icon: <Film /> },
  { path: '/pods', label: 'Pods', icon: <Rocket /> },
];
```

**Positioning Rationale:**
- Place before "Studio" in workflow order
- Clear visual distinction with "NEW" badge initially
- Remove badge after user's first use

### 4.2 Empty States

**First-Time User Experience:**
```
┌────────────────────────────────────────┐
│  🎬 Welcome to Storyboard              │
│                                        │
│  Transform your ideas into scripts     │
│  and audio for avatar videos.          │
│                                        │
│  [📝 Start with an Idea]              │
│  [🎥 Analyze YouTube Video]           │
│                                        │
│  💡 Tip: You'll need API keys         │
│     Visit Settings to configure        │
└────────────────────────────────────────┘
```

### 4.3 Loading States

**Script Generation:**
- Skeleton loaders for script sections
- Progress messages:
  - "Analyzing your input..."
  - "Crafting engaging hook..."
  - "Optimizing for virality..."
  - "Finalizing script..."

**Audio Generation:**
- Progress bar with percentage
- Estimated time remaining
- Cancellation option

### 4.4 Error Handling

**Error Categories:**
1. **Configuration Errors**: Missing API keys
2. **Input Errors**: Invalid YouTube URL, insufficient content
3. **API Errors**: Rate limits, network issues, invalid responses
4. **Storage Errors**: Quota exceeded, browser restrictions

**Error Presentation:**
```typescript
interface UserFacingError {
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  severity: 'info' | 'warning' | 'error';
}
```

**Example:**
```
⚠️ API Key Required

To generate scripts, you need a Google Gemini API key.
Free tier available at ai.google.dev

[Go to Settings] [Learn More]
```

---

## 5. Security & Privacy

### 5.1 API Key Management

**Storage Strategy:**
```typescript
// Encrypted storage wrapper
class SecureStorage {
  set(key: string, value: string): void {
    // Basic obfuscation (not true encryption, but better than plaintext)
    const encoded = btoa(value);
    localStorage.setItem(key, encoded);
  }
  
  get(key: string): string | null {
    const encoded = localStorage.getItem(key);
    return encoded ? atob(encoded) : null;
  }
}
```

**Security Warnings:**
- Clear notice on Settings page: "API keys are stored locally in your browser"
- Recommendation to use restricted keys (domain-specific)
- Option to clear keys on logout

### 5.2 Content Safety

**Input Validation:**
- Content moderation check before API calls (client-side pre-filter)
- Character limits to prevent abuse
- URL allowlist for video sources (YouTube, Vimeo only)

**Output Sanitization:**
- XSS protection in script display
- Audio blob validation before storage

### 5.3 Rate Limiting

**Client-Side Protection:**
```typescript
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  canAttempt(service: string): boolean {
    const key = `${service}_${Date.now()}`;
    const recent = this.attempts.get(service)?.filter(
      t => Date.now() - t < 60000 // Last minute
    ) || [];
    
    return recent.length < 5; // Max 5 requests per minute
  }
}
```

---

## 6. Implementation Roadmap

### Phase 1: Foundation (Week 1)
- [x] Create plan document
- [ ] Setup store and types
- [ ] Implement Gemini service (text input only)
- [ ] Basic UI scaffold (input + output)
- [ ] Settings page integration for API keys

**Success Criteria:** User can generate a basic script from text input

### Phase 2: Core Features (Week 2)
- [ ] YouTube URL analysis
- [ ] Structured output with segments
- [ ] Script editor with live updates
- [ ] ElevenLabs integration
- [ ] Audio player and download

**Success Criteria:** Complete idea-to-audio pipeline works

### Phase 3: Polish (Week 3)
- [ ] History and saved scripts
- [ ] Advanced error handling
- [ ] Loading states and animations
- [ ] Mobile responsiveness
- [ ] Performance optimization

**Success Criteria:** Production-ready user experience

### Phase 4: Enhancement (Future)
- [ ] Voice cloning support
- [ ] Multi-language support
- [ ] Batch processing
- [ ] Template library
- [ ] Analytics integration

---

## 7. Testing Strategy

### 7.1 Unit Tests
```typescript
// Example test structure
describe('GeminiService', () => {
  it('should generate script from valid input', async () => {
    const service = new GeminiService(mockApiKey);
    const script = await service.generateScript({
      content: 'Test idea',
      mode: 'idea'
    });
    expect(script).toHaveProperty('title');
    expect(script).toHaveProperty('narrationScript');
  });
  
  it('should handle API errors gracefully', async () => {
    // Test error handling
  });
});
```

### 7.2 Integration Tests
- End-to-end user flows
- API integration with real services (dev keys)
- Cross-browser compatibility
- Offline behavior

### 7.3 Manual Testing Checklist
- [ ] Generate script from idea
- [ ] Generate script from YouTube URL
- [ ] Edit generated script
- [ ] Generate audio from script
- [ ] Play and download audio
- [ ] Save and retrieve scripts
- [ ] Handle missing API keys
- [ ] Handle network errors
- [ ] Test on mobile devices
- [ ] Test with screen readers

---

## 8. Performance Considerations

### 8.1 Optimization Strategies

**Lazy Loading:**
```typescript
// Lazy load heavy dependencies
const GeminiService = lazy(() => import('@/services/geminiService'));
const ElevenLabsService = lazy(() => import('@/services/elevenLabsService'));
```

**Caching:**
- Voice list cache (24 hours)
- Recent scripts (memory + localStorage)
- YouTube video metadata

**Chunking:**
- Audio generation for long scripts (split into segments)
- Progressive loading of saved scripts

### 8.2 Bundle Size Impact
- Gemini SDK: ~50KB
- ElevenLabs SDK (if used): ~30KB
- Additional components: ~20KB
- **Total Impact**: ~100KB (acceptable for feature richness)

---

## 9. Accessibility

### 9.1 WCAG Compliance
- **Keyboard Navigation**: All controls accessible via keyboard
- **Screen Readers**: ARIA labels for dynamic content
- **Color Contrast**: 4.5:1 minimum ratio
- **Focus Indicators**: Clear visual focus states

### 9.2 Inclusive Design
- Text size controls
- Audio playback speed control
- Captions for audio preview
- Alternative input methods (voice typing)

---

## 10. Documentation

### 10.1 User Documentation
- **Getting Started Guide**: Setting up API keys
- **Tutorials**: Creating first script, YouTube analysis workflow
- **FAQ**: Common issues and solutions
- **Best Practices**: Writing effective prompts

### 10.2 Developer Documentation
- **API Documentation**: Service methods and types
- **Component Documentation**: Props and usage examples
- **Architecture Overview**: System design and patterns
- **Contributing Guide**: Adding new features

---

## 11. Metrics & Success Criteria

### 11.1 Feature Adoption
- % of users who try Storyboard within first session
- Average scripts generated per user
- Audio generation conversion rate

### 11.2 Technical Metrics
- Script generation success rate
- Average generation time
- Error rate by category
- API cost per generation

### 11.3 User Satisfaction
- Feature rating (in-app survey)
- Time to first successful generation
- Return usage rate

---

## 12. Future Enhancements

### 12.1 Short-Term (3-6 months)
- **Voice Cloning**: Custom voice training
- **Templates**: Pre-built script structures
- **Collaboration**: Share scripts with team

### 12.2 Long-Term (6-12 months)
- **AI Director**: Suggest visual scenes for avatar
- **Multi-Platform**: Export formats for TikTok, Instagram, YouTube
- **Analytics**: Performance tracking for published content
- **Marketplace**: Community script templates

---

## 13. Risk Assessment & Mitigation

### 13.1 Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| API Key Exposure | High | Low | Client-side only, security warnings |
| Rate Limit Exceeded | Medium | Medium | Client-side throttling, clear limits |
| Browser Storage Full | Low | Low | Cleanup prompts, size limits |
| API Breaking Changes | Medium | Low | Version pinning, fallback handling |

### 13.2 Product Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low Adoption | High | Medium | In-app tutorials, prominent placement |
| Workflow Confusion | Medium | Medium | Clear separation from main flow |
| Feature Bloat | Low | High | Phased rollout, feature flags |

---

## 14. Conclusion

The Storyboard feature represents a strategic enhancement to OpenAvathar that:
1. **Extends Value**: Adds upstream content creation without disrupting core workflow
2. **Maintains Quality**: Follows existing architectural patterns and code standards
3. **Ensures Security**: Client-side architecture with proper key management
4. **Enables Growth**: Foundation for future content creation features

By implementing this feature with careful attention to architecture, security, and user experience, we create a maintainable and robust addition that enhances OpenAvathar's position as a comprehensive content creation platform.

---

## Appendix A: File Structure

```
src/
├── pages/
│   └── StoryboardPage.tsx          # Main page component
├── components/
│   └── storyboard/
│       ├── StoryboardHeader.tsx
│       ├── InputPanel.tsx
│       ├── IdeaInput.tsx
│       ├── YouTubeInput.tsx
│       ├── ScriptDisplay.tsx
│       ├── ScriptEditor.tsx
│       ├── AudioControls.tsx
│       ├── AudioPlayer.tsx
│       └── HistoryPanel.tsx
├── services/
│   ├── geminiService.ts            # Google Gemini API client
│   ├── elevenLabsService.ts        # ElevenLabs API client
│   └── secureStorage.ts            # Encrypted storage wrapper
├── stores/
│   └── storyboardStore.ts          # Zustand state management
├── types/
│   └── storyboard.ts               # TypeScript interfaces
└── utils/
    ├── rateLimiter.ts              # Client-side rate limiting
    └── validators.ts               # Input validation helpers
```

## Appendix B: API Integration Examples

### Gemini API Call
```typescript
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiKey
  },
  body: JSON.stringify({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: scriptSchema
    }
  })
});
```

### ElevenLabs API Call
```typescript
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  method: 'POST',
  headers: {
    'xi-api-key': apiKey,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: narrationScript,
    model_id: 'eleven_multilingual_v2',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.75
    }
  })
});
```

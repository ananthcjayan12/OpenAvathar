/**
 * Google Gemini API Service
 * 
 * Handles script generation using Google's Gemini AI model.
 * Uses structured output to ensure consistent script format.
 */

import axios, { AxiosError } from 'axios';
import type {
  Script,
  ScriptInput,
  ScriptSegment,
  ScriptTone,
  ServiceError,
  GenerationResult
} from '@/types/storyboard';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Schema for structured output
const SCRIPT_SCHEMA = {
  type: 'object',
  properties: {
    title: {
      type: 'string',
      description: 'Compelling title for the content'
    },
    hook: {
      type: 'string',
      description: 'Attention-grabbing opener (3-5 seconds worth of content)'
    },
    narration_script: {
      type: 'string',
      description: 'Complete narration script with expressive markers for audio generation. Include emotion/tone markers like [thoughtful], [excited], [annoyed], [surprised], [long pause], [clears throat], [exhales sharply] etc. to guide voice expression.'
    },
    segments: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'Text content for this segment'
          },
          visual_hint: {
            type: 'string',
            description: 'Optional suggestion for visual content'
          }
        },
        required: ['text']
      }
    }
  },
  required: ['title', 'hook', 'narration_script', 'segments']
};

export class GeminiService {
  private apiKey: string;
  private model = 'gemini-3-flash-preview'

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Generate a script from user input with two-step enhancement
   * Step 1: Generate initial script
   * Step 2: Enhance with creative refinement
   */
  async generateScript(input: ScriptInput): Promise<GenerationResult<Script>> {
    try {
      // Step 1: Generate initial script
      const initialPrompt = this.buildPrompt(input);
      const initialResponse = await this.callGeminiAPI(initialPrompt);
      const initialScript = this.parseResponse(initialResponse, input.tone || 'energetic');

      // Step 2: Enhance the script with creative refinement
      const enhancementPrompt = this.buildEnhancementPrompt(initialScript, input);
      const enhancedResponse = await this.callGeminiAPI(enhancementPrompt);
      const enhancedScript = this.parseResponse(enhancedResponse, input.tone || 'energetic');

      // Preserve the original ID from initial generation
      enhancedScript.id = initialScript.id;
      enhancedScript.metadata.createdAt = initialScript.metadata.createdAt;

      return {
        success: true,
        data: enhancedScript
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Analyze a YouTube video and generate a script with two-step enhancement
   * Step 1: Generate initial script from video analysis
   * Step 2: Enhance with creative refinement
   */
  async analyzeYouTubeVideo(url: string, tone: ScriptTone = 'energetic', targetDuration: number = 40, language?: string): Promise<GenerationResult<Script>> {
    try {
      // Extract video ID from URL
      const videoId = this.extractYouTubeId(url);
      if (!videoId) {
        return {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Invalid YouTube URL format'
          }
        };
      }

      // Step 1: Analyze video and generate initial script
      const initialPrompt = this.buildYouTubePrompt(tone, targetDuration, language);
      const initialResponse = await this.callGeminiAPIWithVideo(initialPrompt, url);
      const initialScript = this.parseResponse(initialResponse, tone);

      // Step 2: Enhance the script with creative refinement
      const input: ScriptInput = {
        mode: 'youtube',
        content: url,
        tone,
        targetDuration,
        language
      };
      const enhancementPrompt = this.buildEnhancementPrompt(initialScript, input);
      const enhancedResponse = await this.callGeminiAPI(enhancementPrompt);
      const enhancedScript = this.parseResponse(enhancedResponse, tone);

      // Preserve the original ID from initial generation
      enhancedScript.id = initialScript.id;
      enhancedScript.metadata.createdAt = initialScript.metadata.createdAt;

      return {
        success: true,
        data: enhancedScript
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Refine an existing script based on feedback
   */
  async refineScript(script: Script, feedback: string): Promise<GenerationResult<Script>> {
    try {
      const prompt = `
You are a professional content editor. Refine the following script based on this feedback:

FEEDBACK: ${feedback}

CURRENT SCRIPT:
Title: ${script.title}
Hook: ${script.hook}
Script: ${script.narrationScript}

Provide an improved version that addresses the feedback while maintaining the script's core message and viral appeal.
`;

      const response = await this.callGeminiAPI(prompt);
      const refinedScript = this.parseResponse(response, script.metadata.tone);

      // Preserve the original ID and update timestamp
      refinedScript.id = script.id;
      refinedScript.metadata.updatedAt = Date.now();

      return {
        success: true,
        data: refinedScript
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Build the generation prompt
   */
  private buildPrompt(input: ScriptInput): string {
    const toneDescriptions = {
      professional: 'professional, authoritative, and informative',
      casual: 'casual, friendly, hyper-natural, and locally relatable (use local slang naturally where it fits)',
      energetic: 'high-energy, enthusiastic, and motivating',
      persuasive: 'compelling, persuasive, and action-oriented'
    };

    const tone = input.tone || 'energetic';
    const targetDuration = input.targetDuration || 30;
    const language = input.language || 'English';

    return `
You are an expert viral content strategist specializing in social media reels and short-form video content.

TASK: Create a compelling narration script for a ${targetDuration}-second video in ${language}.

INPUT: ${input.content}

LANGUAGE REQUIREMENTS:
- Generate the ENTIRE script in ${language}
- Use natural, native expressions and idioms
- Maintain cultural relevance and authenticity

REQUIREMENTS:
1. HOOK: Create an attention-grabbing opener (first 3-5 seconds) that stops scrolling
2. PACING: Use short, punchy sentences (maximum 15 words each)
3. TONE: ${toneDescriptions[tone]}
4. ENGAGEMENT: Include pattern interrupts and compelling transitions
5. LENGTH: Target approximately ${targetDuration} seconds of narration
6. STRUCTURE: Clear beginning, valuable middle, strong call-to-action

AUTHENTICITY RULES:
- Sound like a real person talking, not a brand or advertisement
- Never use ad-like language (avoid "buy now", "limited offer", "best product", "sponsored", "subscribe for discounts")
- Keep wording natural, spoken, and culturally grounded
- If tone is casual, lean into local slang/phrasing naturally (do not overdo it)

EXPRESSIVE MARKERS FOR AUDIO:
Include emotion and delivery markers in square brackets to guide voice expression:
- Emotions: [thoughtful], [excited], [annoyed], [surprised], [concerned], [confident]
- Pauses: [pause], [long pause], [brief pause]
- Actions: [clears throat], [exhales sharply], [sighs], [chuckles]
- Emphasis: [emphasize], [whisper], [louder]

TTS CLARITY RULES (VERY IMPORTANT):
- If a word/term is English, keep it in English script exactly (never transliterate English words)
- Write numbers in spoken words for clean audio output (avoid numeric digits in narration)
- For decimals, write spoken forms like "two point zero" instead of "2.0"
- Prefer TTS-friendly pronunciation text over symbolic formatting
- Never duplicate the same term in two formats (do NOT write English + transliteration in brackets/parentheses)
- For model/product names, use exactly ONE representation only once (example: use "Minimax M two point five" and not "Minimax M 2.5 (എം ടു പോയിന്റ് ഫൈവ്)")

Example format: "[thoughtful] നമ്മൾ എന്താണ് ചെയ്യേണ്ടത്? [pause] ഉത്തരം ലളിതമാണ്."

SCRIPT STRUCTURE:
- Opening hook (attention-grabber that creates curiosity)
- Main content (deliver value, tell a story, or provide insights)
- Call to action (clear next step or thought-provoking conclusion)

STYLE GUIDELINES:
- Start with a question, bold statement, or surprising fact
- Use active voice and present tense
- Include emotional triggers (curiosity, urgency, FOMO)
- Add expressive markers naturally throughout the script
- End with a clear payoff or call to action

Generate a complete, ready-to-record script with expressive markers optimized for maximum engagement.
`;
  }

  /**
   * Build YouTube analysis prompt
   */
  private buildYouTubePrompt(tone: ScriptTone, targetDuration: number = 40, language?: string): string {
    const toneDescriptions = {
      professional: 'professional, clear, and authoritative',
      casual: 'casual, friendly, locally relatable, and naturally slangy where appropriate',
      energetic: 'dynamic, enthusiastic, and high-energy',
      persuasive: 'compelling, persuasive, and action-oriented'
    };

    const languageInstruction = language
      ? `- Generate the script in ${language}`
      : `- Detect the primary language of the video and generate the script in the SAME language`;

    return `
You are an expert at analyzing and repurposing video content for social media.

CRITICAL INSTRUCTIONS:
1. Watch and CAREFULLY analyze the provided YouTube video
2. Base your script ONLY on the ACTUAL content, message, and key points from this specific video
3. Do NOT create generic content or hallucinate information not present in the video
4. Extract the exact message, examples, and insights from what you see and hear in the video

TASK: Create a viral-style narration script that accurately represents this video's message.

TARGET LENGTH: Approximately ${targetDuration} seconds of narration

LANGUAGE REQUIREMENTS:
${languageInstruction}
- Use natural, native expressions and idioms
- Maintain the cultural context and authenticity of the original video

CONTENT REQUIREMENTS:
- Extract the SPECIFIC core message and key points from THIS video
- Identify the video's unique angle, examples, or insights
- Preserve factual accuracy - do not invent details or examples
- Retell the message in a fresh, original voice (do not sound copied)
- You may add NEW relatable examples/analogies to explain the same key points better
- Keep the final script more attractive and engaging than a plain summary
- Transform the message into a compelling ${targetDuration}-second narration script
- Tone: ${toneDescriptions[tone]}

AUTHENTICITY + STYLE RULES:
- Never sound like an ad, promo, or sponsorship segment
- Use natural spoken language and avoid marketing copy
- If tone is casual, use local slang naturally for real human vibe

EXPRESSIVE MARKERS FOR AUDIO:
Include emotion and delivery markers in square brackets to guide voice expression:
- Emotions: [thoughtful], [excited], [annoyed], [surprised], [concerned], [confident]
- Pauses: [pause], [long pause], [brief pause]
- Actions: [clears throat], [exhales sharply], [sighs], [chuckles]
- Emphasis: [emphasize], [whisper], [louder]

TTS CLARITY RULES (VERY IMPORTANT):
- Keep English words in English script exactly when mixed with other languages
- Write numbers as spoken words, not numeric digits
- Convert decimals to spoken words (example: "2.0" -> "two point zero")
- Never repeat the same model/term in multiple forms (avoid English + transliteration duplicates)
- Use a single clear representation for names like versions/models (example: "Minimax M two point five" only once)

Example: "[thoughtful] എഐ നമ്മളെ മണ്ടന്മാരാക്കുകയാണോ? [pause] ഉത്തരം സങ്കീർണ്ണമാണ്."

SCRIPT STRUCTURE:
1. Hook (3-5 seconds): Grab attention with the video's most compelling insight
2. Core Message (${Math.round(targetDuration * 0.7)} seconds): Deliver the key points clearly and engagingly
3. Call-to-Action (5 seconds): Strong closing that prompts engagement

Generate a script with expressive markers that accurately represents the video content while being optimized for social media engagement.
`;
  }

  /**
   * Build enhancement prompt for second-pass creative refinement
   */
  private buildEnhancementPrompt(initialScript: Script, input: ScriptInput): string {
    const toneDescriptions = {
      professional: 'professional, authoritative, and informative',
      casual: 'casual, friendly, hyper-natural, and locally relatable (use local slang naturally where it fits)',
      energetic: 'high-energy, enthusiastic, and motivating',
      persuasive: 'compelling, persuasive, and action-oriented'
    };

    const tone = input.tone || 'energetic';
    const targetDuration = input.targetDuration || 30;
    const language = input.language || 'English';

    return `
You are an expert creative content enhancer specializing in making scripts more engaging, memorable, and viral-worthy.

TASK: Take the following initial script and enhance it with MORE creativity, better hooks, stronger emotional impact, and improved flow.

INITIAL SCRIPT:
Title: ${initialScript.title}
Hook: ${initialScript.hook}
Script: ${initialScript.narrationScript}

LANGUAGE: ${language}

ENHANCEMENT GOALS:
1. HOOK IMPROVEMENT: Make the opening even MORE attention-grabbing and irresistible
2. CREATIVE ELEMENTS: Add unexpected twists, clever analogies, or surprising perspectives
3. EMOTIONAL DEPTH: Amplify emotional triggers (curiosity, excitement, relatability)
4. STORYTELLING: Weave in micro-stories or vivid examples that stick in memory
5. RHYTHM & FLOW: Improve pacing with better sentence variety and natural pauses
6. ORIGINALITY: Make it feel fresh and unique, not formulaic

MAINTAIN REQUIREMENTS:
- Target Duration: ${targetDuration} seconds
- Tone: ${toneDescriptions[tone]}
- Language: ${language}
- All TTS clarity rules and expressive markers
- Authenticity (never sound like an ad)

CREATIVE ENHANCEMENT TECHNIQUES:
- Use metaphors, analogies, or comparisons that create vivid mental images
- Add pattern interrupts (unexpected questions, surprising facts, plot twists)
- Include relatable scenarios or "imagine this..." moments
- Vary sentence length and structure for dynamic rhythm
- Add strategic pauses and emotional markers for impact
- Use power words that trigger emotion (discover, secret, truth, hidden, shocking, etc.)

TTS CLARITY RULES (VERY IMPORTANT):
- Keep English words in English script exactly when mixed with other languages
- Write numbers as spoken words, not numeric digits
- Convert decimals to spoken words (example: "2.0" -> "two point zero")
- Never repeat the same model/term in multiple forms (avoid English + transliteration duplicates)
- Use a single clear representation for names like versions/models (example: "Minimax M two point five" only once)

EXPRESSIVE MARKERS:
Use emotion markers generously: [thoughtful], [excited], [annoyed], [surprised], [long pause], [clears throat], [exhales sharply], [whisper], [emphasize], etc.

Generate an ENHANCED version that takes the initial script to the next level of creativity and engagement while preserving its core message.
`;
  }

  /**
   * Call the Gemini API with structured output
   */
  private async callGeminiAPI(prompt: string): Promise<unknown> {
    const endpoint = `${GEMINI_API_BASE}/models/${this.model}:generateContent`;

    const response = await axios.post(
      `${endpoint}?key=${this.apiKey}`,
      {
        contents: [
          {
            parts: [{ text: prompt }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: SCRIPT_SCHEMA
          // Temperature defaults to 1.0 (Gemini 3 recommendation)
          // No maxOutputTokens limit to prevent response truncation
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

  /**
   * Call the Gemini API with YouTube video URL
   * This method passes the video URL as fileData so Gemini can actually access the video
   */
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
          responseSchema: SCRIPT_SCHEMA
          // Temperature defaults to 1.0 (Gemini 3 recommendation)
          // No maxOutputTokens limit to prevent response truncation
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

  /**
   * Parse the API response into a Script object
   */
  private parseResponse(response: unknown, tone: ScriptTone): Script {
    const data = response as {
      title: string;
      hook: string;
      narration_script: string;
      segments: Array<{ text: string; visual_hint?: string }>;
    };

    const now = Date.now();
    const segments: ScriptSegment[] = data.segments.map((seg, index) => ({
      id: `segment_${now}_${index}`,
      text: seg.text,
      visualHint: seg.visual_hint
    }));

    // Calculate word count and estimated duration
    const wordCount = data.narration_script.split(/\s+/).length;
    const estimatedDuration = Math.ceil((wordCount / 150) * 60); // 150 words per minute

    return {
      id: `script_${now}`,
      title: data.title,
      hook: data.hook,
      narrationScript: data.narration_script,
      segments,
      metadata: {
        wordCount,
        estimatedDuration,
        tone,
        createdAt: now,
        updatedAt: now
      }
    };
  }

  /**
   * Extract YouTube video ID from URL
   */
  private extractYouTubeId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(error: unknown): ServiceError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ error?: { message?: string } }>;

      if (axiosError.response?.status === 401) {
        return {
          code: 'INVALID_API_KEY',
          message: 'Invalid Gemini API key. Please check your settings.'
        };
      }

      if (axiosError.response?.status === 429) {
        return {
          code: 'RATE_LIMIT',
          message: 'API rate limit exceeded. Please try again in a few minutes.'
        };
      }

      if (axiosError.response?.data?.error?.message) {
        return {
          code: 'API_ERROR',
          message: axiosError.response.data.error.message
        };
      }

      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        return {
          code: 'TIMEOUT',
          message: 'Request timed out. Please try again.'
        };
      }

      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection and try again.'
      };
    }

    if (error instanceof Error) {
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message
      };
    }

    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unexpected error occurred'
    };
  }
}

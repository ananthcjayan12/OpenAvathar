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
      description: 'Complete narration script optimized for viral content'
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
   * Generate a script from user input
   */
  async generateScript(input: ScriptInput): Promise<GenerationResult<Script>> {
    try {
      const prompt = this.buildPrompt(input);
      const response = await this.callGeminiAPI(prompt);
      
      const script = this.parseResponse(response, input.tone || 'energetic');
      
      return {
        success: true,
        data: script
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Analyze a YouTube video and generate a script
   */
  async analyzeYouTubeVideo(url: string, tone: ScriptTone = 'energetic', targetDuration: number = 40): Promise<GenerationResult<Script>> {
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

      const prompt = this.buildYouTubePrompt(url, tone, targetDuration);
      const response = await this.callGeminiAPI(prompt);
      
      const script = this.parseResponse(response, tone);
      
      return {
        success: true,
        data: script
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
      casual: 'conversational, friendly, and relatable',
      energetic: 'high-energy, enthusiastic, and motivating',
      persuasive: 'compelling, persuasive, and action-oriented'
    };

    const tone = input.tone || 'energetic';
    const targetDuration = input.targetDuration || 30;

    return `
You are an expert viral content strategist specializing in social media reels and short-form video content.

TASK: Create a compelling narration script for a ${targetDuration}-second video.

INPUT: ${input.content}

REQUIREMENTS:
1. HOOK: Create an attention-grabbing opener (first 3-5 seconds) that stops scrolling
2. PACING: Use short, punchy sentences (maximum 15 words each)
3. TONE: ${toneDescriptions[tone]}
4. ENGAGEMENT: Include pattern interrupts and compelling transitions
5. LENGTH: Target approximately ${targetDuration} seconds of narration
6. STRUCTURE: Clear beginning, valuable middle, strong call-to-action

SCRIPT STRUCTURE:
- Opening hook (attention-grabber that creates curiosity)
- Main content (deliver value, tell a story, or provide insights)
- Call to action (clear next step or thought-provoking conclusion)

STYLE GUIDELINES:
- Start with a question, bold statement, or surprising fact
- Use active voice and present tense
- Include emotional triggers (curiosity, urgency, FOMO)
- End with a clear payoff or call to action

Generate a complete, ready-to-record script optimized for maximum engagement.
`;
  }

  /**
   * Build YouTube analysis prompt
   */
  private buildYouTubePrompt(url: string, tone: ScriptTone, targetDuration: number = 40): string {
    const toneDescriptions = {
      professional: 'professional, clear, and authoritative',
      casual: 'friendly, conversational, and approachable',
      energetic: 'dynamic, enthusiastic, and high-energy',
      persuasive: 'compelling, persuasive, and action-oriented'
    };

    return `
You are an expert at analyzing and repurposing video content for social media.

CRITICAL INSTRUCTIONS:
1. Watch and CAREFULLY analyze the video at this URL: ${url}
2. Base your script ONLY on the ACTUAL content, message, and key points from this specific video
3. Do NOT create generic content or hallucinate information not present in the video
4. If you cannot access the video, return an error message instead of guessing

TASK: Create a viral-style narration script that accurately represents this video's message.

TARGET LENGTH: Approximately ${targetDuration} seconds of narration

CONTENT REQUIREMENTS:
- Extract the SPECIFIC core message and key points from THIS video
- Identify the video's unique angle, examples, or insights
- Preserve factual accuracy - do not invent details or examples
- Transform the message into a compelling ${targetDuration}-second narration script
- Tone: ${toneDescriptions[tone]}

SCRIPT STRUCTURE:
1. Hook (3-5 seconds): Grab attention with the video's most compelling insight
2. Core Message (${Math.round(targetDuration * 0.7)} seconds): Deliver the key points clearly and engagingly
3. Call-to-Action (5 seconds): Strong closing that prompts engagement

Generate a script that accurately represents the video content while being optimized for social media engagement.
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
          responseSchema: SCRIPT_SCHEMA,
          temperature: 1.2, // Higher temperature for more creative, varied outputs
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

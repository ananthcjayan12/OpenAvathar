/**
 * ElevenLabs API Service
 * 
 * Handles text-to-speech generation using ElevenLabs API.
 * Supports voice management, audio generation, and streaming.
 */

import axios, { AxiosError } from 'axios';
import type {
  Voice,
  AudioGenerationOptions,
  ServiceError,
  GenerationResult
} from '@/types/storyboard';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export class ElevenLabsService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Get list of available voices
   */
  async getVoices(): Promise<GenerationResult<Voice[]>> {
    try {
      const response = await axios.get(
        `${ELEVENLABS_API_BASE}/voices`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      const voices = response.data.voices as Voice[];
      
      return {
        success: true,
        data: voices
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Generate audio from text
   */
  async generateAudio(
    text: string,
    options: AudioGenerationOptions
  ): Promise<GenerationResult<Blob>> {
    try {
      const modelId = options.quality === 'production' 
        ? 'eleven_multilingual_v2' 
        : 'eleven_turbo_v2';

      const response = await axios.post(
        `${ELEVENLABS_API_BASE}/text-to-speech/${options.voiceId}`,
        {
          text,
          model_id: modelId,
          voice_settings: {
            stability: options.stability ?? 0.5,
            similarity_boost: options.similarityBoost ?? 0.75,
            style: 0.0,
            use_speaker_boost: true
          }
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg'
          },
          responseType: 'blob'
        }
      );

      const audioBlob = new Blob([response.data], { type: 'audio/mpeg' });
      
      return {
        success: true,
        data: audioBlob
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Stream audio generation for long texts
   * This returns a blob in chunks for better UX on long generations
   */
  async generateAudioStream(
    text: string,
    options: AudioGenerationOptions,
    onProgress?: (progress: number) => void
  ): Promise<GenerationResult<Blob>> {
    try {
      // Split long text into chunks (ElevenLabs has a 5000 character limit per request)
      const chunks = this.splitTextIntoChunks(text, 4000);
      const audioChunks: Blob[] = [];
      
      for (let i = 0; i < chunks.length; i++) {
        const result = await this.generateAudio(chunks[i], options);
        
        if (!result.success || !result.data) {
          return result;
        }
        
        audioChunks.push(result.data);
        
        if (onProgress) {
          onProgress(((i + 1) / chunks.length) * 100);
        }
      }

      // Combine all audio chunks
      const combinedBlob = new Blob(audioChunks, { type: 'audio/mpeg' });
      
      return {
        success: true,
        data: combinedBlob
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Get a specific voice by ID
   */
  async getVoice(voiceId: string): Promise<GenerationResult<Voice>> {
    try {
      const response = await axios.get(
        `${ELEVENLABS_API_BASE}/voices/${voiceId}`,
        {
          headers: {
            'xi-api-key': this.apiKey
          }
        }
      );

      return {
        success: true,
        data: response.data as Voice
      };
    } catch (error) {
      return {
        success: false,
        error: this.handleError(error)
      };
    }
  }

  /**
   * Estimate audio duration from text
   * Based on average speaking rate of 150 words per minute
   */
  estimateAudioDuration(text: string): number {
    const words = text.split(/\s+/).length;
    const minutes = words / 150;
    return Math.ceil(minutes * 60); // Return seconds
  }

  /**
   * Split text into chunks at natural break points
   */
  private splitTextIntoChunks(text: string, maxChunkSize: number): string[] {
    if (text.length <= maxChunkSize) {
      return [text];
    }

    const chunks: string[] = [];
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let currentChunk = '';

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length <= maxChunkSize) {
        currentChunk += sentence;
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = sentence;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Handle API errors and convert to user-friendly format
   */
  private handleError(error: unknown): ServiceError {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<{ detail?: { message?: string; status?: string } }>;
      
      if (axiosError.response?.status === 401) {
        return {
          code: 'INVALID_API_KEY',
          message: 'Invalid ElevenLabs API key. Please check your settings.'
        };
      }
      
      if (axiosError.response?.status === 429) {
        return {
          code: 'RATE_LIMIT',
          message: 'API rate limit exceeded. You may have exhausted your character quota.'
        };
      }

      if (axiosError.response?.status === 422) {
        return {
          code: 'INVALID_INPUT',
          message: 'Invalid input. Text may be too long or contain unsupported characters.'
        };
      }

      if (axiosError.response?.data?.detail?.message) {
        return {
          code: 'API_ERROR',
          message: axiosError.response.data.detail.message
        };
      }

      if (axiosError.code === 'ECONNABORTED' || axiosError.message.includes('timeout')) {
        return {
          code: 'TIMEOUT',
          message: 'Request timed out. Audio may be too long. Try shortening your script.'
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

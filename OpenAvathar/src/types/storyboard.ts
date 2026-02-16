/**
 * Storyboard Feature Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the Storyboard feature.
 */

// ============================================================================
// Core Types
// ============================================================================

export type InputMode = 'idea' | 'youtube';
export type GenerationStatus = 'idle' | 'generating' | 'completed' | 'error';
export type ScriptTone = 'professional' | 'casual' | 'energetic' | 'persuasive';
export type AudioQuality = 'draft' | 'production';

// ============================================================================
// Script Types
// ============================================================================

export interface ScriptSegment {
  id: string;
  text: string;
  visualHint?: string;
  timestamp?: number;
  duration?: number;
}

export interface ScriptMetadata {
  wordCount: number;
  estimatedDuration: number;
  tone: ScriptTone;
  createdAt: number;
  updatedAt: number;
}

export interface Script {
  id: string;
  title: string;
  hook: string;
  narrationScript: string;
  segments: ScriptSegment[];
  metadata: ScriptMetadata;
  audioUrl?: string;
}

// ============================================================================
// Input Types
// ============================================================================

export interface ScriptInput {
  mode: InputMode;
  content: string;
  tone?: ScriptTone;
  targetDuration?: number;
  language?: string; // Target language for the script (e.g., 'Malayalam', 'English', 'Hindi')
}

export interface YouTubeVideoInfo {
  url: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
}

// ============================================================================
// Audio Types
// ============================================================================

export interface Voice {
  voice_id: string;
  name: string;
  category?: string;
  description?: string;
  preview_url?: string;
}

export interface AudioGenerationOptions {
  voiceId: string;
  quality: AudioQuality;
  speed?: number;
  stability?: number;
  similarityBoost?: number;
}

export interface AudioGenerationProgress {
  stage: 'preparing' | 'generating' | 'finalizing';
  progress: number;
  estimatedTimeRemaining?: number;
}

// ============================================================================
// Service Response Types
// ============================================================================

export interface ServiceError {
  code: string;
  message: string;
  details?: unknown;
}

export interface GenerationResult<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

// ============================================================================
// Storage Types
// ============================================================================

export interface SavedScript {
  script: Script;
  savedAt: number;
  tags?: string[];
}

export interface StoryboardHistory {
  scripts: SavedScript[];
  totalCount: number;
  lastUpdated: number;
}

// ============================================================================
// User Facing Error Types
// ============================================================================

export type ErrorSeverity = 'info' | 'warning' | 'error';

export interface UserFacingError {
  title: string;
  message: string;
  action?: {
    label: string;
    handler: () => void;
  };
  severity: ErrorSeverity;
}

// ============================================================================
// API Configuration Types
// ============================================================================

export interface StoryboardConfig {
  geminiApiKey: string | null;
  elevenLabsApiKey: string | null;
  defaultVoiceId: string | null;
  defaultTone: ScriptTone;
  autoSave: boolean;
}

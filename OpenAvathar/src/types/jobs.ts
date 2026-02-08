/**
 * Job Queue System Types
 * TICKET-001: Core types for parallel generation job tracking
 */

import type { Purpose, VideoOrientation } from './index';

/**
 * Job status enum representing the lifecycle of a generation job
 */
export type JobStatus = 'queued' | 'uploading' | 'generating' | 'completed' | 'failed';

/**
 * Configuration for a generation job
 * Note: File objects don't serialize - imageFileName/audioFileName are set after upload
 */
export interface JobConfig {
    /** Original image file for upload */
    imageFile: File;
    /** Original audio file for upload (required for infinitetalk) */
    audioFile?: File;
    /** User prompt for generation */
    prompt: string;
    /** Video orientation setting */
    orientation: VideoOrientation;
    /** Maximum frames for generation */
    maxFrames: number;
    /** Workflow type (wan2.2 or infinitetalk) */
    workflowType: Purpose;
    /** Audio config scale for infinitetalk */
    audioCfgScale?: number;

    // Set after upload completes
    /** Uploaded image filename on ComfyUI server */
    imageFileName?: string;
    /** Uploaded audio filename on ComfyUI server */
    audioFileName?: string;
}

/**
 * A single generation job in the queue
 * @property logs - Limited to MAX_JOB_LOGS entries (FIFO)
 */
export interface GenerationJob {
    /** Unique job identifier (UUID) */
    id: string;
    /** ID of the pod this job is assigned to */
    podId: string;
    /** Current job status */
    status: JobStatus;
    /** Progress percentage (0-100) */
    progress: number;
    /** Job configuration */
    config: JobConfig;
    /** 
     * Per-job log entries 
     * @maxLength 100 - Older logs are dropped (FIFO)
     */
    logs: string[];
    /** Error message if job failed */
    error?: string;
    /** ComfyUI prompt ID once queued */
    promptId?: string;
    /** Timestamp when job was created */
    createdAt: number;
    /** Timestamp when job upload/processing started */
    startedAt?: number;
    /** Timestamp when job completed or failed */
    completedAt?: number;
    /** Output video filename on ComfyUI server */
    outputFilename?: string;
    /** Output video URL for preview/download */
    outputUrl?: string;
}

/**
 * Maximum number of log entries stored per job
 * Used for FIFO log truncation to prevent memory issues
 */
export const MAX_JOB_LOGS = 100;

/**
 * Maximum number of jobs to display in the queue panel
 * Use "Show all" for more
 */
export const MAX_VISIBLE_JOBS = 10;

/**
 * Job processor configuration
 */
export interface JobProcessorConfig {
    /** Polling interval in milliseconds */
    pollIntervalMs: number;
    /** Max consecutive poll failures before marking job as failed */
    maxPollFailures: number;
    /** Upload timeout in milliseconds */
    uploadTimeoutMs: number;
    /** Log buffer flush interval in milliseconds */
    logFlushIntervalMs: number;
}

/**
 * Default job processor configuration
 */
export const DEFAULT_JOB_PROCESSOR_CONFIG: JobProcessorConfig = {
    pollIntervalMs: 5000,
    maxPollFailures: 3,
    uploadTimeoutMs: 5 * 60 * 1000, // 5 minutes
    logFlushIntervalMs: 2000,
};

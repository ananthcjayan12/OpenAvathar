/**
 * Job Processor Service
 * TICKET-004: Background job processor for parallel generation
 * 
 * This is a singleton that watches the job queue and processes jobs.
 * It handles: upload → queue workflow → poll for completion lifecycle.
 */

import { useJobQueue } from '../stores/jobQueue';
import { useAppStore } from '../stores/appStore';
import { comfyuiApi } from './comfyuiApi';
import { workflowPatcher } from './workflowPatcher';
import type { GenerationJob, JobProcessorConfig } from '../types/jobs';
import type { AppPod } from '../types';

/**
 * Job Processor Singleton
 * Manages background processing of generation jobs
 */
class JobProcessor {
    private static instance: JobProcessor;
    private activePollers: Map<string, number> = new Map();
    private logBuffers: Map<string, string[]> = new Map();
    private logFlushInterval: number | null = null;
    private pollFailures: Map<string, number> = new Map();
    private config: JobProcessorConfig;

    private constructor() {
        this.config = {
            pollIntervalMs: 5000,
            maxPollFailures: 3,
            uploadTimeoutMs: 5 * 60 * 1000, // 5 minutes
            logFlushIntervalMs: 2000,
        };
        this.startLogFlushInterval();
    }

    /**
     * Get the singleton instance
     */
    static getInstance(): JobProcessor {
        if (!JobProcessor.instance) {
            JobProcessor.instance = new JobProcessor();
        }
        return JobProcessor.instance;
    }

    /**
     * Start processing a job
     */
    async processJob(jobId: string): Promise<void> {
        const { getJob } = useJobQueue.getState();
        const job = getJob(jobId);

        if (!job) {
            console.error(`[JobProcessor] Job ${jobId} not found`);
            return;
        }

        // Get pod info
        const { pods } = useAppStore.getState();
        const pod = pods[job.podId];

        if (!pod || !pod.comfyuiUrl) {
            this.failJob(jobId, 'Pod not available or ComfyUI URL not set');
            return;
        }

        this.addLog(jobId, `Starting job ${jobId} on pod ${pod.name}`);

        try {
            // Step 1: Upload files
            await this.uploadFiles(jobId, job, pod);

            // Step 2: Queue workflow
            await this.queueWorkflow(jobId, job, pod);

            // Step 3: Start polling for completion
            this.startPolling(jobId, pod.comfyuiUrl);

        } catch (error: any) {
            this.failJob(jobId, error.message || 'Unknown error during processing');
        }
    }

    /**
     * Upload files to ComfyUI
     */
    private async uploadFiles(jobId: string, job: GenerationJob, pod: AppPod): Promise<void> {
        const { updateJob } = useJobQueue.getState();

        updateJob(jobId, {
            status: 'uploading',
            startedAt: Date.now()
        });
        this.addLog(jobId, 'Uploading image...');

        // Upload image
        const imageFileName = await comfyuiApi.uploadFile(
            pod.comfyuiUrl!,
            job.config.imageFile
        );
        this.addLog(jobId, `Image uploaded: ${imageFileName}`);

        // Upload audio if present (infinitetalk)
        let audioFileName: string | undefined;
        if (job.config.audioFile) {
            this.addLog(jobId, 'Uploading audio...');
            audioFileName = await comfyuiApi.uploadFile(
                pod.comfyuiUrl!,
                job.config.audioFile
            );
            this.addLog(jobId, `Audio uploaded: ${audioFileName}`);
        }

        // Update job with uploaded filenames
        updateJob(jobId, {
            config: {
                ...job.config,
                imageFileName,
                audioFileName,
            },
        });
    }

    /**
     * Queue the workflow on ComfyUI
     */
    private async queueWorkflow(jobId: string, job: GenerationJob, pod: AppPod): Promise<void> {
        const { updateJob, getJob } = useJobQueue.getState();

        this.addLog(jobId, 'Preparing workflow...');
        updateJob(jobId, { status: 'generating' });

        // Get the updated job with uploaded filenames
        const updatedJob = getJob(jobId);
        if (!updatedJob) {
            throw new Error('Job not found after upload');
        }

        // Patch the workflow
        let workflow: object;
        if (job.config.workflowType === 'wan2.2') {
            workflow = await workflowPatcher.patchWorkflow('wan2.2', {
                imageName: updatedJob.config.imageFileName!,
                prompt: job.config.prompt,
                width: job.config.orientation === 'horizontal' ? 1024 : 576,
                height: job.config.orientation === 'horizontal' ? 576 : 1024,
                orientation: job.config.orientation,
                maxFrames: job.config.maxFrames,
                audioCfgScale: job.config.audioCfgScale,
            });
        } else {
            workflow = await workflowPatcher.patchWorkflow('infinitetalk', {
                imageName: updatedJob.config.imageFileName!,
                audioName: updatedJob.config.audioFileName!,
                prompt: job.config.prompt,
                orientation: job.config.orientation,
                maxFrames: job.config.maxFrames,
                audioCfgScale: job.config.audioCfgScale,
            });
        }

        this.addLog(jobId, 'Queueing workflow on ComfyUI...');

        // Queue the workflow
        const response = await comfyuiApi.queueWorkflow(pod.comfyuiUrl!, workflow);

        updateJob(jobId, { promptId: response.prompt_id });
        this.addLog(jobId, `Workflow queued with prompt ID: ${response.prompt_id}`);
    }

    /**
     * Start polling for job completion
     */
    private startPolling(jobId: string, comfyuiUrl: string): void {
        const { getJob } = useJobQueue.getState();
        const job = getJob(jobId);

        if (!job || !job.promptId) {
            console.error(`[JobProcessor] Cannot poll: job ${jobId} has no promptId`);
            return;
        }

        this.pollFailures.set(jobId, 0);

        const pollInterval = window.setInterval(async () => {
            await this.pollJobStatus(jobId, comfyuiUrl);
        }, this.config.pollIntervalMs);

        this.activePollers.set(jobId, pollInterval);
        this.addLog(jobId, 'Generation in progress, polling for completion...');
    }

    /**
     * Poll job status from ComfyUI
     */
    private async pollJobStatus(jobId: string, comfyuiUrl: string): Promise<void> {
        const { getJob, updateJob } = useJobQueue.getState();
        const job = getJob(jobId);

        if (!job || !job.promptId) {
            this.stopPolling(jobId);
            return;
        }

        try {
            const status = await comfyuiApi.getGenerationStatus(comfyuiUrl, job.promptId);

            // Reset failure count on success
            this.pollFailures.set(jobId, 0);

            if (status.status === 'completed' && status.outputs && status.outputs.length > 0) {
                const outputFilename = status.outputs[0].filename;
                const outputUrl = comfyuiApi.getOutputUrl(comfyuiUrl, outputFilename);

                this.completeJob(jobId, outputFilename, outputUrl);
            } else if (status.status === 'failed') {
                this.failJob(jobId, status.error || 'Generation failed');
            } else {
                // Still running - update progress estimate
                // ComfyUI doesn't give real progress, so we estimate based on time
                const elapsedMs = Date.now() - (job.startedAt || job.createdAt);
                const estimatedProgress = Math.min(90, Math.floor(elapsedMs / 1000)); // 1% per second, max 90%
                updateJob(jobId, { progress: estimatedProgress });
            }
        } catch (error: any) {
            const failures = (this.pollFailures.get(jobId) || 0) + 1;
            this.pollFailures.set(jobId, failures);

            console.error(`[JobProcessor] Poll failure ${failures}/${this.config.maxPollFailures} for job ${jobId}:`, error);

            if (failures >= this.config.maxPollFailures) {
                this.failJob(jobId, `Pod unavailable after ${failures} retries: ${error.message}`);
            }
        }
    }

    /**
     * Complete a job successfully
     */
    private completeJob(jobId: string, outputFilename: string, outputUrl: string): void {
        const { updateJob } = useJobQueue.getState();
        const { addGeneratedVideo, incrementGenerationCount, freeTrialUsed, isLicensed, markTrialUsed } = useAppStore.getState();

        this.stopPolling(jobId);
        this.flushLogs(jobId);

        updateJob(jobId, {
            status: 'completed',
            progress: 100,
            outputFilename,
            outputUrl,
            completedAt: Date.now(),
        });

        // Add to video history
        const job = useJobQueue.getState().getJob(jobId);
        if (job) {
            addGeneratedVideo({
                id: jobId,
                filename: outputFilename,
                url: outputUrl,
                timestamp: Date.now(),
                orientation: job.config.orientation,
                purpose: job.config.workflowType,
            });
        }

        // Handle trial/license tracking
        incrementGenerationCount();
        if (!isLicensed && !freeTrialUsed) {
            markTrialUsed();
        }

        this.addLog(jobId, `✓ Generation completed! Output: ${outputFilename}`);
        console.log(`[JobProcessor] Job ${jobId} completed successfully`);

        // Check for queued jobs that can be started
        this.processNextQueuedJob(job?.podId);
    }

    /**
     * Fail a job
     */
    private failJob(jobId: string, error: string): void {
        const { updateJob, getJob } = useJobQueue.getState();
        const job = getJob(jobId);

        this.stopPolling(jobId);
        this.flushLogs(jobId);

        updateJob(jobId, {
            status: 'failed',
            error,
            completedAt: Date.now(),
        });

        this.addLog(jobId, `✗ Generation failed: ${error}`);
        console.error(`[JobProcessor] Job ${jobId} failed:`, error);

        // Check for queued jobs that can be started
        if (job) {
            this.processNextQueuedJob(job.podId);
        }
    }

    /**
     * Stop polling for a job
     */
    stopPolling(jobId: string): void {
        const interval = this.activePollers.get(jobId);
        if (interval) {
            window.clearInterval(interval);
            this.activePollers.delete(jobId);
        }
        this.pollFailures.delete(jobId);
    }

    /**
     * Stop all polling
     */
    stopAll(): void {
        for (const [_jobId, interval] of this.activePollers) {
            window.clearInterval(interval);
        }
        this.activePollers.clear();
        this.pollFailures.clear();

        if (this.logFlushInterval) {
            window.clearInterval(this.logFlushInterval);
            this.logFlushInterval = null;
        }
    }

    /**
     * Add a log entry (buffered)
     */
    private addLog(jobId: string, message: string): void {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = `[${timestamp}] ${message}`;

        if (!this.logBuffers.has(jobId)) {
            this.logBuffers.set(jobId, []);
        }
        this.logBuffers.get(jobId)!.push(logEntry);

        // Also log to console for debugging
        console.log(`[Job ${jobId}] ${message}`);
    }

    /**
     * Flush buffered logs to the store
     */
    private flushLogs(jobId: string): void {
        const { appendLogs } = useJobQueue.getState();
        const buffer = this.logBuffers.get(jobId);

        if (buffer && buffer.length > 0) {
            appendLogs(jobId, buffer);
            this.logBuffers.set(jobId, []);
        }
    }

    /**
     * Start periodic log flushing
     */
    private startLogFlushInterval(): void {
        this.logFlushInterval = window.setInterval(() => {
            for (const jobId of this.logBuffers.keys()) {
                this.flushLogs(jobId);
            }
        }, this.config.logFlushIntervalMs);
    }

    /**
     * Process the next queued job for a pod (if any)
     */
    private processNextQueuedJob(podId?: string): void {
        if (!podId) return;

        const { getQueuedJobs, getRunningJobsForPod } = useJobQueue.getState();

        // Check if pod is busy
        const runningJobs = getRunningJobsForPod(podId);
        if (runningJobs.length > 0) {
            return; // Pod still busy
        }

        // Find next queued job for this pod
        const queuedJobs = getQueuedJobs().filter(j => j.podId === podId);
        if (queuedJobs.length > 0) {
            console.log(`[JobProcessor] Starting next queued job ${queuedJobs[0].id} for pod ${podId}`);
            this.processJob(queuedJobs[0].id);
        }
    }

    /**
     * Check if a pod is available (no running jobs)
     */
    isPodAvailable(podId: string): boolean {
        const { getRunningJobsForPod } = useJobQueue.getState();
        return getRunningJobsForPod(podId).length === 0;
    }

    /**
     * Retry a failed job
     */
    async retryJob(jobId: string): Promise<void> {
        const { updateJob, getJob } = useJobQueue.getState();
        const job = getJob(jobId);

        if (!job || job.status !== 'failed') {
            console.error(`[JobProcessor] Cannot retry: job ${jobId} not found or not failed`);
            return;
        }

        // Reset job state
        updateJob(jobId, {
            status: 'queued',
            progress: 0,
            error: undefined,
            promptId: undefined,
            startedAt: undefined,
            completedAt: undefined,
            outputFilename: undefined,
            outputUrl: undefined,
            logs: [],
        });

        // Check if pod is available
        if (this.isPodAvailable(job.podId)) {
            await this.processJob(jobId);
        }
    }

    /**
     * Cancel a job (queued or running)
     */
    async cancelJob(jobId: string): Promise<void> {
        const { removeJob, getJob } = useJobQueue.getState();
        const job = getJob(jobId);

        if (!job) {
            console.error(`[JobProcessor] Cannot cancel: job ${jobId} not found`);
            return;
        }

        if (job.status === 'queued') {
            // For queued jobs, just remove from queue
            removeJob(jobId);
            console.log(`[JobProcessor] Cancelled queued job ${jobId}`);
        } else if (job.status === 'uploading' || job.status === 'generating') {
            // For running jobs, interrupt in ComfyUI first
            const pod = useAppStore.getState().pods[job.podId];
            if (pod?.comfyuiUrl) {
                this.addLog(jobId, 'Cancelling generation in ComfyUI...');
                await comfyuiApi.interruptGeneration(pod.comfyuiUrl);
            }

            // Stop polling and mark as failed
            this.stopPolling(jobId);
            this.failJob(jobId, 'Cancelled by user');
            console.log(`[JobProcessor] Cancelled running job ${jobId}`);
        }
    }
}

// Export the singleton
export const jobProcessor = JobProcessor.getInstance();

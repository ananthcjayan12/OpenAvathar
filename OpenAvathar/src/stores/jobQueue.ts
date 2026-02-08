/**
 * Job Queue Zustand Store
 * TICKET-002: Manages generation jobs across multiple pods
 */

import { create } from 'zustand';
import type { GenerationJob, JobConfig } from '../types/jobs';

/**
 * Generate a UUID v4
 */
function generateJobId(): string {
    return 'job-' + crypto.randomUUID();
}

/**
 * Job Queue Store State
 */
interface JobQueueState {
    /** All jobs indexed by ID */
    jobs: Record<string, GenerationJob>;

    // Actions
    /** Add a new job to the queue */
    addJob: (config: JobConfig, podId: string) => string;
    /** Update an existing job */
    updateJob: (jobId: string, updates: Partial<GenerationJob>) => void;
    /** Remove a job from the queue */
    removeJob: (jobId: string) => void;
    /** Append logs to a job (respects MAX_JOB_LOGS limit) */
    appendLogs: (jobId: string, newLogs: string[]) => void;
    /** Get all jobs for a specific pod */
    getJobsForPod: (podId: string) => GenerationJob[];
    /** Get running jobs for a specific pod (uploading or generating) */
    getRunningJobsForPod: (podId: string) => GenerationJob[];
    /** Get all queued jobs */
    getQueuedJobs: () => GenerationJob[];
    /** Get job by ID */
    getJob: (jobId: string) => GenerationJob | undefined;
    /** Clear all completed/failed jobs */
    clearFinishedJobs: () => void;
    /** Clear all jobs */
    clearAllJobs: () => void;
}

/**
 * Maximum log entries per job (defined in types/jobs.ts)
 */
const LOG_LIMIT = 100;

export const useJobQueue = create<JobQueueState>((set, get) => ({
    jobs: {},

    addJob: (config: JobConfig, podId: string) => {
        const jobId = generateJobId();
        const newJob: GenerationJob = {
            id: jobId,
            podId,
            status: 'queued',
            progress: 0,
            config,
            logs: [],
            createdAt: Date.now(),
        };

        set((state) => ({
            jobs: { ...state.jobs, [jobId]: newJob },
        }));

        return jobId;
    },

    updateJob: (jobId: string, updates: Partial<GenerationJob>) => {
        set((state) => {
            const existingJob = state.jobs[jobId];
            if (!existingJob) {
                console.warn(`Job ${jobId} not found, cannot update`);
                return state;
            }

            return {
                jobs: {
                    ...state.jobs,
                    [jobId]: { ...existingJob, ...updates },
                },
            };
        });
    },

    removeJob: (jobId: string) => {
        set((state) => {
            const { [jobId]: removed, ...remainingJobs } = state.jobs;
            if (!removed) {
                console.warn(`Job ${jobId} not found, cannot remove`);
            }
            return { jobs: remainingJobs };
        });
    },

    appendLogs: (jobId: string, newLogs: string[]) => {
        set((state) => {
            const existingJob = state.jobs[jobId];
            if (!existingJob) {
                return state;
            }

            // Combine existing and new logs, then trim to limit (FIFO)
            const combinedLogs = [...existingJob.logs, ...newLogs];
            const trimmedLogs = combinedLogs.length > LOG_LIMIT
                ? combinedLogs.slice(-LOG_LIMIT)
                : combinedLogs;

            return {
                jobs: {
                    ...state.jobs,
                    [jobId]: { ...existingJob, logs: trimmedLogs },
                },
            };
        });
    },

    getJobsForPod: (podId: string) => {
        const { jobs } = get();
        return Object.values(jobs)
            .filter((job) => job.podId === podId)
            .sort((a, b) => a.createdAt - b.createdAt);
    },

    getRunningJobsForPod: (podId: string) => {
        const { jobs } = get();
        return Object.values(jobs).filter(
            (job) =>
                job.podId === podId &&
                (job.status === 'uploading' || job.status === 'generating')
        );
    },

    getQueuedJobs: () => {
        const { jobs } = get();
        return Object.values(jobs)
            .filter((job) => job.status === 'queued')
            .sort((a, b) => a.createdAt - b.createdAt);
    },

    getJob: (jobId: string) => {
        return get().jobs[jobId];
    },

    clearFinishedJobs: () => {
        set((state) => {
            const activeJobs: Record<string, GenerationJob> = {};
            Object.values(state.jobs).forEach((job) => {
                if (job.status !== 'completed' && job.status !== 'failed') {
                    activeJobs[job.id] = job;
                }
            });
            return { jobs: activeJobs };
        });
    },

    clearAllJobs: () => {
        set({ jobs: {} });
    },
}));

/**
 * Selector: Get all jobs sorted by creation time
 */
export const selectAllJobs = (state: JobQueueState) =>
    Object.values(state.jobs).sort((a, b) => b.createdAt - a.createdAt);

/**
 * Selector: Check if any job is currently running
 */
export const selectHasRunningJobs = (state: JobQueueState) =>
    Object.values(state.jobs).some(
        (job) => job.status === 'uploading' || job.status === 'generating'
    );

/**
 * Selector: Get job counts by status
 */
export const selectJobCounts = (state: JobQueueState) => {
    const jobs = Object.values(state.jobs);
    return {
        queued: jobs.filter((j) => j.status === 'queued').length,
        running: jobs.filter((j) => j.status === 'uploading' || j.status === 'generating').length,
        completed: jobs.filter((j) => j.status === 'completed').length,
        failed: jobs.filter((j) => j.status === 'failed').length,
        total: jobs.length,
    };
};

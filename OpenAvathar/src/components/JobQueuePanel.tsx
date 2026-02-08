/**
 * Job Queue Panel Component
 * TICKET-006: Displays all generation jobs with status, progress, and logs
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    CheckCircle2,
    AlertCircle,
    Clock,
    ChevronDown,
    ChevronUp,
    X,
    RefreshCw,
    Download,
    Share2,
    Rocket,
    Trash2
} from 'lucide-react';
import { useJobQueue } from '@/stores/jobQueue';
import { jobProcessor } from '@/services/jobProcessor';
import type { GenerationJob, JobStatus } from '@/types/jobs';

interface JobQueuePanelProps {
    /** Whether the panel is collapsed */
    collapsed?: boolean;
    /** Callback when panel is toggled */
    onToggle?: () => void;
}

/**
 * Get status color for a job status
 */
function getStatusColor(status: JobStatus): string {
    switch (status) {
        case 'queued':
            return 'var(--text-secondary)';
        case 'uploading':
        case 'generating':
            return 'var(--accent)';
        case 'completed':
            return 'var(--success)';
        case 'failed':
            return 'var(--error)';
        default:
            return 'var(--text-secondary)';
    }
}

/**
 * Get status icon for a job status
 */
function getStatusIcon(status: JobStatus) {
    switch (status) {
        case 'queued':
            return <Clock size={16} />;
        case 'uploading':
        case 'generating':
            return <Loader2 size={16} className="animate-spin" />;
        case 'completed':
            return <CheckCircle2 size={16} />;
        case 'failed':
            return <AlertCircle size={16} />;
        default:
            return <Clock size={16} />;
    }
}

/**
 * Format elapsed time
 */
function formatElapsedTime(startTs: number, endTs?: number): string {
    const elapsed = (endTs || Date.now()) - startTs;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);

    if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
}

/**
 * Single Job Card Component
 */
function JobCard({ job }: { job: GenerationJob }) {
    const [expanded, setExpanded] = useState(false);

    const handleRetry = () => {
        jobProcessor.retryJob(job.id);
    };

    const handleCancel = () => {
        jobProcessor.cancelJob(job.id);
    };

    const handleDownload = () => {
        if (job.outputUrl) {
            window.open(job.outputUrl, '_blank');
        }
    };

    const handleShare = async () => {
        if (job.outputUrl && navigator.share) {
            try {
                await navigator.share({
                    title: 'Generated Video',
                    url: job.outputUrl,
                });
            } catch (err) {
                // User cancelled or error
                console.log('Share failed:', err);
            }
        } else if (job.outputUrl) {
            navigator.clipboard.writeText(job.outputUrl);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="glass-panel"
            style={{
                padding: '12px 16px',
                borderRadius: '12px',
                marginBottom: '8px',
                border: '1px solid var(--border)',
            }}
        >
            {/* Header Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                {/* Status Icon */}
                <div style={{ color: getStatusColor(job.status), flexShrink: 0 }}>
                    {getStatusIcon(job.status)}
                </div>

                {/* Job Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.9rem',
                        fontWeight: 500
                    }}>
                        <span style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {job.id.slice(0, 12)}...
                        </span>
                        <span style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            background: 'rgba(255,255,255,0.05)',
                            borderRadius: '4px',
                            color: 'var(--text-secondary)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em'
                        }}>
                            {job.config.workflowType}
                        </span>
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginTop: '2px'
                    }}>
                        <Rocket size={12} />
                        <span style={{
                            textTransform: 'capitalize',
                            color: getStatusColor(job.status)
                        }}>
                            {job.status}
                        </span>
                        {job.startedAt && (
                            <span>• {formatElapsedTime(job.startedAt, job.completedAt)}</span>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    {(job.status === 'queued' || job.status === 'uploading' || job.status === 'generating') && (
                        <button
                            onClick={handleCancel}
                            className="btn btn-secondary"
                            style={{ padding: '6px', minWidth: 'auto' }}
                            title="Cancel"
                        >
                            <X size={14} />
                        </button>
                    )}
                    {job.status === 'failed' && (
                        <button
                            onClick={handleRetry}
                            className="btn btn-secondary"
                            style={{ padding: '6px', minWidth: 'auto' }}
                            title="Retry"
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    {job.status === 'completed' && (
                        <>
                            <button
                                onClick={handleDownload}
                                className="btn btn-secondary"
                                style={{ padding: '6px', minWidth: 'auto' }}
                                title="Download"
                            >
                                <Download size={14} />
                            </button>
                            <button
                                onClick={handleShare}
                                className="btn btn-secondary"
                                style={{ padding: '6px', minWidth: 'auto' }}
                                title="Share"
                            >
                                <Share2 size={14} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="btn btn-secondary"
                        style={{ padding: '6px', minWidth: 'auto' }}
                        title={expanded ? 'Hide Logs' : 'Show Logs'}
                    >
                        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                </div>
            </div>

            {/* Progress Bar */}
            {(job.status === 'uploading' || job.status === 'generating') && (
                <div style={{
                    height: '4px',
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '8px'
                }}>
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${job.progress}%` }}
                        style={{
                            height: '100%',
                            background: 'var(--accent)',
                            borderRadius: '2px'
                        }}
                    />
                </div>
            )}

            {/* Error Message */}
            {job.status === 'failed' && job.error && (
                <div style={{
                    padding: '8px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: 'var(--error)',
                    marginBottom: '8px'
                }}>
                    {job.error}
                </div>
            )}

            {/* Logs (Expandable) */}
            <AnimatePresence>
                {expanded && job.logs.length > 0 && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            maxHeight: '150px',
                            overflowY: 'auto',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.75rem',
                            lineHeight: '1.5'
                        }}>
                            {job.logs.slice(-20).map((log, i) => (
                                <div key={i} style={{ color: 'var(--text-secondary)' }}>
                                    {log}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

/**
 * Job Queue Panel
 */
export default function JobQueuePanel({ collapsed = false, onToggle }: JobQueuePanelProps) {
    // Get jobs directly from state to avoid selector issues
    const jobsRecord = useJobQueue((s) => s.jobs);
    const clearFinishedJobs = useJobQueue((s) => s.clearFinishedJobs);

    // Memoize derived values to prevent infinite loops
    const jobs = useMemo(() =>
        Object.values(jobsRecord).sort((a, b) => b.createdAt - a.createdAt),
        [jobsRecord]
    );

    const counts = useMemo(() => {
        const jobsList = Object.values(jobsRecord);
        return {
            queued: jobsList.filter((j) => j.status === 'queued').length,
            running: jobsList.filter((j) => j.status === 'uploading' || j.status === 'generating').length,
            completed: jobsList.filter((j) => j.status === 'completed').length,
            failed: jobsList.filter((j) => j.status === 'failed').length,
            total: jobsList.length,
        };
    }, [jobsRecord]);

    if (jobs.length === 0) {
        return null;
    }

    return (
        <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            marginTop: '24px',
            overflow: 'hidden'
        }}>
            {/* Header */}
            <div
                onClick={onToggle}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '16px 20px',
                    cursor: onToggle ? 'pointer' : 'default',
                    borderBottom: collapsed ? 'none' : '1px solid var(--border)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Rocket size={20} color="var(--accent)" />
                    <span style={{ fontWeight: 600 }}>Job Queue</span>

                    {/* Status Pills */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {counts.running > 0 && (
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                background: 'rgba(99, 102, 241, 0.2)',
                                color: 'var(--accent)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Loader2 size={10} className="animate-spin" />
                                {counts.running} running
                            </span>
                        )}
                        {counts.queued > 0 && (
                            <span style={{
                                fontSize: '0.75rem',
                                padding: '2px 8px',
                                background: 'rgba(255,255,255,0.05)',
                                color: 'var(--text-secondary)',
                                borderRadius: '10px'
                            }}>
                                {counts.queued} queued
                            </span>
                        )}
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(counts.completed > 0 || counts.failed > 0) && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                clearFinishedJobs();
                            }}
                            className="btn btn-secondary"
                            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                        >
                            <Trash2 size={12} /> Clear Finished
                        </button>
                    )}
                    {onToggle && (
                        <div style={{ color: 'var(--text-secondary)' }}>
                            {collapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                        </div>
                    )}
                </div>
            </div>

            {/* Job List */}
            <AnimatePresence>
                {!collapsed && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{ padding: '12px 16px', maxHeight: '400px', overflowY: 'auto' }}>
                            <AnimatePresence mode="popLayout">
                                {jobs.map((job) => (
                                    <JobCard key={job.id} job={job} />
                                ))}
                            </AnimatePresence>

                            {jobs.length === 0 && (
                                <div style={{
                                    textAlign: 'center',
                                    padding: '24px',
                                    color: 'var(--text-secondary)',
                                    fontSize: '0.9rem'
                                }}>
                                    No jobs yet. Start your first generation!
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

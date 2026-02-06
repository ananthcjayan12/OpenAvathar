import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Terminal,
    ExternalLink,
    StopCircle,
    Info,
    Rocket,
    ChevronRight,
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { runpodApi } from '@/services/runpodApi';
import { logStream } from '@/services/logStream';

export default function DeployPage() {
    const navigate = useNavigate();
    const {
        apiKey,
        purpose,
        cloudType,
        gpuType,
        podId,
        setPodId,
        podStatus,
        setPodStatus,
        setUrls,
        logs,
        addLog
    } = useAppStore();

    const logEndRef = useRef<HTMLDivElement>(null);
    const deploymentStarted = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [deploymentStep, setDeploymentStep] = useState('Initializing...');

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Effect 1: Navigation guards (runs on mount and when apiKey/purpose change)
    useEffect(() => {
        if (!apiKey) {
            navigate('/');
            return;
        }
        if (!podId && !purpose) {
            navigate('/setup');
            return;
        }
    }, [apiKey, purpose, podId, navigate]);

    // Effect 2: Deployment (runs once on mount if no podId exists)
    useEffect(() => {
        if (deploymentStarted.current || podId || !purpose || podStatus !== 'idle') {
            return;
        }

        const startDeployment = async () => {
            deploymentStarted.current = true;

            console.log('[DeployPage] Starting new deployment...');
            try {
                // Validate purpose
                if (!purpose) {
                    setError('No purpose selected');
                    setPodStatus('failed');
                    return;
                }

                // Clear old logs
                const { clearLogs } = useAppStore.getState();
                clearLogs();

                setPodStatus('deploying');
                setDeploymentStep('Requesting GPU Pod from RunPod...');

                const TEMPLATES = {
                    'wan2.2': '6au21jp9c9',
                    'infinitetalk': 'qvidd7ityi',
                } as const;

                const templateId = TEMPLATES[purpose];
                const pod = await runpodApi.deployPod(apiKey!, {
                    name: `OpenAvathar-${purpose}-${Date.now().toString().slice(-4)}`,
                    templateId,
                    gpuTypeId: gpuType || 'NVIDIA GeForce RTX 4090',
                    gpuCount: 1,
                    cloudType,
                });

                console.log('[DeployPage] Pod created successfully:', pod.id);
                addLog(`[SYSTEM] New Pod created: ${pod.id}`);
                setPodId(pod.id);
            } catch (err: any) {
                console.error('[DeployPage] Deployment error:', err);
                setError(err.message || 'Failed to deploy pod');
                setPodStatus('failed');
            }
        };

        startDeployment();
    }, []); // Empty deps - only run once on mount

    // Effect 3: Monitoring (reacts to podId changes)
    useEffect(() => {
        if (!podId || !apiKey || podStatus === 'running') {
            return;
        }

        console.log('[DeployPage] Initializing monitor for:', podId);
        setDeploymentStep('Waiting for container to start...');

        const MAX_POLL_ATTEMPTS = 60; // 5 minutes
        let attempts = 0;

        const pollInterval = window.setInterval(async () => {
            attempts++;
            if (attempts > MAX_POLL_ATTEMPTS) {
                clearInterval(pollInterval);
                setError('Deployment timed out after 5 minutes');
                setPodStatus('failed');
                return;
            }

            try {
                console.log('[DeployPage] Polling status for:', podId, `(attempt ${attempts}/${MAX_POLL_ATTEMPTS})`);
                const status = await runpodApi.getPodStatus(apiKey, podId);

                if (status.desiredStatus === 'RUNNING' && status.runtime) {
                    console.log('[DeployPage] Pod is RUNNING, checking services...');
                    const comfyUrl = `https://${podId}-8188.proxy.runpod.net`;
                    const logUrl = `https://${podId}-8001.proxy.runpod.net`;
                    setUrls(comfyUrl, logUrl);

                    setPodStatus('running');
                    setDeploymentStep('Pod is Ready!');
                    clearInterval(pollInterval);

                    logStream.connect(podId, (line) => addLog(line));
                }
            } catch (err: any) {
                console.error('[DeployPage] Polling error:', err);
                if (err.response?.status === 404 || err.message?.includes('not found')) {
                    clearInterval(pollInterval);
                    setPodId(null);
                    setPodStatus('idle');
                    setError('Pod no longer exists.');
                }
            }
        }, 5000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [podId, apiKey]); // React to podId changes

    const handleStop = async () => {
        if (!podId || !apiKey) return;

        const confirmStop = window.confirm('Are you sure you want to stop and terminate this pod? You will lose any unsaved progress and billing will stop.');
        if (!confirmStop) return;

        try {
            await runpodApi.terminatePod(apiKey, podId);
            setPodId(null);
            setPodStatus('idle');
            navigate('/setup');
        } catch (err: any) {
            alert('Failed to terminate pod: ' + err.message);
        }
    };

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: '1400px' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Terminal /> GPU Pod Management
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        {podId ? `Pod ID: ${podId}` : 'Initializing deployment...'}
                    </p>
                </div>

                {podStatus === 'running' && (
                    <button onClick={handleStop} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)' }}>
                        <StopCircle size={18} /> Terminate Pod
                    </button>
                )}
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 400px',
                gap: '30px',
                height: 'calc(100vh - 200px)', // Adjust based on header height
                minHeight: '400px'
            }}>
                {/* Left Column: Log Viewer */}
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                    <div className="card glass" style={{
                        flexGrow: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0',
                        overflow: 'hidden'
                    }}>
                        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <ChevronRight size={16} color="var(--accent)" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Live Logs</span>
                        </div>
                        <div style={{
                            flexGrow: 1,
                            background: '#0a0a0c',
                            padding: '20px',
                            fontFamily: '"Fira Code", monospace',
                            fontSize: '0.85rem',
                            lineHeight: '1.6',
                            overflowY: 'auto',
                            color: '#d1d1d1'
                        }}>
                            {logs.length === 0 ? (
                                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Waiting for logs...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} style={{ marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
                                        <span style={{ color: 'var(--accent)', marginRight: '8px' }}>&gt;</span>
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Status Card */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="card glass" style={{ padding: '30px', textAlign: 'center' }}>
                        <div style={{ width: '80px', height: '80px', margin: '0 auto 24px', position: 'relative' }}>
                            <AnimatePresence mode="wait">
                                {podStatus === 'idle' || podStatus === 'deploying' ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 1.2, opacity: 0 }}
                                        style={{ width: '100%', height: '100%' }}
                                    >
                                        <Loader2 size={80} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                    </motion.div>
                                ) : podStatus === 'running' ? (
                                    <motion.div
                                        key="running"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                                    >
                                        <CheckCircle2 size={40} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="failed"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}
                                    >
                                        <AlertTriangle size={40} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{deploymentStep}</h3>
                        {error && (
                            <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</p>
                        )}
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
                            {podStatus === 'deploying' ? 'This typically takes 2-3 minutes.' : podStatus === 'running' ? 'All systems operational.' : 'There was an issue spinning up your pod.'}
                        </p>

                        {podStatus === 'running' && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="btn btn-primary"
                                onClick={() => navigate('/generate')}
                                style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '1.1rem' }}
                            >
                                Go to Generator <Rocket size={20} />
                            </motion.button>
                        )}

                        {podStatus === 'failed' && (
                            <button onClick={() => window.location.reload()} className="btn btn-primary" style={{ width: '100%' }}>
                                Retry Deployment
                            </button>
                        )}
                    </div>

                    {/* Quick Links Card */}
                    {podStatus === 'running' && (
                        <div className="card glass animate-fade-in" style={{ padding: '24px' }}>
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Service Endpoints</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <a href={`https://${podId}-8188.proxy.runpod.net`} target="_blank" rel="noopener noreferrer" className="glass" style={{ padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'white', fontSize: '0.9rem' }}>
                                    <span>ComfyUI Interface</span>
                                    <ExternalLink size={14} color="var(--accent)" />
                                </a>
                                <a href={`https://${podId}-8001.proxy.runpod.net`} target="_blank" rel="noopener noreferrer" className="glass" style={{ padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'white', fontSize: '0.9rem' }}>
                                    <span>Log Server GUI</span>
                                    <ExternalLink size={14} color="var(--accent)" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="card glass" style={{ padding: '24px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Info size={20} color="var(--accent)" style={{ flexShrink: 0 }} />
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Pod Billing</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    Your pod is billed while RUNNING. Remember to terminate it when you're finished to stop further charges.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


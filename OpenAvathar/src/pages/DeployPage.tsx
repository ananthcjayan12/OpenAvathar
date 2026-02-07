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
        activePodId,
        pods,
        addPod,
        updatePod,
        removePod,
        logs,
        addLog,
        clearLogs
    } = useAppStore();

    const activePod = activePodId ? pods[activePodId] : null;
    const podId = activePod?.id || null;
    const podStatus = activePod?.status || 'idle';

    const logEndRef = useRef<HTMLDivElement>(null);
    const deploymentStarted = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const [deploymentStep, setDeploymentStep] = useState('Initializing...');

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Effect 1: Navigation guards
    useEffect(() => {
        if (!apiKey) {
            navigate('/');
            return;
        }
        // If we have a running pod for this purpose, we can stay here or go to generate
        // But for now, if no purpose and no active pod, go back
        if (!activePodId && !purpose) {
            navigate('/setup');
            return;
        }
    }, [apiKey, purpose, activePodId, navigate]);

    // Effect 2: Deployment
    useEffect(() => {
        if (deploymentStarted.current || activePodId || !purpose || podStatus !== 'idle') {
            return;
        }

        const startDeployment = async () => {
            deploymentStarted.current = true;

            console.log('[DeployPage] Starting new deployment...');
            try {
                // Validate purpose
                if (!purpose) {
                    setError('No purpose selected');
                    // We don't have a pod yet to set status on
                    return;
                }

                // Clear old logs
                useAppStore.getState().clearLogs();

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

                // Add the new pod to the store
                addPod({
                    id: pod.id,
                    name: `OpenAvathar-${purpose}`,
                    purpose: purpose,
                    status: 'deploying',
                    comfyuiUrl: null,
                    logServerUrl: null,
                    gpuType: gpuType || 'NVIDIA GeForce RTX 4090',
                    createdAt: Date.now(),
                    lastUsedAt: Date.now()
                });
            } catch (err: any) {
                console.error('[DeployPage] Deployment error:', err);
                setError(err.message || 'Failed to deploy pod');
                // Since we didn't even create the pod in the store yet, we just show error
            }
        };

        startDeployment();
    }, []);

    // Effect 3: Monitoring
    useEffect(() => {
        if (!activePodId || !apiKey || podStatus === 'running') {
            return;
        }

        console.log('[DeployPage] Initializing monitor for:', activePodId);
        setDeploymentStep('Waiting for container to start...');

        const MAX_POLL_ATTEMPTS = 60; // 5 minutes
        let attempts = 0;

        const pollInterval = window.setInterval(async () => {
            attempts++;
            if (attempts > MAX_POLL_ATTEMPTS) {
                clearInterval(pollInterval);
                setError('Deployment timed out after 5 minutes');
                updatePod(activePodId, { status: 'failed' });
                return;
            }

            try {
                console.log('[DeployPage] Polling status for:', activePodId, `(attempt ${attempts}/${MAX_POLL_ATTEMPTS})`);
                const status = await runpodApi.getPodStatus(apiKey, activePodId);

                if (status.desiredStatus === 'RUNNING' && status.runtime) {
                    console.log('[DeployPage] Pod is RUNNING, checking services...');
                    const comfyUrl = `https://${activePodId}-8188.proxy.runpod.net`;
                    const logUrl = `https://${activePodId}-8001.proxy.runpod.net`;

                    updatePod(activePodId, {
                        status: 'running',
                        comfyuiUrl: comfyUrl,
                        logServerUrl: logUrl
                    });

                    setDeploymentStep('Pod is Ready!');
                    clearInterval(pollInterval);

                    logStream.connect(activePodId, (line) => addLog(line));
                }
            } catch (err: any) {
                console.error('[DeployPage] Polling error:', err);
                if (err.response?.status === 404 || err.message?.includes('not found')) {
                    clearInterval(pollInterval);
                    removePod(activePodId);
                    setError('Pod no longer exists.');
                }
            }
        }, 5000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [activePodId, apiKey, podStatus]);

    const handleStop = async () => {
        if (!activePodId || !apiKey) return;

        const confirmStop = window.confirm('Are you sure you want to stop and terminate this pod? You will lose any unsaved progress and billing will stop.');
        if (!confirmStop) return;

        try {
            await runpodApi.terminatePod(apiKey, activePodId);
            removePod(activePodId);
            navigate('/setup');
        } catch (err: any) {
            alert('Failed to terminate pod: ' + err.message);
        }
    };

    return (
        <div className="container" style={{ padding: '40px 20px', maxWidth: '1400px' }}>
            <header className="flex-between flex-col-mobile gap-4" style={{ marginBottom: '32px', alignItems: 'flex-end' }}>
                <div style={{ width: '100%' }}>
                    <h1 className="text-gradient" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Terminal /> GPU Pod Management
                    </h1>
                    <p className="text-secondary">
                        {podId ? `Pod ID: ${podId}` : 'Initializing deployment...'}
                    </p>
                </div>

                {podStatus === 'running' && (
                    <button onClick={handleStop} className="btn btn-secondary" style={{ color: 'var(--error)', borderColor: 'rgba(239,68,68,0.3)' }}>
                        <StopCircle size={18} /> Terminate Pod
                    </button>
                )}
            </header>

            <div className="grid-responsive" style={{
                display: 'grid',
                gridTemplateColumns: '1fr 400px',
                gap: '24px',
                alignItems: 'start'
            }}>
                <style>{`
                    @media (max-width: 960px) {
                        .grid-responsive { grid-template-columns: 1fr !important; }
                    }
                `}</style>

                {/* Left Column: Log Viewer */}
                <div style={{ minWidth: 0 }}>
                    <div className="card glass" style={{
                        height: '600px',
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '0',
                        overflow: 'hidden',
                        background: '#09090b', // Deep black for better contrast
                        border: '1px solid var(--border)'
                    }}>
                        <div style={{
                            padding: '10px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div className="flex-center gap-2">
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444' }}></div>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b' }}></div>
                                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }}></div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginLeft: '8px' }}>LIVE LOGS</span>
                            </div>
                            <button
                                onClick={() => clearLogs()}
                                className="btn-icon"
                                style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 8px' }}
                            >
                                <Terminal size={12} /> Clear
                            </button>
                        </div>
                        <div style={{
                            flexGrow: 1,
                            padding: '20px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.85rem',
                            lineHeight: '1.6',
                            overflowY: 'auto',
                            color: '#e2e8f0',
                            wordBreak: 'break-word',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {logs.length === 0 ? (
                                <div style={{ color: 'var(--text-tertiary)', fontStyle: 'italic', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                                    <Loader2 className="animate-spin" style={{ marginBottom: '16px', opacity: 0.5 }} />
                                    <span>Waiting for logs stream...</span>
                                </div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} style={{
                                        marginBottom: '4px',
                                        borderLeft: log.includes('ERROR') || log.includes('Exception') ? '3px solid var(--error)' : '3px solid transparent',
                                        paddingLeft: '12px',
                                        color: log.includes('ERROR') ? '#fca5a5' : log.includes('warning') ? '#fcd34d' : 'inherit'
                                    }}>
                                        <span style={{ color: 'var(--text-tertiary)', marginRight: '12px', userSelect: 'none', fontSize: '0.7rem' }}>
                                            {new Date().toLocaleTimeString()}
                                        </span>
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Status Card */}
                <div className="flex-col gap-4">
                    <div className="card glass-panel" style={{ padding: '32px', textAlign: 'center', background: 'var(--bg-secondary)' }}>
                        <div style={{ width: '100px', height: '100px', margin: '0 auto 24px', position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                            {/* Animated Status Rings */}
                            <AnimatePresence mode="wait">
                                {podStatus === 'idle' || podStatus === 'deploying' ? (
                                    <motion.div
                                        key="loading"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        style={{ position: 'relative', width: '100%', height: '100%' }}
                                    >
                                        <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--bg-tertiary)', borderRadius: '50%' }}></div>
                                        <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--accent)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1.5s linear infinite' }}></div>
                                        <Loader2 size={40} className="animate-spin" style={{ position: 'absolute', top: '30px', left: '30px', color: 'var(--accent)' }} />
                                    </motion.div>
                                ) : podStatus === 'running' ? (
                                    <motion.div
                                        key="running"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', boxShadow: '0 0 30px rgba(16, 185, 129, 0.2)' }}
                                    >
                                        <CheckCircle2 size={50} />
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="failed"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }}
                                    >
                                        <AlertTriangle size={50} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>{deploymentStep}</h3>
                        {error && (
                            <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '16px', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '8px' }}>{error}</p>
                        )}
                        <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '24px' }}>
                            {podStatus === 'deploying' ? 'This typically takes 2-3 minutes. Grab a coffee.' : podStatus === 'running' ? 'All systems operational.' : 'There was an issue spinning up your pod.'}
                        </p>

                        {podStatus === 'running' && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="btn btn-primary"
                                onClick={() => navigate('/generate')}
                                style={{ width: '100%', padding: '16px', justifyContent: 'center', fontSize: '1.1rem' }}
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
                            <h4 style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', fontWeight: 600 }}>External Endpoints</h4>
                            <div className="flex-col gap-2">
                                <a href={`https://${podId}-8188.proxy.runpod.net`} target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.9rem', transition: 'background 0.2s' }}>
                                    <span>ComfyUI Interface</span>
                                    <ExternalLink size={14} color="var(--accent)" />
                                </a>
                                <a href={`https://${podId}-8001.proxy.runpod.net`} target="_blank" rel="noopener noreferrer" className="glass-panel" style={{ padding: '12px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                                    <span>Log Server GUI</span>
                                    <ExternalLink size={14} color="var(--accent)" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Info Card */}
                    <div className="card glass-panel" style={{ padding: '20px', background: 'rgba(56, 189, 248, 0.05)', border: '1px solid rgba(56, 189, 248, 0.1)' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <Info size={20} color="var(--accent)" style={{ flexShrink: 0, marginTop: '2px' }} />
                            <div>
                                <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '4px' }}>Billing Active</h4>
                                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                                    Your pod is billed while RUNNING. Terminate it when finished to stop charges.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

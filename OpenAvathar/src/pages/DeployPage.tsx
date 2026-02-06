import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Rocket,
    Terminal,
    ExternalLink,
    StopCircle,
    CheckCircle2,
    AlertTriangle,
    Loader2,
    Server,
    Activity
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
        setPodStatus,
        podStatus,
        setUrls,
        addLog,
        logs,
        clearLogs,
        reset
    } = useAppStore();

    const [error, setError] = useState<string | null>(null);
    const [deploymentStep, setDeploymentStep] = useState<string>('Initializing');
    const logEndRef = useRef<HTMLDivElement>(null);
    const deploymentStarted = useRef(false);

    // Auto-scroll logs
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        // If no API key, redirect to login
        if (!apiKey) {
            navigate('/');
            return;
        }

        // If no podId and no purpose, redirect to setup
        if (!podId && !purpose) {
            navigate('/setup');
            return;
        }

        let isMounted = true;
        let pollInterval: number | null = null;

        const startDeployment = async () => {
            deploymentStarted.current = true;
            try {
                setPodStatus('deploying');
                setDeploymentStep('Requesting GPU Pod from RunPod...');

                const templateId = purpose === 'wan2.2' ? '6au21jp9c9' : 'qvidd7ityi';
                const pod = await runpodApi.deployPod(apiKey, {
                    name: `OpenAvathar-${purpose}-${Date.now().toString().slice(-4)}`,
                    templateId,
                    gpuTypeId: gpuType || 'NVIDIA GeForce RTX 4090',
                    gpuCount: 1,
                    cloudType,
                });

                if (!isMounted) return;
                setPodId(pod.id);
                addLog(`[SYSTEM] New Pod created: ${pod.id}`);
                monitorPod(pod.id);
            } catch (err: any) {
                if (isMounted) {
                    setError(err.message || 'Failed to deploy pod');
                    setPodStatus('failed');
                }
            }
        };

        const monitorPod = (id: string) => {
            setDeploymentStep('Waiting for container to start...');

            pollInterval = window.setInterval(async () => {
                try {
                    const status = await runpodApi.getPodStatus(apiKey, id);
                    if (!isMounted) return;

                    if (status.desiredStatus === 'RUNNING' && status.runtime) {
                        const comfyUrl = `https://${id}-8188.proxy.runpod.net`;
                        const logUrl = `https://${id}-8001.proxy.runpod.net`;
                        setUrls(comfyUrl, logUrl);

                        // Note: Skipping log server readiness check due to CORS
                        // The server will be available shortly after pod starts
                        setPodStatus('running');
                        setDeploymentStep('Pod is Ready!');
                        if (pollInterval) clearInterval(pollInterval);

                        // Connect to log stream (will auto-reconnect if not ready)
                        logStream.connect(id, (line) => addLog(line));
                    }
                } catch (err: any) {
                    console.error('Polling error:', err);
                }
            }, 5000);
        };

        console.log('[DeployPage] Debug:', { podId, podStatus, purpose, apiKey: !!apiKey, deploymentStarted: deploymentStarted.current });

        if (podId) {
            // Already have a pod (from resume or persistence), just monitor it
            console.log('[DeployPage] Resuming pod:', podId);
            setPodStatus('deploying');
            addLog(`[SYSTEM] Resuming pod: ${podId}`);
            monitorPod(podId);
        } else if (!deploymentStarted.current && podStatus === 'idle') {
            console.log('[DeployPage] Starting new deployment');
            startDeployment();
        }

        return () => {
            isMounted = false;
            if (pollInterval) clearInterval(pollInterval);
        };
    }, []);

    const handleStop = async () => {
        if (!podId || !apiKey) return;

        const confirmStop = window.confirm('Are you sure you want to stop and terminate this pod? You will lose any unsaved progress and billing will stop.');

        if (confirmStop) {
            try {
                setPodStatus('stopping');
                await runpodApi.terminatePod(apiKey, podId);
                logStream.disconnect();
                reset();
                navigate('/setup');
            } catch (err: any) {
                alert('Failed to stop pod: ' + err.message);
            }
        }
    };

    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '1200px' }}>
            <header style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Server className={podStatus === 'running' ? 'text-gradient' : ''} />
                        GPU Pod Management
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '30px' }}>
                {/* Left Column: Log Viewer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="card glass" style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: '500px', padding: 0, overflow: 'hidden' }}>
                        <div style={{ padding: '12px 20px', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                                <Terminal size={16} /> Live Logs
                            </div>
                            {logStream.isConnected() && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--success)' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 10px var(--success)' }}></span>
                                    Connected
                                </div>
                            )}
                        </div>
                        <div style={{
                            padding: '20px',
                            flexGrow: 1,
                            overflowY: 'auto',
                            fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                            fontSize: '0.85rem',
                            lineHeight: '1.6',
                            color: '#d1d5db',
                            background: '#0a0f1a'
                        }}>
                            {logs.length === 0 ? (
                                <div style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>Waiting for logs...</div>
                            ) : (
                                logs.map((log, i) => (
                                    <div key={i} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                                        <span style={{ color: 'var(--accent)', marginRight: '8px' }}>&gt;</span>
                                        {log}
                                    </div>
                                ))
                            )}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Status & Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    {/* Main Status Card */}
                    <div className="card glass" style={{ padding: '30px', textAlign: 'center' }}>
                        <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
                            <AnimatePresence mode="wait">
                                {podStatus === 'deploying' ? (
                                    <motion.div
                                        key="deploying"
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        exit={{ scale: 0.8, opacity: 0 }}
                                        style={{ width: '100%', height: '100%', borderRadius: '50%', border: '2px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        <Loader2 size={40} className="animate-spin" color="var(--accent)" />
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
                                <a
                                    href={`https://${podId}-8188.proxy.runpod.net`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="glass"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', textDecoration: 'none', color: 'white', borderRadius: '8px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Activity size={16} color="var(--accent)" />
                                        <span>ComfyUI Interface</span>
                                    </div>
                                    <ExternalLink size={14} color="var(--text-secondary)" />
                                </a>
                                <a
                                    href={`https://${podId}-8001.proxy.runpod.net`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="glass"
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', textDecoration: 'none', color: 'white', borderRadius: '8px' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        <Terminal size={16} color="var(--accent)" />
                                        <span>Raw Log Stream</span>
                                    </div>
                                    <ExternalLink size={14} color="var(--text-secondary)" />
                                </a>
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', padding: '16px', fontSize: '0.9rem', display: 'flex', gap: '10px' }}>
                            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

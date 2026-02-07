import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { ChevronLeft, Terminal, Rocket, Power, ExternalLink } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { runpodApi } from '@/services/runpodApi';
import { logStream } from '@/services/logStream';

export default function PodDetailPage() {
    const { podId } = useParams();
    const navigate = useNavigate();
    const { pods, apiKey, updatePod, removePod, addLog, logs, clearLogs } = useAppStore();
    const logEndRef = useRef<HTMLDivElement>(null);
    const [isPolling, setIsPolling] = useState(false);

    const pod = podId ? pods[podId] : null;

    // Effect 1: Scroll logs to bottom
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    // Effect 2: Connect to log stream
    useEffect(() => {
        if (!podId) return;

        console.log('[PodDetailPage] Connecting to log stream for:', podId);
        logStream.connect(podId, (line) => addLog(line));

        return () => {
            console.log('[PodDetailPage] Disconnecting log stream');
            logStream.disconnect();
        };
    }, [podId, addLog]);

    // Effect 3: Poll for status if not running
    useEffect(() => {
        if (!podId || !apiKey || !pod) return;
        if (pod.status === 'running') {
            setIsPolling(false);
            return;
        }

        setIsPolling(true);
        console.log('[PodDetailPage] Starting status polling for:', podId);

        const pollInterval = setInterval(async () => {
            try {
                const status = await runpodApi.getPodStatus(apiKey, podId);
                console.log('[PodDetailPage] Poll result:', status);

                if (status.desiredStatus === 'RUNNING' && status.runtime) {
                    const comfyUrl = `https://${podId}-8188.proxy.runpod.net`;
                    const logUrl = `https://${podId}-8001.proxy.runpod.net`;

                    updatePod(podId, {
                        status: 'running',
                        comfyuiUrl: comfyUrl,
                        logServerUrl: logUrl
                    });

                    addLog('[SYSTEM] Pod is now running!');
                    clearInterval(pollInterval);
                    setIsPolling(false);
                } else if (status.desiredStatus === 'TERMINATED' || status.desiredStatus === 'EXITED') {
                    removePod(podId);
                    clearInterval(pollInterval);
                    setIsPolling(false);
                    navigate('/dashboard');
                }
            } catch (err: any) {
                console.error('[PodDetailPage] Poll error:', err);
                if (err.message?.includes('not found') || err.response?.status === 404) {
                    removePod(podId);
                    clearInterval(pollInterval);
                    navigate('/dashboard');
                }
            }
        }, 5000);

        return () => {
            clearInterval(pollInterval);
        };
    }, [podId, apiKey, pod?.status, updatePod, addLog, removePod, navigate]);

    if (!pod) {
        return (
            <div className="container" style={{ padding: '40px', textAlign: 'center' }}>
                <h2>Pod not found</h2>
                <button onClick={() => navigate('/dashboard')} className="btn-secondary" style={{ marginTop: '20px' }}>
                    Back to Dashboard
                </button>
            </div>
        );
    }

    const handleTerminate = async () => {
        if (!apiKey) return;
        if (!window.confirm('Are you sure you want to terminate this pod? Billing will stop and all unsaved data will be lost.')) return;

        try {
            await runpodApi.terminatePod(apiKey, pod.id);
            removePod(pod.id);
            navigate('/dashboard');
        } catch (err: any) {
            alert('Failed to terminate: ' + err.message);
        }
    };

    return (
        <div className="container" style={{ maxWidth: '1200px', margin: '0 auto', padding: '20px' }}>
            <button
                onClick={() => navigate('/dashboard')}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', padding: '8px 16px', borderRadius: '8px' }}
            >
                <ChevronLeft size={18} />
                <span>Back to Dashboard</span>
            </button>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px' }}>
                {/* Left Column: Logs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                        background: 'rgba(0,0,0,0.3)',
                        border: '1px solid var(--border)',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '600px'
                    }}>
                        <div style={{
                            padding: '12px 20px',
                            background: 'rgba(255,255,255,0.05)',
                            borderBottom: '1px solid var(--border)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Terminal size={18} color="var(--accent)" />
                                <span style={{ fontWeight: 600 }}>Provisioning Logs</span>
                            </div>
                            <button onClick={clearLogs} style={{ fontSize: '0.8rem', opacity: 0.6 }}>Clear</button>
                        </div>
                        <div style={{
                            padding: '16px',
                            overflowY: 'auto',
                            flexGrow: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            color: '#a1a1aa'
                        }}>
                            {logs.map((log, i) => (
                                <div key={i} style={{ marginBottom: '4px', wordBreak: 'break-all' }}>
                                    <span style={{ color: 'var(--accent)', marginRight: '8px' }}>&gt;</span>
                                    {log}
                                </div>
                            ))}
                            {logs.length === 0 && <div style={{ opacity: 0.3 }}>Waiting for logs...</div>}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                </div>

                {/* Right Column: Info & Controls */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '16px', padding: '24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: 'var(--gradient-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <Rocket size={20} color="white" style={{ margin: 'auto' }} />
                            </div>
                            <div>
                                <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{pod.name}</h3>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: pod.status === 'running' ? '#10b981' : '#f59e0b'
                                    }} />
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7, textTransform: 'capitalize' }}>{pod.status}</span>
                                    {isPolling && <span style={{ fontSize: '0.7rem', opacity: 0.5, marginLeft: '4px' }}>(monitoring...)</span>}
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ opacity: 0.6 }}>Purpose</span>
                                <span style={{ fontWeight: 600 }}>{pod.purpose}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ opacity: 0.6 }}>GPU Type</span>
                                <span style={{ fontWeight: 600 }}>{pod.gpuType}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                <span style={{ opacity: 0.6 }}>ID</span>
                                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{pod.id}</span>
                            </div>
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {pod.status === 'running' && pod.comfyuiUrl && (
                                <a
                                    href={pod.comfyuiUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="btn-primary"
                                    style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', height: '44px', borderRadius: '12px' }}
                                >
                                    <ExternalLink size={18} />
                                    <span>Open ComfyUI</span>
                                </a>
                            )}
                            <button
                                onClick={handleTerminate}
                                style={{
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    border: '1px solid rgba(239, 68, 68, 0.2)',
                                    color: '#ef4444',
                                    height: '44px',
                                    borderRadius: '12px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px'
                                }}
                            >
                                <Power size={18} />
                                <span>Terminate Pod</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Rocket, Plus, Trash2, Terminal, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { runpodApi } from '@/services/runpodApi';

export default function DashboardPage() {
    const { pods, apiKey, activePodId, setActivePodId, updatePod, removePod } = useAppStore();
    const navigate = useNavigate();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const podList = Object.values(pods);

    // Effect: Poll all pods status every 30 seconds
    useEffect(() => {
        if (!apiKey) return;

        const refreshAllPods = async () => {
            setIsRefreshing(true);
            console.log('[DashboardPage] Refreshing all pods status...');

            try {
                const remotePods = await runpodApi.getPods(apiKey);
                const remotePodIds = new Set(remotePods.map((pod) => pod.id));
                const currentPods = Object.values(useAppStore.getState().pods);

                for (const pod of currentPods) {
                    if (!remotePodIds.has(pod.id)) {
                        removePod(pod.id);
                    }
                }

                for (const pod of currentPods) {
                    if (!remotePodIds.has(pod.id)) {
                        continue;
                    }

                    try {
                        const status = await runpodApi.getPodStatus(apiKey, pod.id);

                        if (status.desiredStatus === 'RUNNING' && status.runtime) {
                            if (pod.status !== 'running') {
                                updatePod(pod.id, {
                                    status: 'running',
                                    comfyuiUrl: `https://${pod.id}-8188.proxy.runpod.net`,
                                    logServerUrl: `https://${pod.id}-8001.proxy.runpod.net`
                                });
                            }
                        } else if (status.desiredStatus === 'TERMINATED' || status.desiredStatus === 'EXITED') {
                            removePod(pod.id);
                        } else if (!status.runtime && pod.status !== 'deploying') {
                            updatePod(pod.id, { status: 'deploying' });
                        }
                    } catch (err: any) {
                        if (err.message?.includes('not found') || err.response?.status === 404) {
                            removePod(pod.id);
                        } else {
                            console.error(`[DashboardPage] Error polling ${pod.id}:`, err);
                        }
                    }
                }
            } finally {
                setIsRefreshing(false);
            }
        };

        // Initial refresh on mount
        refreshAllPods();

        // Poll every 30 seconds
        const interval = setInterval(refreshAllPods, 30000);

        return () => clearInterval(interval);
    }, [apiKey, updatePod, removePod]);

    return (
        <div className="container app-page" style={{ maxWidth: '1100px' }}>
            <header style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                marginBottom: '60px',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '32px'
            }}>
                <div>
                    <h1 style={{
                        fontSize: 'clamp(2rem, 5vw, 2.8rem)',
                        fontWeight: 800,
                        marginBottom: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em'
                    }}>
                        Studio <span className="text-gradient">Dashboard</span>
                        {isRefreshing && <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent)', opacity: 0.6 }} />}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Manage and monitor your active AI instances</p>
                </div>
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate('/setup')}
                    className="btn btn-primary"
                    style={{ borderRadius: '16px', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                    <Plus size={20} strokeWidth={2.5} />
                    <span>Deploy New Pod</span>
                </motion.button>
            </header>

            {podList.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        padding: '16px 24px',
                        background: 'rgba(245, 158, 11, 0.05)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        borderRadius: '16px',
                        marginBottom: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        color: 'var(--text-secondary)',
                        fontSize: '0.95rem'
                    }}
                >
                    <div style={{
                        width: '32px',
                        height: '32px',
                        background: 'rgba(245, 158, 11, 0.1)',
                        borderRadius: '8px',
                        display: 'grid',
                        placeItems: 'center',
                        color: 'var(--warning)',
                        flexShrink: 0
                    }}>
                        <AlertTriangle size={18} />
                    </div>
                    <p>
                        <strong>Usage Tip:</strong> GPU instances are billed while running. Remember to <strong>terminate</strong> your pods when you're finished to stop the clock.
                    </p>
                </motion.div>
            )}

            {podList.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        background: 'rgba(255, 255, 255, 0.78)',
                        border: '2px dashed var(--border)',
                        borderRadius: '32px',
                        padding: '100px 20px',
                        textAlign: 'center',
                        backdropFilter: 'blur(8px)'
                    }}
                >
                    <div style={{
                        width: '80px',
                        height: '80px',
                        background: 'var(--bg-tertiary)',
                        borderRadius: '24px',
                        display: 'grid',
                        placeItems: 'center',
                        margin: '0 auto 24px',
                        color: 'var(--text-tertiary)'
                    }}>
                        <Rocket size={40} style={{ opacity: 0.5 }} />
                    </div>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>No active pods</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '400px', margin: '0 auto 32px' }}>
                        Your studio is currently offline. Deploy a GPU pod to start generating high-quality avatar videos.
                    </p>
                    <button onClick={() => navigate('/setup')} className="btn btn-primary" style={{ padding: '12px 32px' }}>
                        Get Started
                    </button>
                </motion.div>
            ) : (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '32px'
                }}>
                    {podList.map((pod) => (
                        <motion.div
                            key={pod.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ y: -5 }}
                            className="glass"
                            style={{
                                border: pod.id === activePodId ? '2px solid var(--accent)' : '1px solid var(--border)',
                                padding: '32px',
                                borderRadius: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px',
                                position: 'relative',
                                background: 'rgba(255, 255, 255, 0.9)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                        >
                            {pod.status === 'running' && (
                                <div style={{
                                    position: 'absolute',
                                    top: '32px',
                                    right: '32px',
                                    textAlign: 'right'
                                }}>
                                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>~$0.44/hr</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>Live Billing</div>
                                </div>
                            )}

                            {pod.id === activePodId && (
                                <div style={{
                                    position: 'absolute',
                                    top: '-12px',
                                    right: '24px',
                                    background: 'var(--accent)',
                                    color: 'white',
                                    padding: '4px 12px',
                                    borderRadius: '99px',
                                    fontSize: '0.7rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    Active Studio
                                </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: '10px',
                                    background: 'var(--bg-tertiary)',
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    color: 'var(--text-secondary)'
                                }}>
                                    {pod.purpose}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: pod.status === 'running' ? '60px' : 0 }}>
                                    <div style={{
                                        width: '10px',
                                        height: '10px',
                                        borderRadius: '50%',
                                        background: pod.status === 'running' ? '#10b981' : pod.status === 'failed' ? '#ef4444' : '#f59e0b',
                                        boxShadow: pod.status === 'running' ? '0 0 12px #10b981' : 'none'
                                    }} />
                                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                                        {pod.status}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>{pod.name}</h3>
                                <code style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>{pod.id}</code>
                            </div>

                            <div style={{ display: 'grid', gap: '12px', padding: '16px', background: 'rgba(0,0,0,0.02)', borderRadius: '16px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Hardware</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{pod.gpuType.replace('NVIDIA GeForce ', '')}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>Created</span>
                                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{new Date(pod.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                                {pod.status === 'running' && (
                                    <button
                                        onClick={() => {
                                            setActivePodId(pod.id);
                                            navigate('/studio');
                                        }}
                                        className="btn btn-primary"
                                        style={{ height: '48px', flexGrow: 1, borderRadius: '14px', fontSize: '1rem' }}
                                    >
                                        Open Studio
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/pods/pod/${pod.id}`)}
                                    className="btn btn-secondary"
                                    style={{ width: '48px', height: '48px', padding: 0, borderRadius: '14px', color: 'var(--text-secondary)' }}
                                    title="View Logs & Settings"
                                >
                                    <Terminal size={20} />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm(`Terminate pod ${pod.name}? This will stop the instance and you'll be charged for usage.`)) {
                                            try {
                                                await runpodApi.terminatePod(apiKey!, pod.id);
                                                removePod(pod.id);
                                            } catch (err) {
                                                console.error('Failed to terminate pod:', err);
                                                alert('Failed to terminate pod. It may have already been terminated.');
                                                removePod(pod.id); // Remove from UI anyway
                                            }
                                        }
                                    }}
                                    className="btn btn-secondary"
                                    style={{ width: '48px', height: '48px', padding: 0, borderRadius: '14px', color: '#ef4444', borderColor: '#fee2e2', background: '#fef2f2' }}
                                    title="Terminate pod"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

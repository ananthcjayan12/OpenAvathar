import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Rocket, Plus, Trash2, Terminal, RefreshCw } from 'lucide-react';
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
        if (!apiKey || podList.length === 0) return;

        const refreshAllPods = async () => {
            setIsRefreshing(true);
            console.log('[DashboardPage] Refreshing all pods status...');

            for (const pod of podList) {
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
                    } else if (status.desiredStatus === 'TERMINATED') {
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
            setIsRefreshing(false);
        };

        // Initial refresh on mount
        refreshAllPods();

        // Poll every 30 seconds
        const interval = setInterval(refreshAllPods, 30000);

        return () => clearInterval(interval);
    }, [apiKey, podList.length, updatePod, removePod]);

    return (
        <div className="container" style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px 20px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        Pod <span className="text-gradient">Dashboard</span>
                        {isRefreshing && <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--accent)', opacity: 0.6 }} />}
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Manage your ComfyUI instances</p>
                </div>
                <button
                    onClick={() => navigate('/setup')}
                    className="btn-primary"
                    style={{ borderRadius: '12px', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={20} />
                    <span>Deploy New Pod</span>
                </button>
            </header>

            {podList.length === 0 ? (
                <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px dashed var(--border)',
                    borderRadius: '24px',
                    padding: '80px 20px',
                    textAlign: 'center'
                }}>
                    <Rocket size={48} style={{ opacity: 0.2, marginBottom: '20px' }} />
                    <h3 style={{ marginBottom: '10px' }}>No pods found</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>
                        Deploy your first GPU pod to start generating videos.
                    </p>
                    <button onClick={() => navigate('/setup')} className="btn-primary">
                        Get Started
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
                    {podList.map((pod) => (
                        <motion.div
                            key={pod.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(255,255,255,0.05)',
                                border: pod.id === activePodId ? '2px solid var(--accent)' : '1px solid var(--border)',
                                borderRadius: '20px',
                                padding: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                boxShadow: pod.id === activePodId ? '0 0 30px var(--accent-glow)' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em'
                                }}>
                                    {pod.purpose}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        background: pod.status === 'running' ? '#10b981' : pod.status === 'failed' ? '#ef4444' : '#f59e0b'
                                    }} />
                                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                        {pod.status}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>{pod.name}</h3>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>ID: {pod.id}</p>
                            </div>

                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <span>GPU Type:</span>
                                    <span style={{ color: 'white' }}>{pod.gpuType}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Created:</span>
                                    <span style={{ color: 'white' }}>{new Date(pod.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div style={{ marginTop: 'auto', display: 'flex', gap: '12px' }}>
                                {pod.status === 'running' && (
                                    <button
                                        onClick={() => {
                                            setActivePodId(pod.id);
                                            navigate('/generate');
                                        }}
                                        className="btn-primary"
                                        style={{ height: '40px', flexGrow: 1, borderRadius: '10px' }}
                                    >
                                        Use Pod
                                    </button>
                                )}
                                <button
                                    onClick={() => navigate(`/dashboard/pod/${pod.id}`)}
                                    className="btn-secondary"
                                    style={{ height: '40px', padding: '0 12px', borderRadius: '10px' }}
                                    title="View Logs & Settings"
                                >
                                    <Terminal size={18} />
                                </button>
                                <button
                                    onClick={() => removePod(pod.id)}
                                    className="btn-secondary"
                                    style={{ width: '40px', height: '40px', padding: 0, borderRadius: '10px', color: 'var(--error)' }}
                                    title="Remove from dashboard"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
}

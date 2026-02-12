import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Video,
    Mic,
    Settings,
    Cpu,
    Shield,
    Globe,
    CheckCircle2,
    ChevronRight,
    Info
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { runpodApi } from '@/services/runpodApi';
import type { GPU, Purpose } from '@/types';

export default function SetupPage() {
    const navigate = useNavigate();
    const {
        apiKey,
        purpose,
        setPurpose,
        cloudType,
        setCloudType,
        setActivePodId,
        clearLogs
    } = useAppStore();

    const [availableGpus, setAvailableGpus] = useState<GPU[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Fetch available GPUs on mount
    useEffect(() => {
        async function fetchGpus() {
            if (!apiKey) return;
            try {
                const gpus = await runpodApi.getGpus(apiKey);
                // Filter for RTX 4090 as preferred, but keep others for display
                setAvailableGpus(gpus.filter(g => g.memoryInGb >= 16));
            } catch (error) {
                console.error('Failed to fetch GPUs:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchGpus();
    }, [apiKey]);

    const purposes = [
        {
            id: 'wan2.2' as Purpose,
            title: 'Wan 2.2 Video',
            description: 'Generate high-quality videos from a single image and text prompt.',
            icon: <Video size={24} />,
            features: ['Image-to-Video', 'Text Guidance', 'Multiple Formats']
        },
        {
            id: 'infinitetalk' as Purpose,
            title: 'InfiniteTalk',
            description: 'Create realistic talking head videos from a photo and an audio track.',
            icon: <Mic size={24} />,
            features: ['Lip Sync', 'Audio Driven', 'Portrait Mode']
        }
    ];

    return (
        <div className="container app-page" style={{ maxWidth: '1100px' }}>
            <header className="app-page-header flex-col-mobile">
                <div style={{ width: '100%' }}>
                    <motion.h1
                        className="text-gradient"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '8px' }}
                    >
                        Project Setup
                    </motion.h1>
                    <p className="text-secondary">Configure your generation engine and GPU pod.</p>
                </div>
                <div className="glass-panel hide-mobile" style={{ padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                    <Settings size={14} /> Step 2 of 4
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }} className="setup-grid">
                <style>{`
                    @media (min-width: 900px) {
                        .setup-grid { grid-template-columns: 1fr 340px !important; }
                    }
                `}</style>

                <div className="flex-col gap-4">
                    {/* Step 1: Purpose */}
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>1</span>
                            Select Purpose
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                            {purposes.map((p) => (
                                <motion.div
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    key={p.id}
                                    onClick={() => setPurpose(p.id)}
                                    className={`card glass ${purpose === p.id ? 'active' : ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        border: purpose === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        background: purpose === p.id ? 'var(--bg-secondary)' : 'rgba(255, 255, 255, 0.8)',
                                        position: 'relative',
                                        padding: '24px'
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: purpose === p.id ? 'var(--accent)' : 'var(--bg-tertiary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '16px',
                                        color: purpose === p.id ? 'white' : 'var(--text-secondary)'
                                    }}>
                                        {p.icon}
                                    </div>
                                    <h3 style={{ marginBottom: '8px', fontSize: '1.1rem' }}>{p.title}</h3>
                                    <p className="text-secondary" style={{ fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>{p.description}</p>
                                    <div className="flex-col gap-2">
                                        {p.features.map(f => (
                                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: purpose === p.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                <CheckCircle2 size={14} color={purpose === p.id ? 'var(--accent)' : 'var(--text-secondary)'} /> {f}
                                            </div>
                                        ))}
                                    </div>
                                    {purpose === p.id && (
                                        <div style={{ position: 'absolute', top: '16px', right: '16px', color: 'var(--accent)' }}>
                                            <CheckCircle2 size={24} />
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Summary & Launch */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 700 }}>2</span>
                            Cloud Infrastructure
                        </h2>

                        <div className="card glass" style={{ padding: '24px' }}>
                            <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '10px', marginBottom: '16px' }}>
                                <button
                                    onClick={() => setCloudType('SECURE')}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: cloudType === 'SECURE' ? 'var(--accent)' : 'transparent',
                                        color: cloudType === 'SECURE' ? 'white' : 'var(--text-secondary)',
                                        border: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <Shield size={16} /> Secure
                                </button>
                                <button
                                    onClick={() => setCloudType('COMMUNITY')}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: cloudType === 'COMMUNITY' ? 'var(--accent)' : 'transparent',
                                        color: cloudType === 'COMMUNITY' ? 'white' : 'var(--text-secondary)',
                                        border: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <Globe size={16} /> Community
                                </button>
                            </div>

                            <p className="text-secondary" style={{ fontSize: '0.85rem', display: 'flex', gap: '10px', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px' }}>
                                <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--accent)' }} />
                                {cloudType === 'SECURE'
                                    ? 'Enterprise-grade data centers with high reliability and verified GPU performance.'
                                    : 'Peer-to-peer decentralized cloud. Significantly lower costs, but variable availability.'}
                            </p>
                        </div>
                    </section>

                    <aside className="card glass" style={{ padding: '24px', position: 'sticky', top: '24px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem', fontWeight: 600 }}>Configuration Summary</h3>

                        <div className="flex-col gap-2" style={{ marginBottom: '24px' }}>
                            <div className="flex-between" style={{ fontSize: '0.9rem' }}>
                                <span className="text-secondary">Purpose</span>
                                <span style={{ fontWeight: 600 }}>{purpose ? purposes.find(p => p.id === purpose)?.title : 'Not Selected'}</span>
                            </div>
                            <div className="flex-between" style={{ fontSize: '0.9rem' }}>
                                <span className="text-secondary">Cloud</span>
                                <span style={{ fontWeight: 600 }}>{cloudType === 'SECURE' ? 'Secure' : 'Community'}</span>
                            </div>
                            <div className="flex-between" style={{ fontSize: '0.9rem' }}>
                                <span className="text-secondary">GPU Model</span>
                                <span style={{ fontWeight: 600 }}>RTX 4090 24GB</span>
                            </div>
                        </div>

                        <div style={{ background: 'var(--bg-tertiary)', padding: '16px', borderRadius: '12px', marginBottom: '24px', border: '1px solid var(--border)' }}>
                            <div className="flex-between" style={{ marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimated Cost</span>
                                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>$0.69<span style={{ fontSize: '0.8rem', fontWeight: 400 }}>/hr</span></span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pay-as-you-go. Billed by the minute.</p>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                // Reset state to ensure fresh deployment
                                setActivePodId(null);
                                clearLogs();
                                navigate('/deploy');
                            }}
                            disabled={!purpose}
                            style={{ width: '100%', padding: '16px', justifyContent: 'center' }}
                        >
                            Confirm & Launch <ChevronRight size={18} />
                        </button>

                        <div style={{ marginTop: '20px', padding: '0 4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.8rem', justifyContent: 'center' }}>
                                <Cpu size={14} />
                                <span>available: {isLoading ? '...' : availableGpus.filter(g => cloudType === 'SECURE' ? g.secureCloud : g.communityCloud).length} units</span>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

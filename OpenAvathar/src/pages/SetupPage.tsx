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
    Loader2,
    Info
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { runpodApi } from '@/services/runpodApi';
import type { GPU, Purpose, CloudType } from '@/types';

export default function SetupPage() {
    const navigate = useNavigate();
    const {
        apiKey,
        purpose,
        setPurpose,
        cloudType,
        setCloudType,
        gpuType,
        setGpuType
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
        <div className="container" style={{ padding: '60px 20px', maxWidth: '1000px' }}>
            <header style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <motion.h1
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '8px' }}
                    >
                        Project Setup
                    </motion.h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Configure your generation engine and GPU pod.</p>
                </div>
                <div className="glass" style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)' }}>
                    <Settings size={14} /> Step 2 of 4
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '40px', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
                    {/* Step 1: Purpose */}
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>1</span>
                            Select Purpose
                        </h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            {purposes.map((p) => (
                                <div
                                    key={p.id}
                                    onClick={() => setPurpose(p.id)}
                                    className={`card glass ${purpose === p.id ? 'active' : ''}`}
                                    style={{
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                        border: purpose === p.id ? '2px solid var(--accent)' : '1px solid var(--border)',
                                        background: purpose === p.id ? 'rgba(0, 180, 216, 0.05)' : 'var(--bg-secondary)',
                                        position: 'relative',
                                        padding: '24px'
                                    }}
                                >
                                    <div style={{
                                        width: '48px',
                                        height: '48px',
                                        borderRadius: '12px',
                                        background: purpose === p.id ? 'var(--accent)' : 'var(--border)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginBottom: '16px',
                                        color: purpose === p.id ? 'white' : 'var(--text-secondary)'
                                    }}>
                                        {p.icon}
                                    </div>
                                    <h3 style={{ marginBottom: '8px' }}>{p.title}</h3>
                                    <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{p.description}</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {p.features.map(f => (
                                            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: purpose === p.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                                <CheckCircle2 size={12} color={purpose === p.id ? 'var(--accent)' : 'var(--text-secondary)'} /> {f}
                                            </div>
                                        ))}
                                    </div>
                                    {purpose === p.id && (
                                        <div style={{ position: 'absolute', top: '12px', right: '12px', color: 'var(--accent)' }}>
                                            <CheckCircle2 size={20} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Step 2: Cloud Type */}
                    <section>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--accent)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>2</span>
                            Cloud Type
                        </h2>
                        <div className="glass" style={{ display: 'flex', padding: '6px', gap: '6px', background: 'var(--bg-secondary)' }}>
                            <button
                                onClick={() => setCloudType('SECURE')}
                                className="btn"
                                style={{
                                    flex: 1,
                                    background: cloudType === 'SECURE' ? 'var(--bg-primary)' : 'transparent',
                                    color: cloudType === 'SECURE' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    border: cloudType === 'SECURE' ? '1px solid var(--border)' : 'none'
                                }}
                            >
                                <Shield size={16} /> Secure Cloud
                            </button>
                            <button
                                onClick={() => setCloudType('COMMUNITY')}
                                className="btn"
                                style={{
                                    flex: 1,
                                    background: cloudType === 'COMMUNITY' ? 'var(--bg-primary)' : 'transparent',
                                    color: cloudType === 'COMMUNITY' ? 'white' : 'var(--text-secondary)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '8px',
                                    border: cloudType === 'COMMUNITY' ? '1px solid var(--border)' : 'none'
                                }}
                            >
                                <Globe size={16} /> Community Cloud
                            </button>
                        </div>
                        <p style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '8px' }}>
                            <Info size={14} style={{ flexShrink: 0 }} />
                            {cloudType === 'SECURE'
                                ? 'High reliability, enterprise-grade data centers. Verified GPUs only.'
                                : 'Peer-to-peer cloud. Lower cost, but availability depends on community providers.'}
                        </p>
                    </section>
                </div>

                {/* Sidebar Summary & Launch */}
                <aside style={{ position: 'sticky', top: '40px' }}>
                    <div className="card glass" style={{ padding: '24px' }}>
                        <h3 style={{ marginBottom: '20px', fontSize: '1.1rem' }}>Configuration Summary</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Purpose</span>
                                <span style={{ fontWeight: 600 }}>{purpose ? purposes.find(p => p.id === purpose)?.title : 'Not Selected'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Cloud</span>
                                <span style={{ fontWeight: 600 }}>{cloudType === 'SECURE' ? 'Secure' : 'Community'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>GPU</span>
                                <span style={{ fontWeight: 600 }}>RTX 4090 24GB</span>
                            </div>
                        </div>

                        <div style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', marginBottom: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Estimated Cost</span>
                                <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>$0.69/hr</span>
                            </div>
                            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Pay-as-you-go. Billed by the minute.</p>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={() => navigate('/deploy')}
                            disabled={!purpose}
                            style={{ width: '100%', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                            Confirm & Launch <ChevronRight size={18} />
                        </button>

                        {!purpose && (
                            <p style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--error)', textAlign: 'center' }}>
                                Please select a purpose to continue
                            </p>
                        )}
                    </div>

                    <div style={{ marginTop: '20px', padding: '0 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <Cpu size={14} />
                            <span>Available GPUs: {isLoading ? '...' : availableGpus.filter(g => cloudType === 'SECURE' ? g.secureCloud : g.communityCloud).length}</span>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    );
}

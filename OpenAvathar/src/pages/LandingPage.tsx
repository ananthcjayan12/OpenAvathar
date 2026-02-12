import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle, Sparkles, Check, ExternalLink } from 'lucide-react';
import { runpodApi } from '@/services/runpodApi';
import { useAppStore } from '@/stores/appStore';

export default function LandingPage() {
    const [keyInput, setKeyInput] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const navigate = useNavigate();
    const setApiKey = useAppStore((state) => state.setApiKey);
    const setValidated = useAppStore((state) => state.setValidated);

    const gumroadUrl = (import.meta.env.VITE_GUMROAD_URL as string | undefined) ?? '';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!keyInput.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const isValid = await runpodApi.validateApiKey(keyInput.trim());

            if (isValid) {
                setApiKey(keyInput.trim());
                setValidated(true);

                // Check for existing pods
                const pods = await runpodApi.getPods(keyInput.trim());
                const openAvatharPods = pods.filter(p =>
                    p.name.toLowerCase().startsWith('openavathar-') &&
                    p.desiredStatus !== 'TERMINATED'
                );

                if (openAvatharPods.length > 0) {
                    openAvatharPods.forEach(p => {
                        const purpose = p.name.toLowerCase().includes('wan2.2') ? 'wan2.2' : 'infinitetalk';

                        // Determine status based on desiredStatus and runtime
                        let status: 'idle' | 'deploying' | 'running' | 'stopping' | 'failed' = 'deploying';
                        if (p.desiredStatus === 'TERMINATED' || p.desiredStatus === 'EXITED') {
                            status = 'failed';
                        } else if (p.runtime && p.desiredStatus === 'RUNNING') {
                            status = 'running';
                        } else if (p.desiredStatus === 'RUNNING' && !p.runtime) {
                            status = 'deploying';
                        }

                        useAppStore.getState().addPod({
                            id: p.id,
                            name: p.name,
                            purpose: purpose as any,
                            status: status,
                            comfyuiUrl: p.id ? `https://${p.id}-8188.proxy.runpod.net` : null,
                            logServerUrl: p.id ? `https://${p.id}-8001.proxy.runpod.net` : null,
                            gpuType: 'NVIDIA GeForce RTX 4090',
                            createdAt: Date.now(),
                            lastUsedAt: Date.now()
                        });
                    });
                    navigate('/studio');
                } else {
                    navigate('/studio');
                }
            } else {
                setError('Invalid API Key. Please check and try again.');
            }
        } catch (err: any) {
            setError(err.message || 'Connection error. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh' }}>
            <div className="container" style={{ paddingTop: '52px', paddingBottom: '52px' }}>
                {/* Hero */}
                <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{ textAlign: 'center', maxWidth: '860px', margin: '0 auto 44px' }}
                >
                    <div style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        borderRadius: '999px',
                        background: 'rgba(99, 102, 241, 0.12)',
                        border: '1px solid rgba(99, 102, 241, 0.25)',
                        color: 'var(--text-secondary)',
                        fontSize: '0.9rem',
                        marginBottom: '16px'
                    }}>
                        <Sparkles size={16} />
                        Talking avatar studio • Bring your own GPU
                    </div>

                    <h1 className="text-gradient" style={{ fontSize: '3.1rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.05 }}>
                        OpenAvathar
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '1.15rem', marginTop: '10px' }}>
                        Generate talking avatar videos with your RunPod GPU — no infrastructure setup screens.
                    </p>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <a
                            href="#get-started"
                            className="btn btn-primary"
                            style={{ textDecoration: 'none' }}
                        >
                            Try Free <ArrowRight size={18} />
                        </a>
                        <a
                            className="btn btn-secondary"
                            href={gumroadUrl || undefined}
                            target="_blank"
                            rel="noreferrer"
                            style={{ textDecoration: 'none', pointerEvents: gumroadUrl ? 'auto' : 'none', opacity: gumroadUrl ? 1 : 0.6 }}
                            aria-disabled={!gumroadUrl}
                        >
                            Buy Pro $29 <ExternalLink size={16} />
                        </a>
                    </div>

                    <div style={{ marginTop: '14px', color: 'var(--text-secondary)', fontSize: '0.9rem', display: 'flex', justifyContent: 'center', gap: '14px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Check size={16} color="var(--success)" /> Free: 1 video/day</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Check size={16} color="var(--success)" /> Pro: unlimited</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><Check size={16} color="var(--success)" /> No accounts</span>
                    </div>
                </motion.div>

                {/* Pricing */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '18px', maxWidth: '980px', margin: '0 auto 44px' }}>
                    <div className="card glass" style={{ padding: '22px' }}>
                        <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Free</div>
                        <div style={{ marginTop: '6px', fontSize: '2rem', fontWeight: 900 }}>$0</div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Try the studio with a daily limit.</div>
                        <div style={{ marginTop: '14px', display: 'grid', gap: '8px', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--success)" /> 1 video / day</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--success)" /> Bring your own RunPod GPU</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--success)" /> No account required</div>
                        </div>
                    </div>
                    <div className="card glass" style={{ padding: '22px', borderColor: 'rgba(99, 102, 241, 0.35)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>Pro</div>
                            <div style={{
                                padding: '6px 10px',
                                borderRadius: '999px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.25)',
                                color: 'var(--text-secondary)',
                                fontSize: '0.85rem'
                            }}>
                                Lifetime
                            </div>
                        </div>
                        <div style={{ marginTop: '6px', fontSize: '2rem', fontWeight: 900 }}>$29</div>
                        <div style={{ color: 'var(--text-secondary)', marginTop: '6px' }}>Unlimited generations forever.</div>
                        <div style={{ marginTop: '14px', display: 'grid', gap: '8px', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--success)" /> Unlimited videos</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--success)" /> Activate up to 3 devices</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Check size={16} color="var(--success)" /> Keep using your RunPod account</div>
                        </div>
                    </div>
                </div>

                {/* Get Started (API key) */}
                <div id="get-started" className="card glass" style={{ padding: '26px', maxWidth: '980px', margin: '0 auto' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap', marginBottom: '14px' }}>
                        <div>
                            <h2 style={{ fontSize: '1.2rem', fontWeight: 900 }}>Enter Studio</h2>
                            <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                                Paste your RunPod API key to connect your GPU account.
                            </p>
                        </div>
                        <a
                            href="https://www.runpod.io/console/user/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                        >
                            Get a RunPod API key <ExternalLink size={16} />
                        </a>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-col gap-4">
                        <div className="flex-col gap-2">
                            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>
                                RunPod API Key
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Key size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    placeholder="Paste your API key here..."
                                    style={{
                                        width: '100%',
                                        padding: '16px 48px',
                                        fontSize: '1rem',
                                        border: error ? '1px solid var(--error)' : '1px solid var(--border)',
                                    }}
                                    className="glass-panel"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    className="btn-icon"
                                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }}
                                >
                                    {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', fontSize: '0.9rem', padding: '12px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                >
                                    <AlertCircle size={16} />
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading || !keyInput.trim()}
                            style={{ padding: '16px', fontSize: '1.05rem', marginTop: '4px' }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin" style={{ marginRight: '8px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-block' }}></span>
                                    Validating Key...
                                </>
                            ) : (
                                <>
                                    Enter Studio <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="flex-center" style={{ marginTop: '10px', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', opacity: 0.9 }}>
                            <ShieldCheck size={14} />
                            <span>Your key is stored locally in your browser and never sent to our servers.</span>
                        </div>
                    </form>

                    <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {!gumroadUrl ? (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', opacity: 0.9 }}>
                                Pro checkout link is not set yet (waiting for Gumroad). You can still test Free flow.
                            </div>
                        ) : <div />}
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="text-secondary"
                            style={{
                                background: 'none',
                                border: 'none',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                opacity: 0.75
                            }}
                        >
                            Clear cached data & restart
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

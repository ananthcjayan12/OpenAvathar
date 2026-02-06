import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, ArrowRight, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
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
                const activePod = pods.find(p =>
                    p.name.startsWith('OpenAvathar-') &&
                    p.desiredStatus !== 'TERMINATED'
                );

                if (activePod) {
                    useAppStore.getState().setPodId(activePod.id);
                    navigate('/deploy');
                } else {
                    navigate('/setup');
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
        <div className="container flex-center" style={{ minHeight: '100vh', padding: '40px 20px' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: '540px' }}
            >
                <div className="card glass" style={{ padding: '48px', position: 'relative', overflow: 'hidden' }}>
                    {/* Background Highlight */}
                    <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '200px', height: '200px', background: 'var(--accent)', opacity: 0.1, filter: 'blur(60px)', borderRadius: '50%' }}></div>

                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <motion.h1
                            className="text-gradient"
                            style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em', lineHeight: 1.1 }}
                        >
                            OpenAvathar
                        </motion.h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            Bring Your Own GPU. Start generating AI videos in minutes.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-col gap-4">
                        <div className="flex-col gap-2">
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>
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
                            style={{ padding: '16px', fontSize: '1.05rem', marginTop: '8px' }}
                        >
                            {isLoading ? (
                                <>
                                    <span className="animate-spin" style={{ marginRight: '8px', border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%', width: '16px', height: '16px', display: 'inline-block' }}></span>
                                    Validating Key...
                                </>
                            ) : (
                                <>
                                    Connect RunPod <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div className="flex-center" style={{ marginTop: '12px', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem', opacity: 0.8 }}>
                            <ShieldCheck size={14} />
                            <span>Your key is stored in memory and never leaves your browser.</span>
                        </div>
                    </form>

                    <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Don't have an API key? <a href="https://www.runpod.io/console/user/settings" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Get one on RunPod</a>
                        </p>
                        <button
                            onClick={() => {
                                localStorage.clear();
                                window.location.reload();
                            }}
                            className="text-secondary"
                            style={{
                                marginTop: '16px',
                                background: 'none',
                                border: 'none',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                opacity: 0.6
                            }}
                        >
                            Clear cached data & restart
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

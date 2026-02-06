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
                navigate('/setup');
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
        <div className="container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                style={{ width: '100%', maxWidth: '540px' }}
            >
                <div className="card glass" style={{ padding: '48px', position: 'relative', overflow: 'hidden' }}>
                    {/* Background Highlight */}
                    <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '200px', height: '200px', background: 'var(--accent)', opacity: 0.05, filter: 'blur(60px)', borderRadius: '50%' }}></div>

                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <motion.h1
                            className="text-gradient"
                            style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '12px', letterSpacing: '-0.02em' }}
                        >
                            OpenAvathar
                        </motion.h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                            Bring Your Own GPU. Start generating AI videos in minutes.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: '4px' }}>
                                RunPod API Key
                            </label>
                            <div style={{ position: 'relative' }}>
                                <Key size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    value={keyInput}
                                    onChange={(e) => setKeyInput(e.target.value)}
                                    placeholder="Paste your API key here..."
                                    className="glass"
                                    style={{
                                        width: '100%',
                                        padding: '14px 48px',
                                        fontSize: '1rem',
                                        color: 'white',
                                        border: error ? '1px solid var(--error)' : '1px solid var(--border)',
                                        boxSizing: 'border-box'
                                    }}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowKey(!showKey)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
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
                            style={{ padding: '16px', fontSize: '1.05rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}
                        >
                            {isLoading ? (
                                'Validating Key...'
                            ) : (
                                <>
                                    Connect RunPod <ArrowRight size={20} />
                                </>
                            )}
                        </button>

                        <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <ShieldCheck size={14} />
                            <span>Your key is stored in memory and never leaves your browser.</span>
                        </div>
                    </form>

                    <div style={{ marginTop: '40px', paddingTop: '30px', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            Don't have an API key? <a href="https://www.runpod.io/console/user/settings" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>Get one on RunPod</a>
                        </p>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

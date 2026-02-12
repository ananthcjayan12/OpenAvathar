import { useState } from 'react';
import { Eye, EyeOff, Key, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { runpodApi } from '@/services/runpodApi';

interface ApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
    const [keyInput, setKeyInput] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const setApiKey = useAppStore((state) => state.setApiKey);
    const setValidated = useAppStore((state) => state.setValidated);

    if (!isOpen) return null;

    const handleSave = async () => {
        if (!keyInput.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            const normalizedKey = keyInput.trim();
            const isValid = await runpodApi.validateApiKey(normalizedKey);

            if (!isValid) {
                setError('Invalid API key. Please check your RunPod account.');
                return;
            }

            setApiKey(normalizedKey);
            setValidated(true);
            onClose();
        } catch (err) {
            setError('Failed to validate key. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: '16px'
            }}
            onClick={onClose}
        >
            <div
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '520px',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid var(--border)',
                    padding: '24px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Key size={20} color="var(--accent)" />
                    <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Enter RunPod API Key</h3>
                </div>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.92rem' }}>
                    Studio needs your API key to deploy and run generation jobs.
                </p>

                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    RUNPOD API KEY
                </label>
                <div style={{ position: 'relative', marginBottom: '10px' }}>
                    <input
                        type={showKey ? 'text' : 'password'}
                        value={keyInput}
                        onChange={(e) => setKeyInput(e.target.value)}
                        placeholder="rk-xxxxxxxxx..."
                        style={{
                            width: '100%',
                            padding: '12px 44px 12px 12px',
                            borderRadius: '10px',
                            border: error ? '1px solid var(--error)' : '1px solid var(--border)',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-tertiary)'
                        }}
                    >
                        {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>

                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--error)', fontSize: '0.85rem', marginBottom: '14px' }}>
                        <AlertTriangle size={14} />
                        <span>{error}</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '18px' }}>
                    <button className="btn btn-secondary" type="button" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="btn btn-primary"
                        type="button"
                        onClick={handleSave}
                        disabled={isLoading || !keyInput.trim()}
                    >
                        {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                        {isLoading ? 'Verifying...' : 'Save Key'}
                    </button>
                </div>

                <div style={{ marginTop: '14px', fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
                    Saved only in this browser session storage.
                </div>
            </div>
        </div>
    );
}
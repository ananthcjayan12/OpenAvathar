import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Key, Settings as SettingsIcon } from 'lucide-react';

export default function SettingsPage() {
    const {
        apiKey,
        setApiKey,
        cloudType,
        setCloudType,
        gpuType,
        setGpuType,
        videoOrientation,
        setVideoOrientation,
        maxFrames,
        setMaxFrames,
        audioCfgScale,
        setAudioCfgScale
    } = useAppStore();

    const [localApiKey, setLocalApiKey] = useState(apiKey || '');

    return (
        <div className="container" style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 20px' }}>
            <header style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <SettingsIcon size={24} /> Settings
                </h1>
                <p style={{ color: 'var(--text-secondary)' }}>Configure defaults for pods and generation.</p>
            </header>

            <div className="card glass" style={{ padding: '28px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>RunPod API Key</h2>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flexGrow: 1, minWidth: '260px' }}>
                        <Key size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                        <input
                            type="password"
                            value={localApiKey}
                            onChange={(e) => setLocalApiKey(e.target.value)}
                            placeholder="RunPod API key"
                            className="glass-panel"
                            style={{ width: '100%', padding: '12px 12px 12px 42px' }}
                        />
                    </div>
                    <button
                        className="btn-primary"
                        onClick={() => setApiKey(localApiKey.trim())}
                        disabled={!localApiKey.trim()}
                    >
                        Save Key
                    </button>
                </div>
                <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    Your key is stored locally in the browser.
                </p>
            </div>

            <div className="card glass" style={{ padding: '28px', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Pod Defaults</h2>
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cloud Type</span>
                        <select
                            value={cloudType}
                            onChange={(e) => setCloudType(e.target.value as any)}
                            className="glass-panel"
                            style={{ padding: '10px 12px' }}
                        >
                            <option value="COMMUNITY">Community (Cheaper)</option>
                            <option value="SECURE">Secure (More Reliable)</option>
                        </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>GPU Type</span>
                        <input
                            value={gpuType}
                            onChange={(e) => setGpuType(e.target.value)}
                            className="glass-panel"
                            style={{ padding: '10px 12px' }}
                        />
                    </label>
                </div>
            </div>

            <div className="card glass" style={{ padding: '28px' }}>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Generation Defaults</h2>
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Orientation</span>
                        <select
                            value={videoOrientation}
                            onChange={(e) => setVideoOrientation(e.target.value as any)}
                            className="glass-panel"
                            style={{ padding: '10px 12px' }}
                        >
                            <option value="horizontal">Horizontal</option>
                            <option value="vertical">Vertical</option>
                        </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Max Frames</span>
                        <input
                            type="number"
                            min={1}
                            max={500}
                            value={maxFrames}
                            onChange={(e) => setMaxFrames(Number(e.target.value))}
                            className="glass-panel"
                            style={{ padding: '10px 12px' }}
                        />
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Audio CFG Scale</span>
                        <input
                            type="number"
                            min={0}
                            max={10}
                            step={0.1}
                            value={audioCfgScale}
                            onChange={(e) => setAudioCfgScale(Number(e.target.value))}
                            className="glass-panel"
                            style={{ padding: '10px 12px' }}
                        />
                    </label>
                </div>
            </div>
        </div>
    );
}

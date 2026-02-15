import { useState } from 'react';
import { useAppStore } from '@/stores/appStore';
import { Key, Settings as SettingsIcon, BadgeCheck, ExternalLink } from 'lucide-react';
import { getFingerprint } from '@/services/fingerprintService';
import { activateLicense, checkGeneration } from '@/services/licenseService';

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
        setAudioCfgScale,
        isLicensed,
        licenseKey,
        fingerprint: storedFingerprint,
        setFingerprint,
        setLicensed,
        setLicenseKey,
        setUsageStatus,
        dailyLimit,
        usedToday,
        resetsIn
    } = useAppStore();

    const [localApiKey, setLocalApiKey] = useState(apiKey || '');
    const [localLicenseKey, setLocalLicenseKey] = useState(licenseKey || '');
    const [licenseMessage, setLicenseMessage] = useState<string | null>(null);
    const [isActivating, setIsActivating] = useState(false);

    const gumroadUrl = (import.meta.env.VITE_GUMROAD_URL as string | undefined) ?? '';
    const gumroadCheckoutUrl = gumroadUrl
        ? `${gumroadUrl}${gumroadUrl.includes('?') ? '&' : '?'}wanted=true`
        : '';

    const handleActivate = async () => {
        setLicenseMessage(null);
        setIsActivating(true);
        try {
            const fingerprint = storedFingerprint || (await getFingerprint());
            setFingerprint(fingerprint);

            const res = await activateLicense(localLicenseKey.trim(), fingerprint);
            if (!res.success) {
                setLicenseMessage(res.error || 'Activation failed');
                return;
            }

            setLicensed(true);
            setLicenseKey(localLicenseKey.trim());
            setLicenseMessage(res.message || 'License activated');

            const status = await checkGeneration(fingerprint);
            setUsageStatus({
                canGenerate: status.canGenerate,
                dailyLimit: status.limit ?? 1,
                usedToday: status.used ?? 0,
                resetsIn: status.resetsIn ?? null,
            });
        } catch (err: any) {
            setLicenseMessage(err?.message || 'Activation failed');
        } finally {
            setIsActivating(false);
        }
    };

    return (
        <div className="container app-page" style={{ maxWidth: '900px' }}>
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
                        className="btn btn-primary"
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
                <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <BadgeCheck size={18} /> License
                </h2>

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        value={localLicenseKey}
                        onChange={(e) => setLocalLicenseKey(e.target.value)}
                        placeholder="Enter license key (e.g., OAVR-XXXX-XXXX-XXXX)"
                        className="glass-panel"
                        style={{ flexGrow: 1, minWidth: '260px', padding: '12px 12px' }}
                    />
                    <button
                        className="btn btn-primary"
                        onClick={handleActivate}
                        disabled={!localLicenseKey.trim() || isActivating}
                    >
                        {isActivating ? 'Activating...' : 'Activate'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                            if (!gumroadCheckoutUrl) return;
                            window.location.assign(gumroadCheckoutUrl);
                        }}
                        style={{ pointerEvents: gumroadCheckoutUrl ? 'auto' : 'none', opacity: gumroadCheckoutUrl ? 1 : 0.6 }}
                        disabled={!gumroadCheckoutUrl}
                        aria-disabled={!gumroadCheckoutUrl}
                    >
                        Upgrade <ExternalLink size={14} />
                    </button>
                </div>

                <div style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    Status: <strong style={{ color: isLicensed ? 'var(--accent)' : 'var(--text)' }}>{isLicensed ? 'Pro (Licensed)' : 'Free'}</strong>
                    {!isLicensed ? (
                        <span>
                            {' '}• Today: <strong>{usedToday}/{dailyLimit}</strong>
                            {resetsIn ? <span> • Resets in <strong>{resetsIn}</strong></span> : null}
                        </span>
                    ) : null}
                </div>

                {licenseMessage ? (
                    <p style={{ marginTop: '10px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{licenseMessage}</p>
                ) : null}
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

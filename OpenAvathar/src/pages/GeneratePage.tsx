import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    Image as ImageIcon,
    Mic,
    Wand2,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Play,
    Film,
    Trash2,
    Rocket,
    ListPlus,
    Monitor,
    Smartphone,
    SlidersHorizontal,
    MessageSquareText,
    Clock3,
    Sparkles,
    Info
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { useJobQueue } from '@/stores/jobQueue';
import { comfyuiApi } from '@/services/comfyuiApi';
import { jobProcessor } from '@/services/jobProcessor';
import { ensurePodAvailable, AutoStartError } from '@/services/podAutoStarter';
import { getFingerprint } from '@/services/fingerprintService';
import { checkGeneration, trackGeneration } from '@/services/licenseService';
import VideoPreview from '@/components/VideoPreview';
import JobQueuePanel from '@/components/JobQueuePanel';
import UpgradeModal from '@/components/UpgradeModal';
import ApiKeyModal from '@/components/ApiKeyModal';

export default function GeneratePage() {
    const {
        activePodId,
        apiKey,
        pods,
        setActivePodId,
        purpose,
        currentPromptId,
        setCurrentPromptId,
        generationStatus,
        setGenerationStatus,
        outputVideo,
        setOutputVideo,
        videoOrientation,
        maxFrames,
        audioCfgScale,
        generatedVideos,
        clearVideoHistory,
        isAutoStarting,
        autoStartMessage,
        setAutoStartState,
        fingerprint: storedFingerprint,
        canGenerate: storedCanGenerate,
        resetsIn: storedResetsIn,
        setUsageStatus,
        isLicensed
    } = useAppStore();

    const activePod = activePodId ? pods[activePodId] : null;
    const comfyuiUrl = activePod?.comfyuiUrl;

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [allVideos, setAllVideos] = useState<Array<{ id: string; filename: string; url: string; timestamp: number; orientation?: 'horizontal' | 'vertical'; purpose?: string }>>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);
    const [queuePanelCollapsed, setQueuePanelCollapsed] = useState(false);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const [showApiKeyModal, setShowApiKeyModal] = useState(false);
    // Job queue state
    const addJob = useJobQueue((s) => s.addJob);
    const totalJobs = useJobQueue((s) => Object.keys(s.jobs).length);
    const isPodBusy = activePodId ? !jobProcessor.isPodAvailable(activePodId) : false;

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // Fetch videos from ComfyUI on mount
    useEffect(() => {
        const fetchVideos = async () => {
            if (!comfyuiUrl) {
                console.log('[VideoHistory] No ComfyUI URL available, skipping fetch');
                return;
            }

            console.log('[VideoHistory] Fetching videos from ComfyUI:', comfyuiUrl);
            setIsLoadingVideos(true);
            try {
                const comfyVideos = await comfyuiApi.getOutputVideos(comfyuiUrl);
                console.log('[VideoHistory] Fetched videos from ComfyUI:', comfyVideos.length);

                // Merge with stored videos, avoiding duplicates
                const storedVideoIds = new Set(generatedVideos.map(v => v.id));
                const newVideos = comfyVideos.filter(v => !storedVideoIds.has(v.id));
                console.log('[VideoHistory] Stored videos:', generatedVideos.length, 'New videos:', newVideos.length);

                // Combine stored videos (with metadata) and new videos from ComfyUI
                const combined = [
                    ...generatedVideos.map(v => ({
                        id: v.id,
                        filename: v.filename,
                        url: v.url,
                        timestamp: v.timestamp,
                        orientation: v.orientation,
                        purpose: v.purpose
                    })),
                    ...newVideos
                ];

                // Sort by timestamp
                combined.sort((a, b) => b.timestamp - a.timestamp);
                console.log('[VideoHistory] Total videos to display:', combined.length);
                setAllVideos(combined);
            } catch (err) {
                console.error('[VideoHistory] Failed to fetch videos:', err);
            } finally {
                setIsLoadingVideos(false);
            }
        };

        fetchVideos();
    }, [comfyuiUrl, generatedVideos]);

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleAudioSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedAudio(file);

            // Calculate duration if purpose is infinitetalk
            if (purpose === 'infinitetalk') {
                const audio = new Audio();
                audio.src = URL.createObjectURL(file);
                audio.onloadedmetadata = () => {
                    const duration = audio.duration;
                    const frames = Math.ceil(duration * 25); // assuming 25 fps
                    console.log(`[Audio] Duration: ${duration}s, Calculated Frames: ${frames}`);
                    useAppStore.getState().setMaxFrames(frames);
                    URL.revokeObjectURL(audio.src);
                };
            }
        }
    };

    const handleGenerate = async () => {
        if (!selectedImage) return;

        const workflowType = purpose || 'infinitetalk';
        if (workflowType === 'infinitetalk' && !selectedAudio) return;

        if (!apiKey) {
            setShowApiKeyModal(true);
            return;
        }

        setError(null);

        try {
            // 1) License / daily limit gate
            const fingerprint = storedFingerprint || (await getFingerprint());
            const status = await checkGeneration(fingerprint);

            setUsageStatus({
                canGenerate: status.canGenerate,
                dailyLimit: status.limit ?? 1,
                usedToday: status.used ?? 0,
                resetsIn: status.resetsIn ?? null,
            });

            if (!status.canGenerate) {
                setShowUpgradeModal(true);
                return;
            }

            setAutoStartState(true, 'Checking pod availability...');

            const podId = await ensurePodAvailable({
                onProgress: (message) => setAutoStartState(true, message),
            });

            const jobId = addJob(
                {
                    imageFile: selectedImage,
                    audioFile: selectedAudio || undefined,
                    prompt: prompt || 'high quality video',
                    orientation: videoOrientation,
                    maxFrames: maxFrames,
                    workflowType,
                    audioCfgScale: audioCfgScale,
                },
                podId
            );

            jobProcessor.processJob(jobId);

            setAutoStartState(false, null);

            // 5) Track generation for free users
            if (!status.isPro) {
                const tracked = await trackGeneration(fingerprint);
                setUsageStatus({
                    canGenerate: tracked.count < (status.limit ?? 1),
                    dailyLimit: status.limit ?? 1,
                    usedToday: tracked.count,
                    resetsIn: status.resetsIn ?? null,
                });
            }

            // Reset form for next upload
            setSelectedImage(null);
            setSelectedAudio(null);
            setImagePreview(null);
            setPrompt('');
        } catch (err: any) {
            console.error('[Generate] Auto-start failed:', err);
            setAutoStartState(false, null);

            if (err instanceof AutoStartError) {
                setError(err.message);
            } else {
                setError('Failed to start the studio. Please try again.');
            }
        }
    };



    const effectivePurpose = purpose || 'infinitetalk';
    const isReady = Boolean(
        selectedImage &&
        (effectivePurpose === 'wan2.2' || (effectivePurpose === 'infinitetalk' && selectedAudio))
    );

    // Button text based on pod status
    const generateButtonText = isPodBusy ? 'Add to Queue' : 'Generate Video';
    const generateButtonIcon = isPodBusy ? <ListPlus size={20} /> : <Play size={20} fill="currentColor" />;
    const matchingPodsCount = Object.values(pods).filter(p => !purpose || p.purpose === purpose).length;

    const getReadyStatus = () => {
        if (!comfyuiUrl && !isAutoStarting) return 'No pod running. We will start one automatically.';
        if (!selectedImage) return 'Please upload an image.';
        if (effectivePurpose === 'infinitetalk' && !selectedAudio) return 'Please upload an audio file for talking head.';
        if (!isLicensed && !storedCanGenerate) {
            return `Daily limit reached${storedResetsIn ? ` (resets in ${storedResetsIn})` : ''}.`;
        }
        return null;
    };

    return (
        <div className="container app-page" style={{ maxWidth: '1400px' }}>
            <header className="flex-center flex-col gap-2" style={{ marginBottom: '40px', textAlign: 'center' }}>
                <div className="glass-panel" style={{ padding: '8px 14px', borderRadius: '999px', display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '8px' }}>
                    <Sparkles size={14} /> Studio Workspace
                </div>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <Wand2 /> AI Video Generator
                </h1>
                <p className="text-secondary" style={{ fontSize: '1.1rem' }}>
                    {purpose === 'wan2.2' ? 'Transform images into dynamic videos' : 'Create talking head videos with audio'}
                </p>
            </header>

            <AnimatePresence>
                {isAutoStarting && autoStartMessage && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="glass-panel"
                        style={{
                            margin: '0 auto 24px',
                            maxWidth: '720px',
                            padding: '16px 20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            border: '1px solid var(--border)'
                        }}
                    >
                        <Loader2 className="animate-spin" size={18} />
                        <span style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                            {autoStartMessage}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>

            <UpgradeModal
                isOpen={showUpgradeModal}
                onClose={() => setShowUpgradeModal(false)}
                resetsIn={storedResetsIn}
            />

            <ApiKeyModal
                isOpen={showApiKeyModal}
                onClose={() => setShowApiKeyModal(false)}
            />

            {/* Pod Selector */}
            {generationStatus === 'idle' && (
                <div className="app-surface" style={{
                    background: 'rgba(255,255,255,0.78)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                    flexWrap: 'wrap',
                    maxWidth: '1200px',
                    margin: '0 auto 30px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'var(--accent)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white'
                        }}>
                            <Rocket size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Pod</div>
                            <div style={{ fontWeight: 600 }}>{activePod?.name || 'No Pod Selected'}</div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Switch Pod:</span>
                        <select
                            value={activePodId || ''}
                            onChange={(e) => setActivePodId(e.target.value)}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                fontSize: '0.9rem',
                                minWidth: '200px',
                                outline: 'none'
                            }}
                        >
                            <option value="" disabled>Select a pod...</option>
                            {Object.values(pods)
                                .filter(p => !purpose || p.purpose === purpose)
                                .map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({p.status}) - {p.purpose.toUpperCase()}
                                    </option>
                                ))
                            }
                        </select>
                        <span className="glass-panel" style={{ padding: '6px 10px', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                            {matchingPodsCount} matching
                        </span>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: generationStatus === 'idle' ? '1fr 1fr' : '1fr', gap: '30px', maxWidth: generationStatus === 'idle' ? '100%' : '800px', margin: '0 auto' }} className="responsive-gen-layout">
                <style>{`
                    @media (max-width: 900px) {
                        .responsive-gen-layout { grid-template-columns: 1fr !important; }
                    }
                `}</style>

                {/* Input Section */}
                {generationStatus === 'idle' && (
                    <>
                        {/* Left: Uploads */}
                        <div className="card glass" style={{ padding: '30px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                <ImageIcon size={20} color="var(--accent)" /> Source Image
                            </h3>
                            <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                                Upload a clear portrait image for best motion quality.
                            </p>

                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                            />

                            {imagePreview ? (
                                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', border: '1px solid var(--border)' }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'contain', background: '#000' }} />
                                    <button
                                        onClick={() => imageInputRef.current?.click()}
                                        className="btn btn-secondary"
                                        style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '8px 16px' }}
                                    >
                                        Change Image
                                    </button>
                                </div>
                            ) : (
                                <div
                                    onClick={() => imageInputRef.current?.click()}
                                    className="glass-panel"
                                    style={{
                                        width: '100%',
                                        padding: '60px 20px',
                                        border: '2px dashed var(--border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '16px',
                                        color: 'var(--text-secondary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ background: 'var(--bg-tertiary)', padding: '20px', borderRadius: '50%' }}>
                                        <Upload size={32} />
                                    </div>
                                    <span style={{ fontSize: '0.9rem' }}>Click or drag to upload image</span>
                                </div>
                            )}

                            {purpose === 'infinitetalk' && (
                                <>
                                    <h3 style={{ fontSize: '1.1rem', marginTop: '32px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
                                        <Mic size={20} color="var(--accent)" /> Voice Audio
                                    </h3>
                                    <p className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '20px' }}>
                                        Add speech audio to drive lip-sync animation.
                                    </p>

                                    <input
                                        ref={audioInputRef}
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudioSelect}
                                        style={{ display: 'none' }}
                                    />

                                    {selectedAudio ? (
                                        <div className="glass-panel" style={{ padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <div style={{ background: 'var(--accent)', padding: '10px', borderRadius: '50%', color: 'white' }}>
                                                    <Mic size={18} />
                                                </div>
                                                <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{selectedAudio.name}</span>
                                            </div>
                                            <button onClick={() => audioInputRef.current?.click()} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <div
                                            onClick={() => audioInputRef.current?.click()}
                                            className="glass-panel"
                                            style={{
                                                width: '100%',
                                                padding: '40px 20px',
                                                border: '2px dashed var(--border)',
                                                borderRadius: '12px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '12px',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            <Mic size={24} style={{ opacity: 0.7 }} />
                                            <span style={{ fontSize: '0.9rem' }}>Click to upload audio track</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Right: Settings */}
                        <div className="card glass" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '24px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <SlidersHorizontal size={18} color="var(--accent)" /> Generation Settings
                            </h3>

                            {/* Video Orientation */}
                            <label className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '10px', display: 'block' }}>
                                Aspect Ratio
                            </label>
                            <div className="glass-panel" style={{ display: 'flex', padding: '4px', gap: '4px', borderRadius: '10px', marginBottom: '24px' }}>
                                <button
                                    onClick={() => useAppStore.getState().setVideoOrientation('horizontal')}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: videoOrientation === 'horizontal' ? 'var(--accent)' : 'transparent',
                                        color: videoOrientation === 'horizontal' ? 'white' : 'var(--text-secondary)',
                                        border: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <Monitor size={16} /> Landscape
                                </button>
                                <button
                                    onClick={() => useAppStore.getState().setVideoOrientation('vertical')}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: videoOrientation === 'vertical' ? 'var(--accent)' : 'transparent',
                                        color: videoOrientation === 'vertical' ? 'white' : 'var(--text-secondary)',
                                        border: 'none',
                                        fontSize: '0.9rem'
                                    }}
                                >
                                    <Smartphone size={16} /> Portrait
                                </button>
                            </div>

                            {/* Video Duration */}
                            <div className="flex-between" style={{ marginBottom: '10px' }}>
                                <label className="text-secondary" style={{ fontSize: '0.85rem' }}>Duration (Seconds)</label>
                                <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.9rem' }}>
                                    {(maxFrames / 25).toFixed(1)}s <span style={{ opacity: 0.6, fontSize: '0.8rem', fontWeight: 400 }}>({maxFrames} frames)</span>
                                </span>
                            </div>
                            <input
                                type="range"
                                min="1"
                                max="360"
                                step="0.5"
                                value={maxFrames / 25}
                                onChange={(e) => useAppStore.getState().setMaxFrames(Math.round(Number(e.target.value) * 25))}
                                style={{
                                    width: '100%',
                                    marginBottom: '24px',
                                    accentColor: 'var(--accent)',
                                    height: '6px'
                                }}
                            />

                            {/* Audio CFG Scale */}
                            <div className="flex-between" style={{ marginBottom: '10px' }}>
                                <label className="text-secondary" style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    Audio Guidance Scale
                                    <span
                                        title="Lower values (<1.0) may result in 2x slower generation times"
                                        style={{
                                            cursor: 'help',
                                            opacity: 0.6,
                                            fontSize: '0.75rem',
                                            border: '1px solid currentColor',
                                            borderRadius: '50%',
                                            width: '14px',
                                            height: '14px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        <Info size={10} />
                                    </span>
                                </label>
                                <span style={{
                                    color: audioCfgScale < 1.0 ? 'var(--text-secondary)' : 'var(--accent)',
                                    fontWeight: 600,
                                    fontSize: '0.9rem'
                                }}>
                                    {audioCfgScale.toFixed(1)}
                                    {audioCfgScale < 1.0 && <span style={{ fontSize: '0.7rem', marginLeft: '4px' }}>⚠️ slower</span>}
                                </span>
                            </div>
                            <input
                                type="range"
                                min="0"
                                max="2.0"
                                step="0.1"
                                value={audioCfgScale}
                                onChange={(e) => useAppStore.getState().setAudioCfgScale(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginBottom: '24px',
                                    accentColor: 'var(--accent)',
                                    height: '6px'
                                }}
                            />

                            {/* Prompt */}
                            <label className="text-secondary" style={{ fontSize: '0.85rem', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <MessageSquareText size={14} />
                                Description Prompt (Optional)
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the motion, style, or specific details you want in the video..."
                                style={{
                                    width: '100%',
                                    minHeight: '140px',
                                    padding: '16px',
                                    fontSize: '0.95rem',
                                    marginBottom: '24px',
                                    resize: 'vertical'
                                }}
                            />

                            <div style={{ marginTop: 'auto' }}>
                                {!isReady && (
                                    <div style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--warning)',
                                        textAlign: 'center',
                                        marginBottom: '16px',
                                        padding: '10px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        border: '1px solid rgba(245, 158, 11, 0.2)'
                                    }}>
                                        <AlertTriangle size={16} /> {getReadyStatus()}
                                    </div>
                                )}
                                <div className="glass-panel" style={{ marginBottom: '14px', padding: '10px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                                    <Clock3 size={14} color="var(--accent)" /> Typical runtime: 2–5 minutes based on load and duration.
                                </div>
                                {!apiKey && (
                                    <div style={{
                                        fontSize: '0.82rem',
                                        color: 'var(--warning)',
                                        textAlign: 'center',
                                        marginBottom: '12px',
                                        padding: '10px',
                                        background: 'rgba(245, 158, 11, 0.1)',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(245, 158, 11, 0.2)'
                                    }}>
                                        API key required. Clicking Generate will open the key entry modal.
                                    </div>
                                )}
                                <button
                                    onClick={handleGenerate}
                                    disabled={!isReady}
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        fontSize: '1.1rem',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        boxShadow: isReady ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none'
                                    }}
                                >
                                    {generateButtonIcon} {generateButtonText}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Job Queue Panel - Always visible when there are jobs */}
                {generationStatus === 'idle' && totalJobs > 0 && (
                    <div style={{ gridColumn: '1 / -1' }}>
                        <JobQueuePanel
                            collapsed={queuePanelCollapsed}
                            onToggle={() => setQueuePanelCollapsed(!queuePanelCollapsed)}
                        />
                    </div>
                )}

                {/* Progress Section */}
                {generationStatus !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card glass"
                        style={{ padding: '60px', textAlign: 'center', gridColumn: '1 / -1', maxWidth: '600px', margin: '0 auto', width: '100%' }}
                    >
                        <AnimatePresence mode="wait">
                            {generationStatus === 'uploading' && (
                                <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 size={64} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 24px' }} />
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Uploading Media...</h3>
                                    <p className="text-secondary">Transferring source files to the GPU pod</p>
                                </motion.div>
                            )}

                            {generationStatus === 'queuing' && (
                                <motion.div key="queuing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div style={{ display: 'inline-block', padding: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)', marginBottom: '24px' }}>
                                        <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent)' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Preparing Workflow...</h3>
                                    <p className="text-secondary">Configuring AI compute nodes</p>
                                </motion.div>
                            )}

                            {generationStatus === 'generating' && (
                                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 24px' }}>
                                        <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--border)', borderRadius: '50%' }}></div>
                                        <div style={{ position: 'absolute', inset: 0, border: '4px solid var(--accent)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 2s linear infinite' }}></div>
                                        <Film size={32} style={{ position: 'absolute', top: '24px', left: '24px', color: 'var(--text-primary)' }} />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Generating Video...</h3>
                                    <p className="text-secondary">This usually takes 2-5 minutes.</p>
                                    <div className="glass-panel" style={{ display: 'inline-block', marginTop: '20px', padding: '8px 16px', borderRadius: '20px', fontSize: '0.85rem' }}>
                                        ID: <span style={{ fontFamily: 'var(--font-mono)' }}>{currentPromptId}</span>
                                    </div>
                                </motion.div>
                            )}

                            {generationStatus === 'completed' && (
                                <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 40px rgba(16, 185, 129, 0.4)' }}>
                                        <CheckCircle2 size={48} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: '1.75rem', marginBottom: '32px' }}>Video Ready!</h3>

                                    {outputVideo && comfyuiUrl && (
                                        <div style={{ marginBottom: '32px' }}>
                                            <VideoPreview
                                                comfyuiUrl={comfyuiUrl}
                                                filename={outputVideo}
                                                onClose={() => {
                                                    setGenerationStatus('idle');
                                                    setOutputVideo(null);
                                                }}
                                            />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => {
                                            setGenerationStatus('idle');
                                            setOutputVideo(null);
                                            setCurrentPromptId(null);
                                            setSelectedImage(null);
                                            setSelectedAudio(null);
                                            setImagePreview(null);
                                            setPrompt('');
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        Create Another Video
                                    </button>
                                </motion.div>
                            )}

                            {generationStatus === 'failed' && (
                                <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        <AlertTriangle size={48} color="var(--error)" />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Generation Failed</h3>
                                    {error && (
                                        <p style={{ color: 'var(--error)', marginBottom: '24px', maxWidth: '400px', margin: '0 auto 24px' }}>{error}</p>
                                    )}
                                    <button
                                        onClick={() => {
                                            setGenerationStatus('idle');
                                            setError(null);
                                        }}
                                        className="btn btn-primary"
                                    >
                                        Try Again
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </div>

            {/* Gallery Section */}
            <div style={{ marginTop: '80px' }}>
                <div className="flex-between" style={{ marginBottom: '30px' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <Film size={28} color="var(--accent)" />
                        Video History
                        {isLoadingVideos && (
                            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-secondary)' }} />
                        )}
                    </h2>
                    {allVideos.length > 0 && (
                        <button
                            onClick={() => {
                                if (confirm('Are you sure you want to clear all video history?')) {
                                    clearVideoHistory();
                                    setAllVideos([]);
                                }
                            }}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.85rem' }}
                        >
                            <Trash2 size={16} /> Clear History
                        </button>
                    )}
                </div>

                {isLoadingVideos && allVideos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                        <Loader2 size={40} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
                        <p>Syncing gallery with ComfyUI...</p>
                    </div>
                ) : allVideos.length === 0 ? (
                    <div className="card glass" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                        <Film size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <p>No videos generated yet.</p>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '24px'
                    }}>
                        {allVideos.map((video) => (
                            <motion.div
                                key={video.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="card glass"
                                style={{
                                    padding: '12px',
                                    transition: 'transform 0.2s',
                                    border: '1px solid var(--border)',
                                    background: 'var(--bg-secondary)'
                                }}
                                whileHover={{ y: -5 }}
                            >
                                <div style={{
                                    position: 'relative',
                                    width: '100%',
                                    backgroundColor: '#000',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    marginBottom: '16px',
                                    aspectRatio: video.orientation === 'vertical' ? '9/16' : '16/9'
                                }}>
                                    <video
                                        src={video.url}
                                        style={{
                                            width: '100%',
                                            height: '100%',
                                            objectFit: 'contain'
                                        }}
                                        controls
                                        preload="metadata"
                                    />
                                </div>
                                <div style={{ padding: '0 4px' }}>
                                    <div className="flex-between" style={{ marginBottom: '6px' }}>
                                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            {video.purpose === 'wan2.2' ? 'WAN 2.2' : video.purpose === 'infinitetalk' ? 'InfiniteTalk' : 'Video'}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {new Date(video.timestamp).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {video.filename}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div >
    );
}

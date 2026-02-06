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
    Trash2
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { comfyuiApi } from '@/services/comfyuiApi';
import { workflowPatcher } from '@/services/workflowPatcher';
import VideoPreview from '@/components/VideoPreview';

export default function GeneratePage() {
    const {
        comfyuiUrl,
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
        addGeneratedVideo,
        clearVideoHistory
    } = useAppStore();

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [allVideos, setAllVideos] = useState<Array<{ id: string; filename: string; url: string; timestamp: number; orientation?: 'horizontal' | 'vertical'; purpose?: string }>>([]);
    const [isLoadingVideos, setIsLoadingVideos] = useState(false);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

    // Fetch videos from ComfyUI on mount
    useEffect(() => {
        const fetchVideos = async () => {
            if (!comfyuiUrl) return;

            setIsLoadingVideos(true);
            try {
                const comfyVideos = await comfyuiApi.getOutputVideos(comfyuiUrl);

                // Merge with stored videos, avoiding duplicates
                const storedVideoIds = new Set(generatedVideos.map(v => v.id));
                const newVideos = comfyVideos.filter(v => !storedVideoIds.has(v.id));

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
                setAllVideos(combined);
            } catch (err) {
                console.error('Failed to fetch videos:', err);
            } finally {
                setIsLoadingVideos(false);
            }
        };

        fetchVideos();
    }, [comfyuiUrl, generatedVideos]);

    // Debug logging for button state
    useEffect(() => {
        console.log('Generate Button State:', {
            comfyuiUrl: !!comfyuiUrl,
            purpose,
            selectedImage: !!selectedImage,
            selectedAudio: !!selectedAudio,
            generationStatus,
            isReady: comfyuiUrl && selectedImage && (purpose === 'wan2.2' || (purpose === 'infinitetalk' && selectedAudio))
        });
    }, [comfyuiUrl, purpose, selectedImage, selectedAudio, generationStatus]);

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
        }
    };

    const handleGenerate = async () => {
        if (!comfyuiUrl || !selectedImage) return;

        setError(null);
        setGenerationStatus('uploading');

        try {
            // 1. Upload Files
            const imageFilename = await comfyuiApi.uploadFile(comfyuiUrl, selectedImage);

            let audioFilename = '';
            if (purpose === 'infinitetalk' && selectedAudio) {
                audioFilename = await comfyuiApi.uploadFile(comfyuiUrl, selectedAudio);
            }

            // 2. Patch Workflow with generation settings
            setGenerationStatus('queuing');
            const patchedWorkflow = await workflowPatcher.patchWorkflow(purpose!, {
                imageName: imageFilename,
                audioName: audioFilename,
                prompt: prompt || 'high quality video',
                width: videoOrientation === 'horizontal' ? 1024 : 576,
                height: videoOrientation === 'horizontal' ? 576 : 1024,
                orientation: videoOrientation,
                maxFrames: maxFrames,
                audioCfgScale: audioCfgScale
            });

            // 3. Queue Workflow
            const response = await comfyuiApi.queueWorkflow(comfyuiUrl, patchedWorkflow);
            setCurrentPromptId(response.prompt_id);
            setGenerationStatus('generating');

            // 4. Poll for Completion
            pollForCompletion(response.prompt_id);
        } catch (err: any) {
            setError(err.message || 'Generation failed');
            setGenerationStatus('failed');
        }
    };

    const pollForCompletion = async (promptId: string) => {
        const maxAttempts = 120; // 10 minutes max (5s interval)
        let attempts = 0;

        const poll = setInterval(async () => {
            try {
                attempts++;
                const status = await comfyuiApi.getGenerationStatus(comfyuiUrl!, promptId);

                if (status.status === 'completed') {
                    clearInterval(poll);
                    setGenerationStatus('completed');

                    // Get output filename (assuming last output is the video)
                    const outputFilename = status.outputs?.[0]?.filename;
                    if (outputFilename) {
                        const videoUrl = comfyuiApi.getOutputUrl(comfyuiUrl!, outputFilename);
                        setOutputVideo(videoUrl);

                        // Add to video history
                        addGeneratedVideo({
                            id: promptId,
                            filename: outputFilename,
                            url: videoUrl,
                            timestamp: Date.now(),
                            orientation: videoOrientation,
                            purpose: purpose!
                        });
                    }
                } else if (status.status === 'failed') {
                    clearInterval(poll);
                    setGenerationStatus('failed');
                    setError('Generation failed on server');
                }

                if (attempts >= maxAttempts) {
                    clearInterval(poll);
                    setGenerationStatus('failed');
                    setError('Generation timed out');
                }
            } catch (err: any) {
                console.error('Polling error:', err);
            }
        }, 5000);
    };

    // Check if all required inputs are ready
    const isReady = Boolean(
        comfyuiUrl &&
        selectedImage &&
        (purpose === 'wan2.2' || (purpose === 'infinitetalk' && selectedAudio))
    );

    const getReadyStatus = () => {
        if (!comfyuiUrl) return 'Waiting for Pod connection. Go back to Deploy page if it\'s not ready.';
        if (!selectedImage) return 'Please upload an image.';
        if (purpose === 'infinitetalk' && !selectedAudio) return 'Please upload an audio file for talking head.';
        return null;
    };

    return (
        <div className="container" style={{ padding: '60px 20px', maxWidth: '1400px' }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1 className="text-gradient" style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <Wand2 /> AI Video Generator
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    {purpose === 'wan2.2' ? 'Transform images into dynamic videos' : 'Create talking head videos with audio'}
                </p>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: generationStatus === 'idle' ? '1fr 1fr' : '1fr', gap: '30px', maxWidth: generationStatus === 'idle' ? '100%' : '800px', margin: '0 auto' }}>
                {/* Input Section */}
                {generationStatus === 'idle' && (
                    <>
                        <div className="card glass" style={{ padding: '30px' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <ImageIcon size={20} /> Upload Image
                            </h3>

                            <input
                                ref={imageInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageSelect}
                                style={{ display: 'none' }}
                            />

                            {imagePreview ? (
                                <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: '100%', display: 'block' }} />
                                    <button
                                        onClick={() => imageInputRef.current?.click()}
                                        className="btn btn-secondary"
                                        style={{ position: 'absolute', bottom: '12px', right: '12px', padding: '8px 16px' }}
                                    >
                                        Change Image
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => imageInputRef.current?.click()}
                                    className="glass"
                                    style={{
                                        width: '100%',
                                        padding: '60px 20px',
                                        border: '2px dashed var(--border)',
                                        borderRadius: '12px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: 'center',
                                        gap: '12px',
                                        color: 'var(--text-secondary)',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <Upload size={36} />
                                    <span>Click to upload image</span>
                                </button>
                            )}

                            {purpose === 'infinitetalk' && (
                                <>
                                    <h3 style={{ fontSize: '1.1rem', marginTop: '24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Mic size={20} /> Upload Audio
                                    </h3>

                                    <input
                                        ref={audioInputRef}
                                        type="file"
                                        accept="audio/*"
                                        onChange={handleAudioSelect}
                                        style={{ display: 'none' }}
                                    />

                                    {selectedAudio ? (
                                        <div className="glass" style={{ padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Mic size={18} color="var(--accent)" />
                                                <span>{selectedAudio.name}</span>
                                            </div>
                                            <button onClick={() => audioInputRef.current?.click()} className="btn btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => audioInputRef.current?.click()}
                                            className="glass"
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
                                            <Mic size={28} />
                                            <span>Click to upload audio</span>
                                        </button>
                                    )}
                                </>
                            )}
                        </div>

                        <div className="card glass" style={{ padding: '30px', display: 'flex', flexDirection: 'column' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Generation Settings</h3>

                            {/* Video Orientation */}
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Video Orientation
                            </label>
                            <div className="glass" style={{ display: 'flex', padding: '6px', gap: '6px', background: 'var(--bg-secondary)', marginBottom: '20px' }}>
                                <button
                                    onClick={() => useAppStore.getState().setVideoOrientation('horizontal')}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: videoOrientation === 'horizontal' ? 'var(--accent)' : 'transparent',
                                        color: videoOrientation === 'horizontal' ? 'white' : 'var(--text-secondary)',
                                        padding: '10px',
                                        fontSize: '0.9rem',
                                        border: 'none'
                                    }}
                                >
                                    🖥️ Horizontal
                                </button>
                                <button
                                    onClick={() => useAppStore.getState().setVideoOrientation('vertical')}
                                    className="btn"
                                    style={{
                                        flex: 1,
                                        background: videoOrientation === 'vertical' ? 'var(--accent)' : 'transparent',
                                        color: videoOrientation === 'vertical' ? 'white' : 'var(--text-secondary)',
                                        padding: '10px',
                                        fontSize: '0.9rem',
                                        border: 'none'
                                    }}
                                >
                                    📱 Vertical
                                </button>
                            </div>

                            {/* Max Frames */}
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Max Frames</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{maxFrames}</span>
                            </label>
                            <input
                                type="range"
                                min="30"
                                max="240"
                                step="10"
                                value={maxFrames}
                                onChange={(e) => useAppStore.getState().setMaxFrames(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginBottom: '20px',
                                    accentColor: 'var(--accent)'
                                }}
                            />

                            {/* Audio CFG Scale */}
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>Audio CFG Scale</span>
                                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{audioCfgScale.toFixed(1)}</span>
                            </label>
                            <input
                                type="range"
                                min="1.0"
                                max="7.0"
                                step="0.5"
                                value={audioCfgScale}
                                onChange={(e) => useAppStore.getState().setAudioCfgScale(Number(e.target.value))}
                                style={{
                                    width: '100%',
                                    marginBottom: '20px',
                                    accentColor: 'var(--accent)'
                                }}
                            />

                            {/* Prompt */}
                            <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                Prompt (Optional)
                            </label>
                            <textarea
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                                placeholder="Describe the motion, style, or mood..."
                                className="glass"
                                style={{
                                    width: '100%',
                                    minHeight: '120px',
                                    padding: '12px',
                                    fontSize: '1rem',
                                    border: '1px solid var(--border)',
                                    borderRadius: '8px',
                                    color: 'white',
                                    resize: 'vertical',
                                    marginBottom: '24px'
                                }}
                            />

                            <div style={{ marginTop: 'auto' }}>
                                {!isReady && (
                                    <p style={{
                                        fontSize: '0.85rem',
                                        color: 'var(--text-secondary)',
                                        textAlign: 'center',
                                        marginBottom: '12px',
                                        padding: '8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        borderRadius: '6px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '6px'
                                    }}>
                                        <AlertTriangle size={14} /> {getReadyStatus()}
                                    </p>
                                )}
                                <button
                                    onClick={handleGenerate}
                                    disabled={!isReady}
                                    className={`btn ${isReady ? 'btn-primary' : ''}`}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        fontSize: '1.05rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px',
                                        opacity: isReady ? 1 : 0.5,
                                        cursor: isReady ? 'pointer' : 'not-allowed',
                                        background: isReady ? 'var(--accent)' : 'var(--bg-secondary)',
                                        color: isReady ? 'white' : 'var(--text-secondary)',
                                        border: isReady ? 'none' : '1px solid var(--border)'
                                    }}
                                >
                                    <Play size={20} /> Generate Video
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {/* Progress Section */}
                {generationStatus !== 'idle' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="card glass"
                        style={{ padding: '50px', textAlign: 'center' }}
                    >
                        <AnimatePresence mode="wait">
                            {generationStatus === 'uploading' && (
                                <motion.div key="uploading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 size={64} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 24px' }} />
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Uploading Files...</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>Transferring your media to the GPU pod</p>
                                </motion.div>
                            )}

                            {generationStatus === 'queuing' && (
                                <motion.div key="queuing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 size={64} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 24px' }} />
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Preparing Workflow...</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>Configuring AI models</p>
                                </motion.div>
                            )}

                            {generationStatus === 'generating' && (
                                <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                    <Loader2 size={64} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 24px' }} />
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Generating Video...</h3>
                                    <p style={{ color: 'var(--text-secondary)' }}>This typically takes 2-5 minutes</p>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '12px' }}>
                                        Prompt ID: {currentPromptId}
                                    </p>
                                </motion.div>
                            )}

                            {generationStatus === 'completed' && (
                                <motion.div key="completed" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--success)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        <CheckCircle2 size={48} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '24px' }}>Video Generated!</h3>

                                    {outputVideo && comfyuiUrl && (
                                        <VideoPreview
                                            comfyuiUrl={comfyuiUrl}
                                            filename={outputVideo}
                                            onClose={() => {
                                                setGenerationStatus('idle');
                                                setOutputVideo(null);
                                                setCurrentPromptId(null);
                                                setSelectedImage(null);
                                                setSelectedAudio(null);
                                                setImagePreview(null);
                                                setPrompt('');
                                            }}
                                        />
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
                                        style={{ marginTop: '16px' }}
                                    >
                                        Generate Another
                                    </button>
                                </motion.div>
                            )}

                            {generationStatus === 'failed' && (
                                <motion.div key="failed" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--error)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
                                        <AlertTriangle size={48} color="white" />
                                    </div>
                                    <h3 style={{ fontSize: '1.5rem', marginBottom: '12px' }}>Generation Failed</h3>
                                    {error && (
                                        <p style={{ color: 'var(--error)', marginBottom: '24px' }}>{error}</p>
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
            {(allVideos.length > 0 || isLoadingVideos) && (
                <div style={{ marginTop: '60px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                        <h2 style={{ fontSize: '2rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <Film size={32} />
                            Video Gallery
                            {isLoadingVideos && (
                                <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
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
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Trash2 size={18} />
                                Clear History
                            </button>
                        )}
                    </div>

                    {isLoadingVideos && allVideos.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                            <Loader2 size={48} className="animate-spin" style={{ color: 'var(--accent)', margin: '0 auto 16px' }} />
                            <p>Loading videos from ComfyUI...</p>
                        </div>
                    ) : allVideos.length === 0 ? (
                        <div className="card glass" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
                            <Film size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
                            <p>No videos generated yet. Generate your first video above!</p>
                        </div>
                    ) : (
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '24px'
                        }}>
                            {allVideos.map((video) => (
                                <motion.div
                                    key={video.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="card glass"
                                    style={{
                                        padding: '16px',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s',
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                >
                                    <div style={{
                                        position: 'relative',
                                        width: '100%',
                                        backgroundColor: 'var(--bg-secondary)',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        marginBottom: '12px'
                                    }}>
                                        <video
                                            src={video.url}
                                            style={{
                                                width: '100%',
                                                height: 'auto',
                                                display: 'block',
                                                maxHeight: '600px',
                                                objectFit: 'contain'
                                            }}
                                            controls
                                            preload="metadata"
                                        />
                                    </div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                                                {video.purpose === 'wan2.2' ? 'WAN 2.2' : video.purpose === 'infinitetalk' ? 'InfiniteTalk' : 'Generated Video'}
                                            </span>
                                            {video.orientation && (
                                                <span>
                                                    {video.orientation === 'horizontal' ? '🖥️ Horizontal' : '📱 Vertical'}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', opacity: 0.7 }}>
                                            {new Date(video.timestamp).toLocaleString()}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', opacity: 0.5, marginTop: '4px', wordBreak: 'break-all' }}>
                                            {video.filename}
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

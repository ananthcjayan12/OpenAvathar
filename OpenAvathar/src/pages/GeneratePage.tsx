import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Upload,
    Image as ImageIcon,
    Mic,
    Wand2,
    Download,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Play
} from 'lucide-react';
import { useAppStore } from '@/stores/appStore';
import { comfyuiApi } from '@/services/comfyuiApi';
import { workflowPatcher } from '@/services/workflowPatcher';

export default function GeneratePage() {
    const {
        comfyuiUrl,
        purpose,
        currentPromptId,
        setCurrentPromptId,
        generationStatus,
        setGenerationStatus,
        outputVideo,
        setOutputVideo
    } = useAppStore();

    const [selectedImage, setSelectedImage] = useState<File | null>(null);
    const [selectedAudio, setSelectedAudio] = useState<File | null>(null);
    const [prompt, setPrompt] = useState('');
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const imageInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);

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
            const imageFilename = await comfyuiApi.uploadFile(comfyuiUrl, selectedImage, 'image');

            let audioFilename = '';
            if (purpose === 'infinitetalk' && selectedAudio) {
                audioFilename = await comfyuiApi.uploadFile(comfyuiUrl, selectedAudio, 'audio');
            }

            // 2. Patch Workflow
            setGenerationStatus('queuing');
            const patchedWorkflow = await workflowPatcher.patchWorkflow(purpose!, {
                imageName: imageFilename,
                audioName: audioFilename,
                prompt: prompt || 'high quality video',
                width: 768,
                height: 768
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

    const isReady = selectedImage && (purpose === 'wan2.2' || selectedAudio);

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
                                <button
                                    onClick={handleGenerate}
                                    disabled={!isReady}
                                    className="btn btn-primary"
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        fontSize: '1.05rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '10px'
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

                                    {outputVideo && (
                                        <div style={{ marginBottom: '24px' }}>
                                            <video
                                                src={outputVideo}
                                                controls
                                                autoPlay
                                                loop
                                                style={{ width: '100%', maxWidth: '600px', borderRadius: '12px', marginBottom: '16px' }}
                                            />
                                            <a
                                                href={outputVideo}
                                                download
                                                className="btn btn-primary"
                                                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px' }}
                                            >
                                                <Download size={18} /> Download Video
                                            </a>
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
        </div>
    );
}

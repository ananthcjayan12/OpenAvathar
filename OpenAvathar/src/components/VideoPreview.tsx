import { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface VideoPreviewProps {
    comfyuiUrl: string;
    filename: string;
    onClose?: () => void;
}

export default function VideoPreview({ comfyuiUrl, filename, onClose }: VideoPreviewProps) {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let objectUrl: string | null = null;

        async function loadVideo() {
            try {
                setLoading(true);
                setError(null);

                // Construct the ComfyUI view URL
                const viewUrl = `${comfyuiUrl}/view?filename=${encodeURIComponent(filename)}&type=output`;

                console.log('Fetching video from:', viewUrl);

                // Fetch the video as a blob
                const response = await fetch(viewUrl);

                if (!response.ok) {
                    throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
                }

                const blob = await response.blob();

                // Create object URL for the video
                objectUrl = URL.createObjectURL(blob);
                setVideoUrl(objectUrl);
                setLoading(false);
            } catch (err: any) {
                console.error('Video load error:', err);
                setError(err.message || 'Failed to load video');
                setLoading(false);
            }
        }

        loadVideo();

        // Cleanup: revoke object URL to prevent memory leaks
        return () => {
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [comfyuiUrl, filename]);

    const handleDownload = () => {
        if (!videoUrl) return;

        // Create a temporary anchor element to trigger download
        const a = document.createElement('a');
        a.href = videoUrl;
        a.download = filename || 'generated_video.mp4';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    if (loading) {
        return (
            <div className="video-preview-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border)'
            }}>
                <Loader2 size={48} className="spin" style={{ color: 'var(--accent)', marginBottom: '20px' }} />
                <p style={{ color: 'var(--text-secondary)' }}>Loading video...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="video-preview-container" style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '60px',
                background: 'var(--bg-secondary)',
                borderRadius: '12px',
                border: '1px solid var(--border)'
            }}>
                <p style={{ color: 'var(--error)', marginBottom: '20px' }}>❌ {error}</p>
                {onClose && (
                    <button onClick={onClose} className="btn">
                        Close
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="video-preview-container" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
        }}>
            {/* Video Player */}
            <div className="glass" style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid var(--border)'
            }}>
                <video
                    src={videoUrl || undefined}
                    controls
                    autoPlay
                    loop
                    style={{
                        width: '100%',
                        maxHeight: '70vh',
                        display: 'block',
                        background: '#000'
                    }}
                />
            </div>

            {/* Action Buttons */}
            <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center'
            }}>
                <button
                    onClick={handleDownload}
                    className="btn btn-primary"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px'
                    }}
                >
                    <Download size={20} />
                    Download Video
                </button>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="btn"
                        style={{
                            padding: '12px 24px'
                        }}
                    >
                        Generate Another
                    </button>
                )}
            </div>

            {/* Video Info */}
            <div className="glass" style={{
                padding: '16px',
                borderRadius: '8px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Filename:</span>
                    <span style={{ color: 'var(--text-primary)', fontFamily: 'monospace' }}>{filename}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Format:</span>
                    <span style={{ color: 'var(--text-primary)' }}>MP4 Video</span>
                </div>
            </div>
        </div>
    );
}

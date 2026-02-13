import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/appStore';
import { Film, Trash2 } from 'lucide-react';

export default function VideosPage() {
    const navigate = useNavigate();
    const { generatedVideos, clearVideoHistory, pods } = useAppStore();
    const hasPods = Object.keys(pods).length > 0;

    return (
        <div className="container app-page" style={{ maxWidth: '1100px' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '2.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Film size={24} /> Videos
                    </h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Your generated outputs in one place.</p>
                </div>
                {hasPods && generatedVideos.length > 0 && (
                    <button
                        onClick={() => clearVideoHistory()}
                        className="btn btn-secondary"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <Trash2 size={16} /> Clear History
                    </button>
                )}
            </header>

            {!hasPods ? (
                <div className="app-surface" style={{
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border)',
                    borderRadius: '24px',
                    padding: '80px 20px',
                    textAlign: 'center'
                }}>
                    <Film size={48} style={{ opacity: 0.2, marginBottom: '20px', color: 'var(--text-primary)' }} />
                    <h3 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>No active pod</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Start a pod to access generation outputs.
                    </p>
                    <button onClick={() => navigate('/setup')} className="btn btn-primary">
                        Deploy Pod
                    </button>
                </div>
            ) : generatedVideos.length === 0 ? (
                <div className="app-surface" style={{
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border)',
                    borderRadius: '24px',
                    padding: '80px 20px',
                    textAlign: 'center'
                }}>
                    <Film size={48} style={{ opacity: 0.2, marginBottom: '20px', color: 'var(--text-primary)' }} />
                    <h3 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>No videos yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
                        Generate your first avatar video in the Studio.
                    </p>
                    <button onClick={() => navigate('/studio')} className="btn btn-primary">
                        Go to Studio
                    </button>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
                    {generatedVideos.map((video) => (
                        <div key={video.id} className="card glass" style={{ padding: '16px', background: 'white' }}>
                            <video
                                src={video.url}
                                controls
                                style={{ width: '100%', borderRadius: '12px', background: '#000' }}
                            />
                            <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                {new Date(video.timestamp).toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

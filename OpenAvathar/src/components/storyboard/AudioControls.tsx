/**
 * Audio Controls Component
 * 
 * Handles voice selection, audio generation, and playback
 */

import { useState, useEffect, useRef } from 'react';
import { Volume2, Download, Loader2, Play, Pause, RotateCcw } from 'lucide-react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { ElevenLabsService } from '@/services/elevenLabsService';

// Cache duration for voice list (24 hours in milliseconds)
const VOICE_CACHE_DURATION = 24 * 60 * 60 * 1000;

interface AudioControlsProps {
  onGenerate: (voiceId: string) => void;
  isGenerating: boolean;
  audioUrl: string | null;
  audioBlob: Blob | null;
}

export default function AudioControls({ 
  onGenerate, 
  isGenerating,
  audioUrl,
  audioBlob
}: AudioControlsProps) {
  const { 
    elevenLabsApiKey,
    defaultVoiceId,
    setDefaultVoiceId,
    voices,
    setVoices,
    voicesLastFetched,
    updateVoicesCache
  } = useStoryboardStore();

  const [selectedVoiceId, setSelectedVoiceId] = useState(defaultVoiceId || '');
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load voices on mount if not cached or cache is old
  useEffect(() => {
    const shouldFetchVoices = !voicesLastFetched || 
      (Date.now() - voicesLastFetched > VOICE_CACHE_DURATION);

    if (elevenLabsApiKey && shouldFetchVoices) {
      fetchVoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elevenLabsApiKey]);

  const fetchVoices = async () => {
    if (!elevenLabsApiKey) return;

    setLoadingVoices(true);
    try {
      const service = new ElevenLabsService(elevenLabsApiKey);
      const result = await service.getVoices();
      
      if (result.success && result.data) {
        setVoices(result.data);
        updateVoicesCache();
        
        // Set default voice if not set
        if (!selectedVoiceId && result.data.length > 0) {
          const defaultVoice = result.data[0];
          setSelectedVoiceId(defaultVoice.voice_id);
          setDefaultVoiceId(defaultVoice.voice_id);
        }
      }
    } catch (err) {
      console.error('Failed to load voices:', err);
    } finally {
      setLoadingVoices(false);
    }
  };

  const handleGenerate = () => {
    if (selectedVoiceId) {
      setDefaultVoiceId(selectedVoiceId);
      onGenerate(selectedVoiceId);
    }
  };

  const handleDownload = () => {
    if (!audioBlob) return;

    const url = URL.createObjectURL(audioBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `narration_${Date.now()}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleRestart = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    audioRef.current.play();
    setIsPlaying(true);
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid var(--border-color)'
    }}>
      <h3 style={{
        fontSize: '18px',
        fontWeight: 600,
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          background: 'var(--accent)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 600
        }}>
          3
        </span>
        Generate Audio
      </h3>

      {/* Voice Selection */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>
          Select Voice
        </label>
        
        {loadingVoices ? (
          <div style={{
            padding: '12px',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: 'var(--text-secondary)'
          }}>
            <Loader2 size={16} className="spin" />
            Loading voices...
          </div>
        ) : voices.length > 0 ? (
          <select
            value={selectedVoiceId}
            onChange={(e) => setSelectedVoiceId(e.target.value)}
            disabled={isGenerating}
            style={{
              width: '100%',
              padding: '10px 16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit'
            }}
          >
            <option value="">Select a voice...</option>
            {voices.map((voice) => (
              <option key={voice.voice_id} value={voice.voice_id}>
                {voice.name} {voice.category ? `- ${voice.category}` : ''}
              </option>
            ))}
          </select>
        ) : (
          <div>
            <div style={{
              padding: '12px',
              background: 'var(--bg-tertiary)',
              borderRadius: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              marginBottom: '8px'
            }}>
              No voices loaded. Click to fetch available voices.
            </div>
            <button
              onClick={fetchVoices}
              style={{
                padding: '8px 16px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer'
              }}
            >
              Load Voices
            </button>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={!selectedVoiceId || isGenerating}
        style={{
          width: '100%',
          padding: '14px',
          background: selectedVoiceId && !isGenerating ? 'var(--accent)' : 'var(--bg-tertiary)',
          color: selectedVoiceId && !isGenerating ? 'white' : 'var(--text-secondary)',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: selectedVoiceId && !isGenerating ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          marginBottom: '20px'
        }}
        onMouseOver={(e) => {
          if (selectedVoiceId && !isGenerating) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 8px 16px rgba(79, 70, 229, 0.3)';
          }
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        {isGenerating ? (
          <>
            <Loader2 size={20} className="spin" />
            Generating Audio...
          </>
        ) : (
          <>
            <Volume2 size={20} />
            Generate Audio
          </>
        )}
      </button>

      {/* Audio Player */}
      {audioUrl && (
        <div style={{
          padding: '16px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          border: '1px solid var(--accent)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '12px'
          }}>
            <button
              onClick={togglePlayPause}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'transform 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: '2px' }} />}
            </button>

            <button
              onClick={handleRestart}
              style={{
                padding: '8px 12px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px'
              }}
            >
              <RotateCcw size={16} />
              Restart
            </button>

            <button
              onClick={handleDownload}
              style={{
                marginLeft: 'auto',
                padding: '8px 12px',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                fontWeight: 500
              }}
            >
              <Download size={16} />
              Download
            </button>
          </div>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={handleAudioEnded}
            style={{ width: '100%' }}
            controls
          />
        </div>
      )}

      {/* Add spinning animation */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
}

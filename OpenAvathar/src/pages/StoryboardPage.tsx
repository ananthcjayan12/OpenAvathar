/**
 * Storyboard Page
 * 
 * Main page for the Storyboard feature.
 * Allows users to convert ideas or YouTube content into scripts and audio.
 */

import { useEffect } from 'react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import { GeminiService } from '@/services/geminiService';
import { ElevenLabsService } from '@/services/elevenLabsService';
import { FileText, Sparkles, AlertCircle } from 'lucide-react';
import StoryboardHeader from '@/components/storyboard/StoryboardHeader';
import InputPanel from '@/components/storyboard/InputPanel';
import ScriptDisplay from '@/components/storyboard/ScriptDisplay';
import AudioControls from '@/components/storyboard/AudioControls';
import { secureStorage } from '@/utils/secureStorage';

export default function StoryboardPage() {
  const {
    geminiApiKey,
    elevenLabsApiKey,
    inputMode,
    inputContent,
    youtubeUrl,
    scriptStatus,
    audioStatus,
    currentScript,
    audioUrl,
    audioBlob,
    error,
    setScriptStatus,
    setAudioStatus,
    setCurrentScript,
    setAudioUrl,
    setAudioBlob,
    setError,
    clearError,
    setGeminiApiKey,
    setElevenLabsApiKey,
  } = useStoryboardStore();

  // Load API keys from secure storage on mount
  useEffect(() => {
    const geminiKey = secureStorage.get('gemini_api_key');
    const elevenLabsKey = secureStorage.get('elevenlabs_api_key');
    
    if (geminiKey && !geminiApiKey) {
      setGeminiApiKey(geminiKey);
    }
    if (elevenLabsKey && !elevenLabsApiKey) {
      setElevenLabsApiKey(elevenLabsKey);
    }
  }, [geminiApiKey, elevenLabsApiKey, setGeminiApiKey, setElevenLabsApiKey]);

  // Check if API keys are configured
  const hasGeminiKey = !!geminiApiKey;
  const hasElevenLabsKey = !!elevenLabsApiKey;

  // Handle script generation
  const handleGenerateScript = async () => {
    if (!hasGeminiKey) {
      setError({
        title: 'API Key Required',
        message: 'Please configure your Google Gemini API key in Settings.',
        severity: 'error',
        action: {
          label: 'Go to Settings',
          handler: () => {
            window.location.href = '/settings';
          }
        }
      });
      return;
    }

    const content = inputMode === 'idea' ? inputContent : youtubeUrl;
    if (!content.trim()) {
      setError({
        title: 'Input Required',
        message: inputMode === 'idea' 
          ? 'Please enter your content idea.' 
          : 'Please enter a YouTube URL.',
        severity: 'warning'
      });
      return;
    }

    clearError();
    setScriptStatus('generating');

    try {
      const service = new GeminiService(geminiApiKey!);
      let result;

      if (inputMode === 'idea') {
        result = await service.generateScript({
          mode: 'idea',
          content: inputContent
        });
      } else {
        result = await service.analyzeYouTubeVideo(youtubeUrl);
      }

      if (result.success && result.data) {
        setCurrentScript(result.data);
        setScriptStatus('completed');
      } else {
        setScriptStatus('error');
        setError({
          title: 'Generation Failed',
          message: result.error?.message || 'Failed to generate script.',
          severity: 'error'
        });
      }
    } catch (err) {
      setScriptStatus('error');
      setError({
        title: 'Unexpected Error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        severity: 'error'
      });
    }
  };

  // Handle audio generation
  const handleGenerateAudio = async (voiceId: string) => {
    if (!hasElevenLabsKey) {
      setError({
        title: 'API Key Required',
        message: 'Please configure your ElevenLabs API key in Settings.',
        severity: 'error',
        action: {
          label: 'Go to Settings',
          handler: () => {
            window.location.href = '/settings';
          }
        }
      });
      return;
    }

    if (!currentScript) {
      setError({
        title: 'No Script',
        message: 'Please generate a script first.',
        severity: 'warning'
      });
      return;
    }

    clearError();
    setAudioStatus('generating');

    try {
      const service = new ElevenLabsService(elevenLabsApiKey!);
      const result = await service.generateAudio(
        currentScript.narrationScript,
        {
          voiceId,
          quality: 'production',
          stability: 0.5,
          similarityBoost: 0.75
        }
      );

      if (result.success && result.data) {
        const url = URL.createObjectURL(result.data);
        setAudioUrl(url);
        setAudioBlob(result.data);
        setAudioStatus('completed');
      } else {
        setAudioStatus('error');
        setError({
          title: 'Audio Generation Failed',
          message: result.error?.message || 'Failed to generate audio.',
          severity: 'error'
        });
      }
    } catch (err) {
      setAudioStatus('error');
      setError({
        title: 'Unexpected Error',
        message: err instanceof Error ? err.message : 'An unexpected error occurred.',
        severity: 'error'
      });
    }
  };

  // Empty state - show welcome message only when no API key
  if (!hasGeminiKey) {
    return (
      <div style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}>
        <div style={{
          padding: '24px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)'
        }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: 0
          }}>
            <FileText size={28} style={{ color: 'var(--accent)' }} />
            Storyboard
            <span style={{
              fontSize: '12px',
              padding: '2px 8px',
              background: 'var(--accent)',
              color: 'white',
              borderRadius: '4px',
              fontWeight: 500
            }}>
              NEW
            </span>
          </h1>
          <p style={{
            marginTop: '8px',
            color: 'var(--text-secondary)',
            fontSize: '14px'
          }}>
            Transform your ideas into professional scripts and audio for avatar videos
          </p>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px'
        }}>
          <div style={{
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #7c3aed)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <Sparkles size={40} color="white" />
            </div>

            <h2 style={{
              fontSize: '24px',
              fontWeight: 600,
              marginBottom: '16px'
            }}>
              Welcome to Storyboard
            </h2>

            <p style={{
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
              marginBottom: '32px'
            }}>
              To get started, you'll need to configure your Google Gemini API key.
              This allows you to generate professional scripts from your ideas or YouTube content.
            </p>

            {!hasGeminiKey && (
              <button
                onClick={() => window.location.href = '/settings'}
                style={{
                  padding: '12px 24px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 16px rgba(79, 70, 229, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                Configure API Keys
              </button>
            )}

            <div style={{
              marginTop: '48px',
              padding: '16px',
              background: 'var(--bg-secondary)',
              borderRadius: '8px',
              border: '1px solid var(--border-color)'
            }}>
              <p style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                margin: 0
              }}>
                💡 <strong>Tip:</strong> Generated scripts can be used with OpenAvathar's avatar generation to create engaging video content.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>
      {/* Header */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        <StoryboardHeader />
      </div>

      {/* Error Display */}
      {error && (
        <div style={{
          margin: '16px 24px',
          padding: '16px',
          background: error.severity === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
          border: `1px solid ${error.severity === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'start',
          gap: '12px'
        }}>
          <AlertCircle 
            size={20} 
            color={error.severity === 'error' ? '#ef4444' : '#f59e0b'} 
          />
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', fontWeight: 600 }}>
              {error.title}
            </h4>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              {error.message}
            </p>
            {error.action && (
              <button
                onClick={error.action.handler}
                style={{
                  marginTop: '12px',
                  padding: '6px 12px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {error.action.label}
              </button>
            )}
          </div>
          <button
            onClick={clearError}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content */}
      <div style={{
        flex: 1,
        overflow: 'auto',
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '24px',
        alignContent: 'start'
      }}>
        {/* Input Panel */}
        <InputPanel 
          onGenerate={handleGenerateScript}
          isGenerating={scriptStatus === 'generating'}
        />

        {/* Script Display */}
        {currentScript && (
          <ScriptDisplay script={currentScript} />
        )}

        {/* Audio Controls */}
        {currentScript && hasElevenLabsKey && (
          <AudioControls 
            onGenerate={handleGenerateAudio}
            isGenerating={audioStatus === 'generating'}
            audioUrl={audioUrl}
            audioBlob={audioBlob}
          />
        )}
      </div>
    </div>
  );
}

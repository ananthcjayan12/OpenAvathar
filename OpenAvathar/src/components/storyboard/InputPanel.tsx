/**
 * Input Panel Component
 * 
 * Handles user input for both idea and YouTube modes
 */

import { Sparkles, Loader2 } from 'lucide-react';
import { useStoryboardStore } from '@/stores/storyboardStore';

interface InputPanelProps {
  onGenerate: () => void;
  isGenerating: boolean;
}

export default function InputPanel({ onGenerate, isGenerating }: InputPanelProps) {
  const { 
    inputMode, 
    inputContent, 
    youtubeUrl,
    setInputContent,
    setYoutubeUrl,
    defaultTone,
    setDefaultTone
  } = useStoryboardStore();

  const isIdea = inputMode === 'idea';
  const currentInput = isIdea ? inputContent : youtubeUrl;
  const minLength = isIdea ? 50 : 10;
  const canGenerate = currentInput.length >= minLength && !isGenerating;

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
          1
        </span>
        {isIdea ? 'Your Idea' : 'YouTube URL'}
      </h3>

      {isIdea ? (
        <div>
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            placeholder="Enter your content idea here... Be specific about your message, target audience, and desired outcome.

Example: Create a script about the benefits of morning routines for productivity. Target audience: young professionals. Tone: motivational and energetic."
            style={{
              width: '100%',
              minHeight: '200px',
              padding: '16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              lineHeight: 1.6,
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <div style={{
            marginTop: '8px',
            fontSize: '12px',
            color: inputContent.length < minLength ? 'var(--error)' : 'var(--text-secondary)'
          }}>
            {inputContent.length} / {minLength} characters minimum
          </div>
        </div>
      ) : (
        <div>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
              fontSize: '14px',
              fontFamily: 'inherit'
            }}
          />
          <p style={{
            marginTop: '12px',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            lineHeight: 1.5
          }}>
            💡 <strong>Tip:</strong> Best results with videos under 10 minutes. The AI will analyze the content and create an engaging viral-style script.
          </p>
        </div>
      )}

      {/* Tone Selector */}
      <div style={{ marginTop: '24px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>
          Script Tone
        </label>
        <select
          value={defaultTone}
          onChange={(e) => setDefaultTone(e.target.value as any)}
          style={{
            width: '100%',
            padding: '10px 16px',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: 'inherit'
          }}
        >
          <option value="energetic">Energetic - High-energy and motivating</option>
          <option value="professional">Professional - Authoritative and informative</option>
          <option value="casual">Casual - Conversational and friendly</option>
          <option value="persuasive">Persuasive - Compelling and action-oriented</option>
        </select>
      </div>

      {/* Generate Button */}
      <button
        onClick={onGenerate}
        disabled={!canGenerate}
        style={{
          marginTop: '24px',
          width: '100%',
          padding: '14px',
          background: canGenerate ? 'var(--accent)' : 'var(--bg-tertiary)',
          color: canGenerate ? 'white' : 'var(--text-secondary)',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: canGenerate ? 'pointer' : 'not-allowed',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          transition: 'all 0.2s',
          opacity: isGenerating ? 0.8 : 1
        }}
        onMouseOver={(e) => {
          if (canGenerate && !isGenerating) {
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
            Generating Script...
          </>
        ) : (
          <>
            <Sparkles size={20} />
            Generate Script
          </>
        )}
      </button>

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

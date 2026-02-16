/**
 * Input Panel Component
 * 
 * Handles user input for both idea and YouTube modes
 */

import { Sparkles, Loader2 } from 'lucide-react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import type { ScriptTone } from '@/types/storyboard';

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
    setDefaultTone,
    targetDuration,
    setTargetDuration,
    selectedLanguage,
    setSelectedLanguage
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
          onChange={(e) => setDefaultTone(e.target.value as ScriptTone)}
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

      {/* Language Selector */}
      <div style={{ marginTop: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: 500,
          marginBottom: '8px',
          color: 'var(--text-primary)'
        }}>
          Script Language
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => setSelectedLanguage(e.target.value)}
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
          <option value="">Auto (Match Input/Video)</option>
          <option value="Malayalam">Malayalam</option>
          <option value="English">English</option>
          <option value="Hindi">Hindi</option>
          <option value="Tamil">Tamil</option>
          <option value="Telugu">Telugu</option>
          <option value="Kannada">Kannada</option>
          <option value="Arabic">Arabic</option>
          <option value="Spanish">Spanish</option>
          <option value="French">French</option>
        </select>
        <p style={{
          marginTop: '6px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          Select 'Auto' to keep the language of the source video or idea.
        </p>
      </div>

      {/* Target Duration Input */}
      <div style={{ marginTop: '16px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px'
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)'
          }}>
            Target Duration
          </label>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--accent)',
            background: 'rgba(79, 70, 229, 0.1)',
            padding: '2px 8px',
            borderRadius: '4px'
          }}>
            {targetDuration}s
          </span>
        </div>
        <input
          type="range"
          min="10"
          max="120"
          step="5"
          value={targetDuration}
          onChange={(e) => setTargetDuration(Number(e.target.value))}
          style={{
            width: '100%',
            height: '6px',
            background: 'var(--bg-tertiary)',
            borderRadius: '3px',
            appearance: 'none',
            cursor: 'pointer',
            outline: 'none',
            marginTop: '12px',
            marginBottom: '12px'
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '10px',
          color: 'var(--text-secondary)',
          marginTop: '-4px'
        }}>
          <span>10s</span>
          <span>60s</span>
          <span>120s</span>
        </div>
        <p style={{
          marginTop: '12px',
          fontSize: '12px',
          color: 'var(--text-secondary)'
        }}>
          Recommended: 30-60 seconds for optimal engagement
        </p>
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

      {/* Add animations and slider styling */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          
          /* Custom Slider Styling */
          input[type=range]::-webkit-slider-thumb {
            appearance: none;
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            border: 2px solid var(--bg-secondary);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s;
          }
          input[type=range]::-webkit-slider-thumb:hover {
            transform: scale(1.1);
            box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.2);
          }
          input[type=range]::-moz-range-thumb {
            height: 18px;
            width: 18px;
            border-radius: 50%;
            background: var(--accent);
            cursor: pointer;
            border: 2px solid var(--bg-secondary);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
        `}
      </style>
    </div>
  );
}

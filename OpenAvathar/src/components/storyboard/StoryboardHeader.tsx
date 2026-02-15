/**
 * Storyboard Header Component
 * 
 * Header with mode toggle and new session button
 */

import { FileText, Lightbulb, Youtube, Plus } from 'lucide-react';
import { useStoryboardStore } from '@/stores/storyboardStore';
import type { InputMode } from '@/types/storyboard';

export default function StoryboardHeader() {
  const { inputMode, setInputMode, resetSession } = useStoryboardStore();

  const handleModeChange = (mode: InputMode) => {
    setInputMode(mode);
  };

  const handleNewSession = () => {
    if (confirm('Start a new session? Current work will be saved to history.')) {
      resetSession();
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <FileText size={28} style={{ color: 'var(--accent)' }} />
        <div>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: 600,
            margin: 0
          }}>
            Storyboard
          </h1>
          <p style={{
            marginTop: '2px',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            margin: 0
          }}>
            Create viral scripts and audio
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Mode Toggle */}
        <div style={{
          display: 'flex',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          padding: '4px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => handleModeChange('idea')}
            style={{
              padding: '8px 16px',
              background: inputMode === 'idea' ? 'var(--accent)' : 'transparent',
              color: inputMode === 'idea' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Lightbulb size={16} />
            Idea
          </button>
          <button
            onClick={() => handleModeChange('youtube')}
            style={{
              padding: '8px 16px',
              background: inputMode === 'youtube' ? 'var(--accent)' : 'transparent',
              color: inputMode === 'youtube' ? 'white' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s'
            }}
          >
            <Youtube size={16} />
            YouTube
          </button>
        </div>

        {/* New Session Button */}
        <button
          onClick={handleNewSession}
          style={{
            padding: '8px 16px',
            background: 'var(--bg-tertiary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'var(--bg-tertiary)';
          }}
        >
          <Plus size={16} />
          New Session
        </button>
      </div>
    </div>
  );
}

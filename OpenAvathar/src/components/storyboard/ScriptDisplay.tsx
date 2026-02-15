/**
 * Script Display Component
 * 
 * Displays the generated script with editing capabilities
 */

import { Edit2, Copy, Download, Clock, Type } from 'lucide-react';
import { useState } from 'react';
import type { Script } from '@/types/storyboard';
import { useStoryboardStore } from '@/stores/storyboardStore';

interface ScriptDisplayProps {
  script: Script;
}

export default function ScriptDisplay({ script }: ScriptDisplayProps) {
  const { setCurrentScript } = useStoryboardStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedScript, setEditedScript] = useState(script.narrationScript);

  const handleSave = () => {
    const updatedScript = {
      ...script,
      narrationScript: editedScript,
      metadata: {
        ...script.metadata,
        updatedAt: Date.now(),
        wordCount: editedScript.split(/\s+/).length,
        estimatedDuration: Math.ceil((editedScript.split(/\s+/).length / 150) * 60)
      }
    };
    setCurrentScript(updatedScript);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(script.narrationScript);
      // TODO: Replace with toast notification for better UX
      // For now, using alert as a temporary solution
      alert('Script copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy script. Please try again.');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([
      `${script.title}\n\n`,
      `Hook: ${script.hook}\n\n`,
      `Script:\n${script.narrationScript}\n\n`,
      `---\n`,
      `Word Count: ${script.metadata.wordCount}\n`,
      `Estimated Duration: ${script.metadata.estimatedDuration}s\n`,
      `Tone: ${script.metadata.tone}\n`
    ], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      background: 'var(--bg-secondary)',
      borderRadius: '12px',
      padding: '24px',
      border: '1px solid var(--border-color)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          margin: 0
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
            2
          </span>
          Your Script
        </h3>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setIsEditing(!isEditing)}
            title="Edit Script"
            style={{
              padding: '8px',
              background: isEditing ? 'var(--accent)' : 'var(--bg-tertiary)',
              color: isEditing ? 'white' : 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={handleCopy}
            title="Copy Script"
            style={{
              padding: '8px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <Copy size={16} />
          </button>
          <button
            onClick={handleDownload}
            title="Download Script"
            style={{
              padding: '8px',
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              transition: 'all 0.2s'
            }}
          >
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* Script Metadata */}
      <div style={{
        display: 'flex',
        gap: '16px',
        marginBottom: '16px',
        padding: '12px',
        background: 'var(--bg-tertiary)',
        borderRadius: '8px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <Type size={14} color="var(--accent)" />
          <span style={{ color: 'var(--text-secondary)' }}>{script.metadata.wordCount} words</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
          <Clock size={14} color="var(--accent)" />
          <span style={{ color: 'var(--text-secondary)' }}>~{script.metadata.estimatedDuration}s</span>
        </div>
      </div>

      {/* Title */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Title
        </label>
        <div style={{
          padding: '12px 16px',
          background: 'var(--bg-tertiary)',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600
        }}>
          {script.title}
        </div>
      </div>

      {/* Hook */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Hook (First 3-5 seconds)
        </label>
        <div style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1), rgba(124, 58, 237, 0.1))',
          border: '1px solid rgba(79, 70, 229, 0.3)',
          borderRadius: '8px',
          fontSize: '14px',
          fontStyle: 'italic'
        }}>
          {script.hook}
        </div>
      </div>

      {/* Full Script */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Full Narration Script
        </label>
        {isEditing ? (
          <>
            <textarea
              value={editedScript}
              onChange={(e) => setEditedScript(e.target.value)}
              style={{
                width: '100%',
                minHeight: '300px',
                padding: '16px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--accent)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: 1.8,
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button
                onClick={handleSave}
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
                Save Changes
              </button>
              <button
                onClick={() => {
                  setEditedScript(script.narrationScript);
                  setIsEditing(false);
                }}
                style={{
                  padding: '8px 16px',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </>
        ) : (
          <div style={{
            padding: '16px',
            background: 'var(--bg-tertiary)',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: 1.8,
            whiteSpace: 'pre-wrap'
          }}>
            {script.narrationScript}
          </div>
        )}
      </div>
    </div>
  );
}

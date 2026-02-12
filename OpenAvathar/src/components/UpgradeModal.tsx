import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetsIn?: string | null;
}

export default function UpgradeModal({ isOpen, onClose, resetsIn }: UpgradeModalProps) {
  const gumroadUrl = (import.meta.env.VITE_GUMROAD_URL as string | undefined) ?? '';

  return (
    <AnimatePresence>
      {isOpen ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            zIndex: 1000,
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="glass"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '40px',
              borderRadius: '28px',
              position: 'relative',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid var(--border)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-tertiary)',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              className="btn-icon"
            >
              <X size={20} />
            </button>

            <div style={{
              width: '72px',
              height: '72px',
              background: 'var(--gradient-primary)',
              borderRadius: '20px',
              display: 'grid',
              placeItems: 'center',
              margin: '0 auto 24px',
              color: 'white',
              boxShadow: '0 12px 24px -8px var(--accent)'
            }}>
              <Sparkles size={32} fill="currentColor" />
            </div>

            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '12px', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Daily Limit Reached
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Free users can generate <strong>1 studio-quality video</strong> per day. Upgrade to Pro to unlock unlimited generations and priority processing.
            </p>

            {resetsIn && (
              <div style={{
                background: 'var(--bg-tertiary)',
                padding: '10px 16px',
                borderRadius: '12px',
                display: 'inline-flex',
                gap: '8px',
                marginBottom: '32px',
                fontSize: '0.9rem',
                color: 'var(--text-secondary)'
              }}>
                <span style={{ opacity: 0.7 }}>Resets in:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{resetsIn}</strong>
              </div>
            )}

            <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: '1fr 1fr' }}>
              <button
                className="btn btn-secondary"
                onClick={onClose}
                style={{ height: '52px', fontSize: '0.95rem' }}
              >
                Maybe Later
              </button>
              <a
                className="btn btn-primary"
                href={gumroadUrl || undefined}
                target="_blank"
                rel="noreferrer"
                style={{
                  height: '52px',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  pointerEvents: gumroadUrl ? 'auto' : 'none',
                  opacity: gumroadUrl ? 1 : 0.6
                }}
                aria-disabled={!gumroadUrl}
              >
                Upgrade Now • $89
              </a>
            </div>

            {!gumroadUrl && (
              <p style={{ marginTop: '20px', color: 'var(--error)', fontSize: '0.8rem', fontWeight: 500 }}>
                Checkout currently unavailable (Config missing)
              </p>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

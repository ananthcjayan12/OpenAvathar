import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetsIn?: string | null;
}

export default function UpgradeModal({ isOpen, onClose, resetsIn }: UpgradeModalProps) {
  const gumroadUrl = (import.meta.env.VITE_GUMROAD_URL as string | undefined) ?? '';
  const gumroadCheckoutUrl = gumroadUrl
    ? `${gumroadUrl}${gumroadUrl.includes('?') ? '&' : '?'}wanted=true`
    : undefined;

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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
            initial={{ scale: 0.98, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="glass"
            style={{
              maxWidth: '480px',
              width: '100%',
              padding: '40px',
              borderRadius: '28px',
              position: 'relative',
              textAlign: 'center',
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid var(--border)',
              willChange: 'transform, opacity'
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
              <button
                type="button"
                className="btn btn-primary gumroad-cta-btn"
                onClick={() => {
                  if (!gumroadCheckoutUrl) return;
                  window.location.assign(gumroadCheckoutUrl);
                }}
                style={{
                  height: '52px',
                  fontSize: '1rem',
                  textDecoration: 'none',
                  color: 'white',
                  fontWeight: 700,
                  boxShadow: '0 10px 24px -10px var(--accent)',
                  pointerEvents: gumroadCheckoutUrl ? 'auto' : 'none',
                  opacity: gumroadCheckoutUrl ? 1 : 0.6
                }}
                disabled={!gumroadCheckoutUrl}
                aria-disabled={!gumroadCheckoutUrl}
              >
                Upgrade Now • $39
              </button>
            </div>
            <p className="gumroad-cta-note">
              Secure checkout by Gumroad. Payment completes on Gumroad checkout.
            </p>

            <div style={{
              marginTop: '32px',
              paddingTop: '24px',
              borderTop: '1px solid var(--border)',
              textAlign: 'left'
            }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Already have a license key?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Paste your key here..."
                  className="input-base"
                  style={{
                    flex: 1,
                    height: '42px',
                    fontSize: '0.9rem',
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-tertiary)'
                  }}
                  id="license-key-input"
                />
                <button
                  className="btn btn-secondary"
                  style={{ height: '42px', padding: '0 16px', fontSize: '0.85rem' }}
                  onClick={async () => {
                    const input = document.getElementById('license-key-input') as HTMLInputElement;
                    const key = input?.value.trim();
                    if (!key) return;

                    // The actual activation logic will be handled by your licenseService
                    alert(`Activation logic for ${key} would run here.`);
                  }}
                >
                  Activate
                </button>
              </div>
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

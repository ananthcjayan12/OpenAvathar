import { AnimatePresence, motion } from 'framer-motion';

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
            background: 'rgba(0,0,0,0.55)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            zIndex: 50,
          }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 8 }}
            transition={{ duration: 0.15 }}
            className="card glass"
            style={{ maxWidth: '520px', width: '100%', padding: '24px' }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '8px' }}>Daily Limit Reached</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Free users can generate <strong>1 video/day</strong>. Upgrade to Pro for unlimited generations.
            </p>
            {resetsIn ? (
              <p style={{ color: 'var(--text-secondary)', marginBottom: '18px', fontSize: '0.9rem' }}>
                Resets in: <strong>{resetsIn}</strong>
              </p>
            ) : null}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
              <button className="btn-secondary" onClick={onClose}>
                Wait Until Tomorrow
              </button>
              <a
                className="btn-primary"
                href={gumroadUrl || undefined}
                target="_blank"
                rel="noreferrer"
                style={{ pointerEvents: gumroadUrl ? 'auto' : 'none', opacity: gumroadUrl ? 1 : 0.6 }}
                aria-disabled={!gumroadUrl}
              >
                Upgrade $29
              </a>
            </div>

            {!gumroadUrl ? (
              <p style={{ marginTop: '12px', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Set <code>VITE_GUMROAD_URL</code> to enable upgrade checkout.
              </p>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

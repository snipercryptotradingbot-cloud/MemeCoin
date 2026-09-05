'use client';

const STEPS = [
  { label: 'Uploading Image' },
  { label: 'Uploading Metadata' },
  { label: 'Building Transaction' },
  { label: 'Sign in Wallet' },
  { label: 'Confirming' },
];

const STATUS_TO_STEP = {
  uploading_image: 0,
  uploading_metadata: 1,
  building_tx: 2,
  awaiting_signature: 3,
  confirming: 4,
};

export default function ProgressOverlay({ status, error, onRetry, onCancel }) {
  const currentStep = STATUS_TO_STEP[status] ?? -1;

  if (currentStep === -1 && status !== 'error') return null;

  return (
    <div className="overlay" id="progress-overlay">
      <div className="progress-modal">
        {status === 'error' ? (
          <div className="progress-error animate-scale-in">
            <div className="progress-error-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h3 className="progress-error-title font-display">Something went wrong</h3>
            <p className="progress-error-message">{error || 'An unexpected error occurred'}</p>
            <div className="progress-error-actions">
              <button className="btn btn-primary" onClick={onRetry} id="btn-retry">
                Try Again
              </button>
              <button className="btn btn-secondary" onClick={onCancel} id="btn-cancel">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="progress-steps animate-scale-in">
            <div className="progress-spinner-wrap">
              <div className="spinner spinner-lg" />
            </div>
            <h3 className="progress-title font-display">Creating Your Token</h3>
            <p className="progress-subtitle">Please don&apos;t close this window</p>

            <div className="progress-list">
              {STEPS.map((step, i) => (
                <div
                  key={i}
                  className={`progress-item ${
                    i < currentStep ? 'completed' : i === currentStep ? 'active' : 'pending'
                  }`}
                >
                  <div className="progress-item-indicator">
                    {i < currentStep ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--success)' }}>
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    ) : i === currentStep ? (
                      <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    ) : (
                      <span className="progress-dot" />
                    )}
                  </div>
                  <span className="progress-item-label">{step.label}</span>
                </div>
              ))}
            </div>

            {status === 'awaiting_signature' && (
              <div className="progress-wallet-hint animate-fade-in">
                Check your wallet for a signature request
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .progress-modal {
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          padding: var(--space-10);
          max-width: 440px;
          width: 90%;
          text-align: center;
        }

        .progress-spinner-wrap {
          display: flex;
          justify-content: center;
          margin-bottom: var(--space-6);
        }

        .progress-title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }

        .progress-subtitle {
          font-size: var(--text-sm);
          color: var(--muted);
          margin-bottom: var(--space-8);
          font-family: var(--font-mono);
          letter-spacing: 0.05em;
        }

        .progress-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          text-align: left;
        }

        .progress-item {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          opacity: 0.4;
          transition: opacity var(--transition-base);
        }

        .progress-item.active {
          opacity: 1;
        }

        .progress-item.completed {
          opacity: 0.7;
        }

        .progress-item-indicator {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .progress-check {
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .progress-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          background: var(--hairline);
        }

        .progress-item-icon {
          display: none;
        }

        .progress-item-label {
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--body);
        }

        .progress-item.active .progress-item-label {
          color: var(--ink);
          font-weight: 600;
        }

        .progress-item.completed .progress-item-label {
          color: var(--muted);
        }

        .progress-wallet-hint {
          margin-top: var(--space-6);
          padding: var(--space-3) var(--space-4);
          background: rgba(60, 255, 208, 0.1);
          border: 1px solid rgba(60, 255, 208, 0.25);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--brand-mint);
        }

        .progress-error-icon {
          margin-bottom: var(--space-4);
          display: inline-flex;
        }

        .progress-error-title {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }

        .progress-error-message {
          font-size: var(--text-sm);
          color: var(--body);
          margin-bottom: var(--space-6);
          line-height: 1.5;
          word-break: break-word;
        }

        .progress-error-actions {
          display: flex;
          gap: var(--space-3);
          justify-content: center;
        }
      `}</style>
    </div>
  );
}

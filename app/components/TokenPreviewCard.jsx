'use client';

import { formatNumber } from '@/app/lib/solana';

export default function TokenPreviewCard({ name, symbol, imagePreview, supply, decimals, description, compact = false }) {
  return (
    <div className={`token-preview ${compact ? 'compact' : ''}`} id="token-preview-card">
      <div className="token-preview-image-wrap">
        {imagePreview ? (
          <img src={imagePreview} alt={name || 'Token'} className="token-preview-image" />
        ) : (
          <div className="token-preview-placeholder">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-mint)' }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 6v12M8 10h8M8 14h8"/>
            </svg>
          </div>
        )}
      </div>

      <div className="token-preview-info">
        <div className="token-preview-header">
          <h3 className="token-preview-name font-display">
            {name || 'Token Name'}
          </h3>
          <span className="badge badge-violet">
            ${symbol || 'SYMBOL'}
          </span>
        </div>

        {description && !compact && (
          <p className="token-preview-desc">{description}</p>
        )}

        <div className="token-preview-stats">
          <div className="token-preview-stat">
            <span className="token-preview-stat-label">Supply</span>
            <span className="token-preview-stat-value font-mono">
              {formatNumber(supply || 0)}
            </span>
          </div>
          <div className="token-preview-stat">
            <span className="token-preview-stat-label">Decimals</span>
            <span className="token-preview-stat-value font-mono">
              {decimals ?? 9}
            </span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .token-preview {
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
          position: relative;
          overflow: hidden;
        }

        .token-preview::before {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(99, 102, 241, 0.03);
          pointer-events: none;
        }

        .token-preview-image-wrap {
          width: 80px;
          height: 80px;
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: var(--space-4);
          border: 1px solid var(--border-subtle);
          flex-shrink: 0;
        }

        .compact .token-preview-image-wrap {
          width: 56px;
          height: 56px;
        }

        .token-preview-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .token-preview-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-input);
          font-size: var(--text-3xl);
        }

        .compact .token-preview-placeholder {
          font-size: var(--text-xl);
        }

        .token-preview-header {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          margin-bottom: var(--space-2);
          flex-wrap: wrap;
        }

        .token-preview-name {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--text-primary);
        }

        .compact .token-preview-name {
          font-size: var(--text-base);
        }

        .token-preview-desc {
          font-size: var(--text-sm);
          color: var(--text-secondary);
          line-height: 1.5;
          margin-bottom: var(--space-4);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .token-preview-stats {
          display: flex;
          gap: var(--space-6);
          padding-top: var(--space-4);
          border-top: 1px solid var(--border-subtle);
        }

        .token-preview-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .token-preview-stat-label {
          font-size: var(--text-xs);
          color: var(--text-tertiary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .token-preview-stat-value {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--text-primary);
        }
      `}</style>
    </div>
  );
}

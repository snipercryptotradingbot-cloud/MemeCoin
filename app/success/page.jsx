'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import ConfettiEffect from '@/app/components/ConfettiEffect';
import CopyButton from '@/app/components/CopyButton';
import { getExplorerUrl, shortenAddress, getShareTweetUrl } from '@/app/lib/solana';

function SuccessContent() {
  const searchParams = useSearchParams();
  const mint = searchParams.get('mint') || '';
  const tx = searchParams.get('tx') || '';
  const network = searchParams.get('network') || 'devnet';

  if (!mint) {
    return (
      <div className="container container-sm" style={{ textAlign: 'center', padding: '120px 0' }}>
        <h1 className="font-display" style={{ marginBottom: 'var(--space-4)' }}>No Token Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          It looks like you haven&apos;t created a token yet.
        </p>
        <Link href="/create" className="btn btn-primary btn-lg">
          Create a Token
        </Link>
      </div>
    );
  }

  return (
    <div className="success-page" id="success-page">
      <ConfettiEffect active={true} />

      <div className="container container-sm">
        <div className="success-card animate-scale-in">
          {/* Success Icon */}
          <div className="success-icon-wrap">
            <div className="success-icon">✓</div>
          </div>

          <h1 className="success-title font-display">Token Created!</h1>
          <p className="success-subtitle">
            Your meme coin has been deployed to Solana {network === 'mainnet' ? 'Mainnet' : 'Devnet'}.
          </p>

          {/* Mint Address */}
          <div className="mint-address-card">
            <span className="mint-label">Mint Address</span>
            <div className="mint-address-row">
              <span className="font-mono mint-address">{mint}</span>
              <CopyButton text={mint} label="Copy" />
            </div>
          </div>

          {/* Transaction */}
          {tx && (
            <div className="mint-address-card" style={{ marginTop: 'var(--space-3)' }}>
              <span className="mint-label">Transaction</span>
              <div className="mint-address-row">
                <span className="font-mono mint-address">{shortenAddress(tx, 12)}</span>
                <CopyButton text={tx} label="Copy" />
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="success-actions">
            <a
              href={getExplorerUrl(mint, 'token', network)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary btn-lg"
              id="btn-solscan"
              >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>
              </svg>
              View on Solscan
            </a>
            <a
              href={getShareTweetUrl('Token', '', mint, network)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
              id="btn-share-x"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
              </svg>
              Share on X
            </a>
          </div>

          <div className="success-secondary-actions">
            <Link href="/create" className="btn btn-ghost" id="btn-create-another">
              + Create Another Token
            </Link>
            <Link href={`/explore?mint=${mint}&network=${network}`} className="btn btn-ghost" id="btn-explore">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M11 8v6"/><path d="M8 11h6"/>
              </svg>
              View in Explorer
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        .success-page {
          padding: var(--space-16) 0 var(--space-24);
          min-height: 80vh;
          display: flex;
          align-items: center;
        }

        .success-card {
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          padding: var(--space-12);
          text-align: center;
          position: relative;
          overflow: hidden;
        }

        .success-icon-wrap {
          margin-bottom: var(--space-6);
        }

        .success-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          border-radius: var(--radius-full);
          background: var(--brand-mint);
          color: var(--ink);
          font-size: var(--text-3xl);
          font-weight: 800;
        }

        .success-title {
          font-size: var(--text-3xl);
          font-weight: 800;
          margin-bottom: var(--space-3);
          color: var(--ink);
          letter-spacing: -0.02em;
        }

        .success-subtitle {
          font-size: var(--text-base);
          color: var(--body);
          margin-bottom: var(--space-8);
          line-height: 1.6;
        }

        .mint-address-card {
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: var(--space-4) var(--space-5);
          text-align: left;
        }

        .mint-label {
          font-size: var(--text-xs);
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.15em;
          font-weight: 600;
          font-family: var(--font-mono);
          display: block;
          margin-bottom: var(--space-2);
        }

        .mint-address-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
        }

        .mint-address {
          font-size: var(--text-sm);
          color: var(--ink);
          word-break: break-all;
        }

        .success-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          margin-top: var(--space-8);
        }

        .success-secondary-actions {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          margin-top: var(--space-4);
        }

        @media (max-width: 768px) {
          .success-card {
            padding: var(--space-8) var(--space-5);
          }

          .success-actions {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}

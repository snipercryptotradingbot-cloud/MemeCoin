'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import CopyButton from '@/app/components/CopyButton';
import NetworkBadge from '@/app/components/NetworkBadge';
import { shortenAddress, getExplorerUrl, formatNumber } from '@/app/lib/solana';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import { revokeMintAuthority, revokeFreezeAuthority, REVOKE_FEE_SOL } from '@/app/lib/revokeAuthority';

export default function TokenDetailPage({ params }) {
  const mint = typeof params?.mint === 'string' ? params.mint : decodeURIComponent((typeof window !== 'undefined' ? window.location.pathname : '') || '').split('/token/')[1] || '';

  const [token, setToken] = useState(null);
  const [network, setNetwork] = useState('devnet');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider('solana');

  const [revoking, setRevoking] = useState(null);
  const [revokeResult, setRevokeResult] = useState('');
  const [revokeError, setRevokeError] = useState('');

  const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET || process.env.TREASURY_WALLET_ADDRESS;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetch(`/api/token-info?mint=${encodeURIComponent(mint)}&network=${network}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          if (data.token) setToken(data.token);
          else setError('Token data is not available yet.');
        }
      })
      .catch(() => !cancelled && setError('Failed to fetch token data.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [mint, network]);

  const authorities = token?.authorities || [];
  const hasMintAuthority = authorities.some(a => a.scope === 'mint' && a.address === address);
  const hasFreezeAuthority = authorities.some(a => a.scope === 'freeze' && a.address === address);
  const isAuthority = hasMintAuthority || hasFreezeAuthority;

  const doRevoke = async (type) => {
    setRevoking(type);
    setRevokeResult('');
    setRevokeError('');
    try {
      if (!connection || !walletProvider || !address) {
        throw new Error('Wallet not connected');
      }
      const fn = type === 'mint' ? revokeMintAuthority : revokeFreezeAuthority;
      const result = await fn(connection, walletProvider, address, mint, treasuryAddress);
      setRevokeResult(`${type === 'mint' ? 'Mint' : 'Freeze'} authority revoked. TX: ${result.txSignature}`);
      setToken(prev => prev ? {
        ...prev,
        authorities: prev.authorities.map(a => a.address === address ? { ...a, address: 'Revoked' } : a),
      } : prev);
    } catch (err) {
      setRevokeError(err.message || 'Revocation failed');
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="token-detail-page" id="token-detail-page">
      <div className="container container-sm">
        {loading && (
          <div style={{ textAlign: 'center', padding: '120px 0' }}>
            <div className="spinner spinner-lg" />
            <p className="section-desc" style={{ marginTop: '16px' }}>Loading token data...</p>
          </div>
        )}

        {!loading && error && (
          <div className="card animate-fade-in-up" style={{ marginTop: '40px' }}>
            <p className="input-error-text" style={{ marginBottom: '12px' }}>{error}</p>
            <div className="token-detail-actions">
              <button className="btn btn-secondary" onClick={() => window.history.back()}>Back</button>
              <a href={getExplorerUrl(mint, 'token', network)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">Open on Solscan</a>
            </div>
          </div>
        )}

        {!loading && token && (
          <>
            <div className="token-detail-card card animate-fade-in-up">
              <div className="token-detail-header">
                <div className="token-detail-title">
                  {token.image && <img src={token.image} alt={token.name} className="token-detail-image" />}
                  <div>
                    <h1 className="section-title">{token.name}</h1>
                    <span className="badge badge-primary">${token.symbol}</span>
                  </div>
                </div>
                <NetworkBadge network={network} />
              </div>

              {token.description && <p className="token-detail-desc">{token.description}</p>}

              <div className="token-detail-stats">
                <div className="token-detail-stat">
                  <span className="stat-label">Supply</span>
                  <span className="stat-value">{formatNumber(token.supply)}</span>
                </div>
                <div className="token-detail-stat">
                  <span className="stat-label">Decimals</span>
                  <span className="stat-value">{token.decimals}</span>
                </div>
                <div className="token-detail-stat">
                  <span className="stat-label">Network</span>
                  <NetworkBadge network={network} />
                </div>
              </div>

              <div className="mint-row">
                <span className="stat-mono">{token.mint}</span>
                <CopyButton text={token.mint} />
              </div>

              <div className="token-detail-actions">
                <a href={getExplorerUrl(token.mint, 'token', network)} target="_blank" rel="noopener noreferrer" className="btn btn-primary">View on Solscan</a>
                <Link href={`/explore?mint=${token.mint}&network=${network}`} className="btn btn-secondary">Back to Explorer</Link>
              </div>
            </div>

            {isAuthority && (
              <div className="card animate-fade-in-up" style={{ marginTop: '24px' }}>
                <h2 className="section-title" style={{ fontSize: '18px', marginBottom: '8px' }}>Token Authorities</h2>
                <p className="section-desc" style={{ marginBottom: '16px' }}>
                  You are an authority on this token. Revoking permanently locks this function.
                  A one-time fee of <strong>{REVOKE_FEE_SOL} SOL</strong> is charged and sent to the platform treasury.
                </p>

                <div className="authority-actions">
                  {hasMintAuthority && (
                    <div className="authority-row">
                      <div className="authority-info">
                        <span className="authority-label">Mint Authority</span>
                        <span className="authority-status active">Active</span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => doRevoke('mint')}
                        disabled={revoking === 'mint'}
                      >
                        {revoking === 'mint' ? 'Revoking...' : `Revoke (${REVOKE_FEE_SOL} SOL)`}
                      </button>
                    </div>
                  )}
                  {hasFreezeAuthority && (
                    <div className="authority-row">
                      <div className="authority-info">
                        <span className="authority-label">Freeze Authority</span>
                        <span className="authority-status active">Active</span>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => doRevoke('freeze')}
                        disabled={revoking === 'freeze'}
                      >
                        {revoking === 'freeze' ? 'Revoking...' : `Revoke (${REVOKE_FEE_SOL} SOL)`}
                      </button>
                    </div>
                  )}
                </div>

                {revokeResult && (
                  <div className="result-box result-success" style={{ marginTop: '12px' }}>
                    <span>{revokeResult}</span>
                  </div>
                )}
                {revokeError && (
                  <div className="result-box result-error" style={{ marginTop: '12px' }}>
                    <span>{revokeError}</span>
                  </div>
                )}
              </div>
            )}

            {!isConnected && (
              <div className="card animate-fade-in-up" style={{ marginTop: '24px', textAlign: 'center', padding: '24px' }}>
                <p className="section-desc">Connect your wallet to manage token authorities.</p>
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>{`
        .token-detail-page { padding: var(--space-12) 0 var(--space-24); }
        .token-detail-card { margin-top: 24px; }
        .token-detail-header { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-4); flex-wrap: wrap; }
        .token-detail-title { display: flex; align-items: center; gap: var(--space-4); }
        .token-detail-image { width: 64px; height: 64px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--hairline); }
        .token-detail-desc { color: var(--body); margin-top: var(--space-4); line-height: 1.6; }
        .token-detail-stats { display: flex; gap: var(--space-6); margin-top: var(--space-6); flex-wrap: wrap; }
        .token-detail-stat { display: flex; flex-direction: column; gap: 6px; }
        .mint-row { display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); margin-top: var(--space-4); padding: var(--space-3) var(--space-4); background: var(--bg-surface-soft); border-radius: var(--radius-md); border: 1px solid var(--hairline); }
        .token-detail-actions { display: flex; gap: var(--space-3); margin-top: var(--space-6); flex-wrap: wrap; }
        .authority-actions { display: flex; flex-direction: column; gap: 12px; }
        .authority-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--bg-surface-soft); border-radius: var(--radius-md); border: 1px solid var(--hairline); }
        .authority-info { display: flex; align-items: center; gap: 8px; }
        .authority-label { font-weight: 700; font-size: 14px; color: var(--ink); }
        .authority-status { font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 9999px; }
        .authority-status.active { background: #dcfce7; color: #166534; }
        .result-box { padding: 10px 14px; border-radius: var(--radius-md); font-size: 13px; word-break: break-all; }
        .result-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
        .result-error { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; }
      `}</style>
    </div>
  );
}
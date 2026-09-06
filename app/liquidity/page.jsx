'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount, useAppKitProvider, useAppKitNetwork } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import CopyButton from '@/app/components/CopyButton';
import NetworkBadge from '@/app/components/NetworkBadge';
import { shortenAddress } from '@/app/lib/solana';
import {
  calculateTokensOut,
  calculateSolOut,
  calculateFee,
  solToLamports,
  lamportsToSol,
  CurveStatus,
  DEFAULT_FEE_BASIS_POINTS,
  TREASURY_WALLET,
} from '@/app/lib/constants';
import {
  buildInitializeCurveTx,
  buildBuyTokensTx,
  buildSellTokensTx,
  buildAddLiquidityTx,
  buildRemoveLiquidityTx,
  buildCloseCurveTx,
  buildMigrateToDexTx,
} from '@/app/lib/bondingCurve';
import { getBondingCurveState } from '@/app/lib/poolState';

const API_BASE = '/api/liquidity';
const POSITIONS_API = '/api/liquidity/positions';

export default function LiquidityPage() {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider('solana');
  const { caipNetwork } = useAppKitNetwork();

  const network = caipNetwork?.name?.toLowerCase()?.includes('mainnet') ? 'mainnet' : 'devnet';

  // Pools list
  const [pools, setPools] = useState([]);
  const [poolsLoading, setPoolsLoading] = useState(true);

  // My positions
  const [myPositions, setMyPositions] = useState([]);
  const [positionsLoading, setPositionsLoading] = useState(false);

  // Search
  const [searchMint, setSearchMint] = useState('');
  const [searchedPool, setSearchedPool] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  // Create Pool Form
  const [newTokenMint, setNewTokenMint] = useState('');
  const [initialSol, setInitialSol] = useState('10');
  const [initialTokens, setInitialTokens] = useState('1000000000');
  const [feeTier, setFeeTier] = useState('1.0%');
  const [creating, setCreating] = useState(false);
  const [createSuccess, setCreateSuccess] = useState(false);

  // Swap (Buy/Sell)
  const [swapMode, setSwapMode] = useState('buy');
  const [swapAmount, setSwapAmount] = useState('');
  const [swapPool, setSwapPool] = useState(null);
  const [swapping, setSwapping] = useState(false);
  const [swapResult, setSwapResult] = useState(null);

  // Add/Remove Liquidity
  const [liqMode, setLiqMode] = useState('add');
  const [liqSolAmount, setLiqSolAmount] = useState('');
  const [liqTokenAmount, setLiqTokenAmount] = useState('');
  const [liqLpAmount, setLiqLpAmount] = useState('');
  const [liqPool, setLiqPool] = useState(null);
  const [liqProcessing, setLiqProcessing] = useState(false);
  const [liqResult, setLiqResult] = useState(null);

  // Record a confirmed on-chain action to D1 (positions + activity log)
  const recordPosition = useCallback(async (action, poolId, { sol, token, lp, tx } = {}) => {
    if (!address || !poolId) return;
    try {
      await fetch(POSITIONS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: address,
          pool_id: poolId,
          action,
          sol_amount: sol ?? null,
          token_amount: token ?? null,
          lp_tokens: lp ?? null,
          tx_signature: tx || null,
        }),
      });
    } catch (err) {
      console.error(`Failed to record ${action} position:`, err);
    }
  }, [address]);

  // Transaction status
  const [txStatus, setTxStatus] = useState(null);
  const [txError, setTxError] = useState(null);

  // Load pools
  const loadPools = useCallback(async () => {
    try {
      setPoolsLoading(true);
      const res = await fetch(`${API_BASE}?action=pools&network=${network}`);
      const data = await res.json();
      setPools(data.pools || []);
    } catch (err) {
      console.error('Failed to load pools:', err);
    } finally {
      setPoolsLoading(false);
    }
  }, [network]);

  // Load user positions
  const loadPositions = useCallback(async () => {
    if (!address) return;
    try {
      setPositionsLoading(true);
      const res = await fetch(`${POSITIONS_API}?wallet=${address}&network=${network}`);
      const data = await res.json();
      setMyPositions(data.positions || []);
    } catch (err) {
      console.error('Failed to load positions:', err);
    } finally {
      setPositionsLoading(false);
    }
  }, [address, network]);

  useEffect(() => {
    loadPools();
  }, [loadPools]);

  useEffect(() => {
    if (isConnected && address) {
      loadPositions();
    }
  }, [isConnected, address, loadPositions]);

  // Search pool by mint
  const handleSearchPool = async (e) => {
    e.preventDefault();
    setSearchError('');
    setSearchedPool(null);
    setSearching(true);

    const mint = searchMint.trim();
    if (!mint) {
      setSearching(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}?action=status&mint_address=${mint}&network=${network}`);
      if (!res.ok) {
        const err = await res.json();
        setSearchError(err.error || 'Pool not found');
        return;
      }
      const data = await res.json();
      setSearchedPool(data);
    } catch (err) {
      setSearchError('Failed to fetch pool status. Is the mint address correct?');
    } finally {
      setSearching(false);
    }
  };

  // Helper: execute a wallet transaction
  const executeTx = async (transaction, description) => {
    if (!walletProvider || !connection) {
      throw new Error('Wallet not connected');
    }

    setTxStatus(`Signing ${description}...`);
    setTxError(null);

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = new (await import('@solana/web3.js')).PublicKey(address);

    const txSignature = await walletProvider.sendTransaction(transaction, connection);
    setTxStatus(`Confirming ${description}...`);

    await connection.confirmTransaction(
      { signature: txSignature, blockhash, lastValidBlockHeight },
      'confirmed'
    );

    setTxStatus(null);
    return txSignature;
  };

  // Create pool
  const handleCreatePool = async (e) => {
    e.preventDefault();
    if (!isConnected || !walletProvider || !connection) {
      setTxError('Please connect your wallet first');
      return;
    }
    if (!newTokenMint || !initialSol || !initialTokens) return;

    setCreating(true);
    setTxError(null);

    try {
      const feeBasisPoints = parseFloat(feeTier) * 100;

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initialize',
          wallet: address,
          mint_address: newTokenMint.trim(),
          initial_sol: initialSol,
          initial_tokens: initialTokens,
          fee_basis_points: feeBasisPoints,
          sol_target: '85',
          network,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to build transaction');

      // Deserialize and send transaction
      const { Transaction, PublicKey } = await import('@solana/web3.js');
      const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const txSignature = await executeTx(transaction, 'Initialize Pool');

      // Record to D1
      if (data.pool_id) {
        await fetch(POSITIONS_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wallet: address,
            pool_id: data.pool_id,
            action: 'initialize',
            sol_amount: parseFloat(initialSol),
            token_amount: parseInt(initialTokens),
            tx_signature: txSignature,
          }),
        });
      }

      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 5000);

      // Reset form
      setNewTokenMint('');
      setInitialSol('10');
      setInitialTokens('1000000000');

      // Refresh data
      loadPools();
      loadPositions();
    } catch (err) {
      console.error('Create pool error:', err);
      setTxError(err.message);
    } finally {
      setCreating(false);
    }
  };

  // Buy tokens
  const handleBuy = async (e) => {
    e.preventDefault();
    if (!isConnected || !swapAmount || !swapPool) return;

    setSwapping(true);
    setSwapResult(null);
    setTxError(null);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy',
          wallet: address,
          mint_address: swapPool.mint || swapPool.mintAddress || swapPool.pool_address,
          sol_amount: swapAmount,
          min_tokens_out: '0',
          network,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { Transaction } = await import('@solana/web3.js');
      const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const txSignature = await executeTx(transaction, 'Buy Tokens');
      await recordPosition('buy', swapPool.poolId || swapPool.id, {
        sol: parseFloat(swapAmount),
        tx: txSignature,
      });

      setSwapResult({
        type: 'buy',
        solAmount: parseFloat(swapAmount),
        txSignature,
      });
      setSwapAmount('');
      loadPools();
    } catch (err) {
      setTxError(err.message);
    } finally {
      setSwapping(false);
    }
  };

  // Sell tokens
  const handleSell = async (e) => {
    e.preventDefault();
    if (!isConnected || !swapAmount || !swapPool) return;

    setSwapping(true);
    setSwapResult(null);
    setTxError(null);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sell',
          wallet: address,
          mint_address: swapPool.mint || swapPool.mintAddress || swapPool.pool_address,
          token_amount: swapAmount,
          min_sol_out: '0',
          network,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { Transaction } = await import('@solana/web3.js');
      const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const txSignature = await executeTx(transaction, 'Sell Tokens');
      await recordPosition('sell', swapPool.poolId || swapPool.id, {
        token: parseInt(swapAmount),
        tx: txSignature,
      });

      setSwapResult({
        type: 'sell',
        tokenAmount: parseInt(swapAmount),
        txSignature,
      });
      setSwapAmount('');
      loadPools();
    } catch (err) {
      setTxError(err.message);
    } finally {
      setSwapping(false);
    }
  };

  // Add liquidity
  const handleAddLiquidity = async (e) => {
    e.preventDefault();
    if (!isConnected || !liqPool) return;

    setLiqProcessing(true);
    setLiqResult(null);
    setTxError(null);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_liquidity',
          wallet: address,
          mint_address: liqPool.mint || liqPool.mintAddress || liqPool.pool_address,
          sol_amount: liqSolAmount || '0',
          token_amount: liqTokenAmount || '0',
          network,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { Transaction } = await import('@solana/web3.js');
      const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const txSignature = await executeTx(transaction, 'Add Liquidity');

      await recordPosition('add_liquidity', liqPool.poolId || liqPool.id, {
        sol: parseFloat(liqSolAmount || '0'),
        token: parseInt(liqTokenAmount || '0'),
        tx: txSignature,
      });

      setLiqResult({
        type: 'add',
        solAmount: parseFloat(liqSolAmount || '0'),
        tokenAmount: parseInt(liqTokenAmount || '0'),
        txSignature,
      });
      setLiqSolAmount('');
      setLiqTokenAmount('');
      loadPools();
      loadPositions();
    } catch (err) {
      setTxError(err.message);
    } finally {
      setLiqProcessing(false);
    }
  };

  // Remove liquidity
  const handleRemoveLiquidity = async (e) => {
    e.preventDefault();
    if (!isConnected || !liqPool || !liqLpAmount) return;

    const mintAddress = liqPool.mint || liqPool.mintAddress || liqPool.pool_address || liqPool.curveAddress || liqPool.curve_address;

    setLiqProcessing(true);
    setLiqResult(null);
    setTxError(null);

    try {
      // Snapshot reserves before removal to compute returned amounts
      let before = null;
      try {
        if (connection) before = await getBondingCurveState(connection, mintAddress);
      } catch (err) { /* non-fatal */ }

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'remove_liquidity',
          wallet: address,
          mint_address: mintAddress,
          lp_tokens: liqLpAmount,
          network,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { Transaction } = await import('@solana/web3.js');
      const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const txSignature = await executeTx(transaction, 'Remove Liquidity');

      // Derive returned amounts from the on-chain reserve delta
      let solOut = 0;
      let tokenOut = 0;
      if (before) {
        try {
          if (connection) {
            const after = await getBondingCurveState(connection, mintAddress);
            if (after) {
              solOut = Math.max(0, before.solReserves - after.solReserves) / 1e9;
              tokenOut = Math.max(0, before.tokenReserves - after.tokenReserves);
            }
          }
        } catch (err) { /* non-fatal */ }
      }

      await recordPosition('remove_liquidity', liqPool.poolId || liqPool.id, {
        sol: solOut || null,
        token: tokenOut || null,
        lp: parseInt(liqLpAmount),
        tx: txSignature,
      });

      setLiqResult({
        type: 'remove',
        lpTokens: parseInt(liqLpAmount),
        txSignature,
      });
      setLiqLpAmount('');
      loadPools();
      loadPositions();
    } catch (err) {
      setTxError(err.message);
    } finally {
      setLiqProcessing(false);
    }
  };

  // Migrate pool to DEX (graduation)
  const handleMigrate = async () => {
    if (!isConnected || !searchedPool) return;
    if (!confirm('Migrate this pool to a DEX? All remaining SOL and tokens will be returned to your wallet.')) return;

    setLiqProcessing(true);
    setTxError(null);

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'migrate',
          wallet: address,
          mint_address: searchedPool.mintAddress || searchedPool.mint || searchedPool.curveAddress,
          network,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { Transaction } = await import('@solana/web3.js');
      const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
      const transaction = Transaction.from(txBytes);

      const txSignature = await executeTx(transaction, 'Migrate to DEX');

      await recordPosition('migrate', searchedPool.poolId, { tx: txSignature });

      await handleSearchPool({ preventDefault: () => {} });
      loadPools();
      loadPositions();
    } catch (err) {
      setTxError(err.message);
    } finally {
      setLiqProcessing(false);
    }
  };

  // Available LP for the selected pool (from D1 positions)
  const availableLp = (myPositions.find(
    (p) => p.pool_id === searchedPool?.poolId || p.curve_address === searchedPool?.curveAddress
  )?.lp_tokens) || 0;

  // Preview calculations
  const previewTokensOut = swapAmount && swapPool && swapMode === 'buy'
    ? calculateTokensOut(
        solToLamports(parseFloat(swapAmount)),
        solToLamports(swapPool.solReserves || 0),
        swapPool.tokenReserves || 0
      )
    : 0;

  const previewSolOut = swapAmount && swapPool && swapMode === 'sell'
    ? calculateSolOut(
        parseInt(swapAmount),
        solToLamports(swapPool.solReserves || 0),
        swapPool.tokenReserves || 0
      )
    : 0;

  return (
    <div className="liquidity-page" id="liquidity-page">
      <div className="container">

        {/* Header */}
        <header className="liquidity-header animate-fade-in">
          <div>
            <span className="section-label">AMM & LIQUIDITY</span>
            <h1 className="section-title">Liquidity Pools</h1>
            <p className="section-desc">
              Initialize bonding curve pools, trade tokens, and manage liquidity on Solana.
            </p>
          </div>
          <div className="stats-strip">
            <div className="stat-card">
              <span className="stat-card-label">Active Pools</span>
              <span className="stat-card-value">{pools.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">My Positions</span>
              <span className="stat-card-value">{myPositions.length}</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Network</span>
              <span className="stat-card-value"><NetworkBadge /></span>
            </div>
          </div>
        </header>

        {/* Tx Status Banner */}
        {txStatus && (
          <div className="tx-banner animate-fade-in">
            <div className="spinner" style={{ width: 16, height: 16 }} />
            <span>{txStatus}</span>
          </div>
        )}
        {txError && (
          <div className="tx-banner tx-banner-error animate-fade-in">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
            <span>{txError}</span>
            <button onClick={() => setTxError(null)} className="tx-banner-close">Dismiss</button>
          </div>
        )}

        <div className="liquidity-grid">

          {/* LEFT COLUMN */}
          <div className="liquidity-left-column">

            {/* Lookup Panel */}
            <section className="card lookup-panel animate-fade-in-up">
              <h2 className="panel-title">Bonding Curve Lookup</h2>
              <p className="panel-desc">Check the status of any pool using its Mint Address.</p>

              <form onSubmit={handleSearchPool} className="search-bar">
                <input
                  className="input search-input"
                  placeholder="Enter token mint address..."
                  value={searchMint}
                  onChange={(e) => setSearchMint(e.target.value)}
                />
                <button type="submit" className="btn btn-primary" disabled={searching}>
                  {searching ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Lookup'}
                </button>
              </form>

              {searchError && (
                <div className="error-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                  {searchError}
                </div>
              )}

              {searchedPool && (
                <div className="search-result-box animate-fade-in">
                  <div className="result-header">
                    <div className="result-brand">
                      <span className="result-token-icon">#</span>
                      <div>
                        <h3 className="result-token-name">{shortenAddress(searchedPool.mintAddress || searchedPool.curveAddress)}</h3>
                        <span className="stat-mono address-text">{shortenAddress(searchedPool.creator)}</span>
                      </div>
                    </div>
                    <span className={`badge ${searchedPool.status === 'active' ? 'badge-success' : searchedPool.status === 'paused' ? 'badge-warning' : searchedPool.status === 'migrated' ? 'badge-success' : 'badge-muted'}`}>
                      {searchedPool.status === 'active' ? 'Active' : searchedPool.status === 'paused' ? 'Paused' : searchedPool.status === 'migrated' ? 'Migrated to DEX' : 'Closed'}
                    </span>
                  </div>

                  <div className="progress-container">
                    <div className="progress-labels">
                      <span>SOL Progress</span>
                      <span className="stat-mono">{(searchedPool.progress || 0).toFixed(1)}%</span>
                    </div>
                    <div className="progress-bar-bg">
                      <div className="progress-bar-fill" style={{ width: `${Math.min(searchedPool.progress || 0, 100)}%` }} />
                    </div>
                    <p className="progress-helper">
                      {searchedPool.solReserves?.toFixed(2)} / {searchedPool.solTarget?.toFixed(2)} SOL
                    </p>
                  </div>

                  <div className="result-details">
                    <div className="detail-row">
                      <span>SOL Reserves:</span>
                      <span className="stat-mono">{(searchedPool.solReserves || 0).toFixed(4)} SOL</span>
                    </div>
                    <div className="detail-row">
                      <span>Token Reserves:</span>
                      <span className="stat-mono">{(searchedPool.tokenReserves || 0).toLocaleString()}</span>
                    </div>
                    <div className="detail-row">
                      <span>Fee:</span>
                      <span>{searchedPool.feePercent || '1.0%'}</span>
                    </div>
                    <div className="detail-row">
                      <span>Total Swaps:</span>
                      <span className="stat-mono">{searchedPool.totalSwaps || 0}</span>
                    </div>
                    <div className="detail-row">
                      <span>Curve Address:</span>
                      <span className="stat-mono">{shortenAddress(searchedPool.curveAddress)} <CopyButton text={searchedPool.curveAddress} /></span>
                    </div>
                  </div>

                  {searchedPool.status === 'active' && (
                    <div className="result-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => { setSwapPool(searchedPool); }}>
                        Trade
                      </button>
                      {address === searchedPool.creator && (
                        <button className="btn btn-secondary btn-sm" onClick={() => { setLiqPool(searchedPool); }}>
                          Manage Liquidity
                        </button>
                      )}
                      {(searchedPool.progress || 0) >= 100 && address === searchedPool.creator && (
                        <button className="btn btn-danger btn-sm" onClick={handleMigrate} disabled={liqProcessing}>
                          {liqProcessing ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Migrate to DEX'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* My Positions */}
            <section className="card my-pools-panel animate-fade-in-up">
              <h2 className="panel-title">My Positions</h2>

              {!isConnected ? (
                <div className="empty-state">
                  <h3 className="empty-title">Connect your wallet</h3>
                  <p className="empty-desc">Connect your wallet to view liquidity positions.</p>
                </div>
              ) : positionsLoading ? (
                <div className="empty-state">
                  <div className="spinner" />
                  <p className="empty-desc">Loading positions...</p>
                </div>
              ) : myPositions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M8 12h8M12 8v8"/></svg>
                  </div>
                  <h3 className="empty-title">No positions yet</h3>
                  <p className="empty-desc">Initialize a pool or buy tokens to start.</p>
                </div>
              ) : (
                <div className="my-pools-list">
                  {myPositions.map((pos, i) => (
                    <div key={i} className="my-pool-item">
                      <div className="my-pool-header">
                        <div className="my-pool-title">
                          <span className="my-pool-symbol">{shortenAddress(pos.pool_address || pos.curve_address)}</span>
                          <span className="stat-mono text-muted text-xs">{pos.action}</span>
                        </div>
                        <span className={`status-dot ${pos.pool_status === 'active' ? 'dot-success' : 'dot-bonding'}`} />
                      </div>
                      <div className="my-pool-body">
                        <div className="my-pool-stat">
                          <span className="my-pool-stat-label">SOL Deposited</span>
                          <span className="my-pool-stat-val">{pos.sol_deposited?.toFixed(4) || '0'} SOL</span>
                        </div>
                        <div className="my-pool-stat">
                          <span className="my-pool-stat-label">LP Tokens</span>
                          <span className="my-pool-stat-val">{pos.lp_tokens || '0'}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Active Pools Table */}
            <section className="card table-panel animate-fade-in-up">
              <h2 className="panel-title">Active Platform Pools</h2>
              <p className="panel-desc">All live bonding curve pools on MemeMint.</p>

              {poolsLoading ? (
                <div className="empty-state"><div className="spinner" /></div>
              ) : pools.length === 0 ? (
                <div className="empty-state">
                  <h3 className="empty-title">No pools yet</h3>
                  <p className="empty-desc">Be the first to initialize a liquidity pool.</p>
                </div>
              ) : (
                <div className="table-wrap">
                  <table className="pool-table">
                    <thead>
                      <tr>
                        <th>Pool</th>
                        <th>SOL Reserve</th>
                        <th>Token Reserve</th>
                        <th>Fee</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pools.map((pool) => (
                        <tr key={pool.id}>
                          <td>
                            <div className="pair-cell">
                              <span className="pair-token-badge">#</span>
                              <div>
                                <span className="pair-name">{shortenAddress(pool.pool_address || pool.curve_address)}</span>
                                <span className="pair-symbol">Creator: {shortenAddress(pool.creator_wallet)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="stat-mono">{pool.sol_accumulated?.toFixed(2) || '0'} SOL</td>
                          <td className="stat-mono">{pool.token_reserves?.toLocaleString() || '0'}</td>
                          <td className="stat-mono">{pool.fee_tier || '1.0%'}</td>
                          <td>
                            <span className={`badge ${pool.status === 'active' ? 'badge-success' : pool.status === 'paused' ? 'badge-warning' : 'badge-muted'}`}>
                              {pool.status}
                            </span>
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => {
                                setSearchMint(pool.pool_address || pool.curve_address);
                                handleSearchPool({ preventDefault: () => {} });
                              }}
                            >
                              Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>

          {/* RIGHT COLUMN */}
          <div className="liquidity-right-column">

            {/* Create Pool */}
            <section className="card create-pool-panel animate-fade-in-up">
              <h2 className="panel-title">Initialize Pool</h2>
              <p className="panel-desc">Create a new bonding curve pool for a Token-2022 mint.</p>

              {createSuccess && (
                <div className="success-toast animate-fade-in">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  Pool initialized successfully!
                </div>
              )}

              <form onSubmit={handleCreatePool} className="create-pool-form">
                <div className="input-group">
                  <label className="input-label">Token Mint Address <span className="required">*</span></label>
                  <input
                    className="input stat-mono"
                    placeholder="Token-2022 mint address..."
                    required
                    value={newTokenMint}
                    onChange={(e) => setNewTokenMint(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">Initial SOL Liquidity <span className="required">*</span></label>
                  <div className="sol-input-wrap">
                    <input
                      type="number"
                      className="input"
                      placeholder="10"
                      min="1"
                      step="0.1"
                      required
                      value={initialSol}
                      onChange={(e) => setInitialSol(e.target.value)}
                    />
                    <span className="sol-input-addon">SOL</span>
                  </div>
                  <span className="input-hint">Minimum 1 SOL. Pool activates for trading immediately.</span>
                </div>

                <div className="input-group">
                  <label className="input-label">Initial Token Liquidity <span className="required">*</span></label>
                  <input
                    type="number"
                    className="input"
                    placeholder="1000000000"
                    min="1"
                    required
                    value={initialTokens}
                    onChange={(e) => setInitialTokens(e.target.value)}
                  />
                  <span className="input-hint">Total tokens to deposit into the pool.</span>
                </div>

                <div className="input-group">
                  <label className="input-label">Swap Fee Tier</label>
                  <div className="fee-presets">
                    {['0.5%', '1.0%', '2.0%'].map((fee) => (
                      <button
                        key={fee}
                        type="button"
                        className={`fee-preset-btn ${feeTier === fee ? 'active' : ''}`}
                        onClick={() => setFeeTier(fee)}
                      >
                        {fee}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-mint btn-lg btn-full"
                  disabled={creating || !isConnected}
                >
                  {creating ? (
                    <div className="spinner" style={{ width: 18, height: 18 }} />
                  ) : (
                    'Initialize Pool'
                  )}
                </button>
              </form>
            </section>

            {/* Trade Panel */}
            {searchedPool && searchedPool.status === 'active' && (
              <section className="card trade-panel animate-fade-in-up">
                <h2 className="panel-title">Trade</h2>
                <p className="panel-desc">Swap SOL and tokens via the bonding curve.</p>

                <div className="swap-tabs">
                  <button
                    className={`swap-tab ${swapMode === 'buy' ? 'active' : ''}`}
                    onClick={() => { setSwapMode('buy'); setSwapResult(null); }}
                  >
                    Buy Tokens
                  </button>
                  <button
                    className={`swap-tab ${swapMode === 'sell' ? 'active' : ''}`}
                    onClick={() => { setSwapMode('sell'); setSwapResult(null); }}
                  >
                    Sell Tokens
                  </button>
                </div>

                <form onSubmit={swapMode === 'buy' ? handleBuy : handleSell} className="swap-form">
                  <div className="input-group">
                    <label className="input-label">
                      {swapMode === 'buy' ? 'SOL Amount' : 'Token Amount'}
                    </label>
                    <input
                      type="number"
                      className="input"
                      placeholder={swapMode === 'buy' ? '0.1' : '100000'}
                      min={swapMode === 'buy' ? '0.001' : '1'}
                      step={swapMode === 'buy' ? '0.001' : '1'}
                      required
                      value={swapAmount}
                      onChange={(e) => setSwapAmount(e.target.value)}
                    />
                  </div>

                  {swapAmount && (
                    <div className="swap-preview">
                      <span>Estimated output:</span>
                      <span className="stat-mono">
                        {swapMode === 'buy'
                          ? `${previewTokensOut.toLocaleString()} tokens`
                          : `${lamportsToSol(previewSolOut).toFixed(6)} SOL`
                        }
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className={`btn ${swapMode === 'buy' ? 'btn-mint' : 'btn-primary'} btn-lg btn-full`}
                    disabled={swapping || !isConnected || !swapAmount}
                  >
                    {swapping ? (
                      <div className="spinner" style={{ width: 18, height: 18 }} />
                    ) : (
                      swapMode === 'buy' ? 'Buy Tokens' : 'Sell Tokens'
                    )}
                  </button>
                </form>

                {swapResult && (
                  <div className="success-toast animate-fade-in" style={{ marginTop: 'var(--space-3)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {swapResult.type === 'buy'
                      ? `Bought tokens for ${swapResult.solAmount} SOL`
                      : `Sold tokens for SOL`
                    }
                    <CopyButton text={swapResult.txSignature} />
                  </div>
                )}
              </section>
            )}

            {/* Manage Liquidity Panel */}
            {searchedPool && isConnected && (
              <section className="card liq-panel animate-fade-in-up">
                <h2 className="panel-title">Manage Liquidity</h2>
                <p className="panel-desc">Add or remove liquidity from the pool. Any wallet can provide liquidity.</p>

                <div className="swap-tabs">
                  <button
                    className={`swap-tab ${liqMode === 'add' ? 'active' : ''}`}
                    onClick={() => { setLiqMode('add'); setLiqResult(null); }}
                  >
                    Add Liquidity
                  </button>
                  <button
                    className={`swap-tab ${liqMode === 'remove' ? 'active' : ''}`}
                    onClick={() => { setLiqMode('remove'); setLiqResult(null); }}
                  >
                    Remove Liquidity
                  </button>
                </div>

                {liqMode === 'add' ? (
                  <form onSubmit={handleAddLiquidity} className="swap-form">
                    <div className="input-group">
                      <label className="input-label">SOL Amount</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="5"
                        min="0"
                        step="0.1"
                        value={liqSolAmount}
                        onChange={(e) => setLiqSolAmount(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label className="input-label">Token Amount</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="500000000"
                        min="0"
                        value={liqTokenAmount}
                        onChange={(e) => setLiqTokenAmount(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-mint btn-lg btn-full"
                      disabled={liqProcessing || !isConnected}
                    >
                      {liqProcessing ? (
                        <div className="spinner" style={{ width: 18, height: 18 }} />
                      ) : (
                        'Add Liquidity'
                      )}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRemoveLiquidity} className="swap-form">
                    <div className="input-group">
                      <label className="input-label">LP Tokens to Burn</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="100"
                        min="1"
                        required
                        value={liqLpAmount}
                        onChange={(e) => setLiqLpAmount(e.target.value)}
                      />
                      <span className="input-hint">Available: {availableLp.toLocaleString()} LP. You will receive proportional SOL and tokens back.</span>
                    </div>
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg btn-full"
                      disabled={liqProcessing || !isConnected}
                    >
                      {liqProcessing ? (
                        <div className="spinner" style={{ width: 18, height: 18 }} />
                      ) : (
                        'Remove Liquidity'
                      )}
                    </button>
                  </form>
                )}

                {liqResult && (
                  <div className="success-toast animate-fade-in" style={{ marginTop: 'var(--space-3)' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                    {liqResult.type === 'add'
                      ? `Added ${liqResult.solAmount} SOL + ${liqResult.tokenAmount.toLocaleString()} tokens`
                      : `Removed ${liqResult.lpTokens} LP tokens`
                    }
                    <CopyButton text={liqResult.txSignature} />
                  </div>
                )}

                {address === searchedPool.creator && (
                  <button
                    className="btn btn-danger btn-sm btn-full"
                    style={{ marginTop: 'var(--space-3)' }}
                    onClick={async () => {
                      if (!confirm('Close this pool? Remaining funds will be returned to your wallet.')) return;
                      try {
                        const res = await fetch(API_BASE, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            action: 'close',
                            wallet: address,
                            mint_address: searchedPool.mintAddress || searchedPool.mint,
                            network,
                          }),
                        });
                        const data = await res.json();
                        if (!res.ok) throw new Error(data.error);

                        const { Transaction } = await import('@solana/web3.js');
                        const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
                        const transaction = Transaction.from(txBytes);
                        await executeTx(transaction, 'Close Pool');
                        loadPools();
                        setSearchedPool(null);
                      } catch (err) {
                        setTxError(err.message);
                      }
                    }}
                  >
                    Close Pool
                  </button>
                )}
              </section>
            )}

          </div>
        </div>
      </div>

      <style jsx>{`
        .liquidity-page {
          padding: var(--space-12) 0 var(--space-24);
          background: var(--bg-canvas);
        }

        .liquidity-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-6);
          margin-bottom: var(--space-10);
          flex-wrap: wrap;
        }

        .stats-strip {
          display: flex;
          gap: var(--space-4);
          flex-wrap: wrap;
        }

        .stat-card {
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-5);
          min-width: 120px;
        }

        .stat-card-label {
          display: block;
          font-size: 10px;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
        }

        .stat-card-value {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--ink);
        }

        .liquidity-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-6);
          align-items: start;
        }

        .liquidity-left-column {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .liquidity-right-column {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .card {
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          padding: var(--space-6);
        }

        .panel-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: 2px;
        }

        .panel-desc {
          font-size: var(--text-xs);
          color: var(--muted);
          margin-bottom: var(--space-4);
        }

        .search-bar {
          display: flex;
          gap: var(--space-3);
          margin-bottom: var(--space-4);
        }

        .search-input {
          flex: 1;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--error);
          font-size: var(--text-xs);
          padding: var(--space-2) var(--space-3);
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: var(--radius-sm);
          margin-bottom: var(--space-4);
        }

        .search-result-box {
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .result-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .result-brand {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .result-token-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: var(--bg-surface-strong);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--brand-pink);
        }

        .result-token-name {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--ink);
        }

        .address-text {
          font-size: 11px;
          color: var(--muted);
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .progress-labels {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--ink);
        }

        .progress-bar-bg {
          height: 8px;
          background: var(--bg-surface-strong);
          border-radius: var(--radius-pill);
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: var(--brand-mint);
          border-radius: var(--radius-pill);
          transition: width 0.5s ease-out;
        }

        .progress-helper {
          font-size: 10px;
          color: var(--muted);
          margin-top: 2px;
        }

        .result-details {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          border-top: 1px dashed var(--hairline);
          padding-top: var(--space-3);
        }

        .detail-row {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          color: var(--body);
        }

        .detail-row span:last-child {
          color: var(--ink);
          font-weight: 600;
        }

        .result-actions {
          display: flex;
          gap: var(--space-2);
        }

        .btn-full {
          width: 100%;
          margin-top: var(--space-2);
        }

        .empty-state {
          text-align: center;
          padding: var(--space-8) var(--space-4);
          color: var(--muted);
        }

        .empty-state-icon {
          color: var(--muted-soft);
          margin-bottom: var(--space-2);
        }

        .empty-title {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 2px;
        }

        .empty-desc {
          font-size: var(--text-xs);
        }

        .my-pools-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .my-pool-item {
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          padding: var(--space-3) var(--space-4);
        }

        .my-pool-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-2);
        }

        .my-pool-title {
          display: flex;
          flex-direction: column;
        }

        .my-pool-symbol {
          font-weight: 700;
          font-size: var(--text-sm);
          color: var(--ink);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-full);
          margin-top: 4px;
        }

        .dot-success { background: var(--success); }
        .dot-bonding { background: var(--brand-pink); }

        .my-pool-body {
          display: flex;
          justify-content: space-between;
          border-top: 1px solid var(--hairline);
          padding-top: var(--space-2);
        }

        .my-pool-stat {
          display: flex;
          flex-direction: column;
        }

        .my-pool-stat-label {
          font-size: 10px;
          color: var(--muted);
        }

        .my-pool-stat-val {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--ink);
        }

        .table-wrap {
          overflow-x: auto;
          margin-top: var(--space-4);
        }

        .pool-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .pool-table th, .pool-table td {
          padding: 14px 10px;
          border-bottom: 1px solid var(--hairline);
          font-size: var(--text-sm);
        }

        .pool-table th {
          color: var(--muted);
          font-weight: 600;
          font-size: var(--text-xs);
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .pair-cell {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .pair-token-badge {
          width: 24px;
          height: 24px;
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--muted);
        }

        .pair-name {
          font-weight: 600;
          color: var(--ink);
          display: block;
        }

        .pair-symbol {
          font-size: var(--text-xs);
          color: var(--muted);
        }

        .create-pool-form, .swap-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-top: var(--space-4);
        }

        .sol-input-wrap {
          display: flex;
          border: 1px solid var(--hairline);
          background: var(--bg-canvas);
          border-radius: var(--radius-md);
          overflow: hidden;
        }

        .sol-input-wrap .input {
          border: none !important;
          flex: 1;
        }

        .sol-input-addon {
          background: var(--bg-surface-soft);
          border-left: 1px solid var(--hairline);
          color: var(--ink);
          font-size: var(--text-sm);
          font-weight: 700;
          display: flex;
          align-items: center;
          padding: 0 var(--space-4);
        }

        .fee-presets {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-2);
        }

        .fee-preset-btn {
          padding: var(--space-2) 0;
          border: 1px solid var(--hairline);
          background: var(--bg-canvas);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--body);
        }

        .fee-preset-btn:hover {
          border-color: #d4d4d4;
          background: var(--bg-surface-soft);
        }

        .fee-preset-btn.active {
          border-color: var(--brand-pink);
          background: var(--brand-pink);
          color: white;
        }

        .success-toast {
          background: rgba(34, 197, 94, 0.08);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: var(--radius-md);
          color: var(--success);
          font-size: var(--text-xs);
          padding: var(--space-3) var(--space-4);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .tx-banner {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          padding: var(--space-3) var(--space-4);
          background: rgba(59, 130, 246, 0.08);
          border: 1px solid rgba(59, 130, 246, 0.2);
          border-radius: var(--radius-md);
          color: #3b82f6;
          font-size: var(--text-xs);
          font-weight: 600;
          margin-bottom: var(--space-4);
        }

        .tx-banner-error {
          background: rgba(239, 68, 68, 0.08);
          border-color: rgba(239, 68, 68, 0.2);
          color: var(--error);
        }

        .tx-banner-close {
          margin-left: auto;
          background: none;
          border: none;
          color: inherit;
          cursor: pointer;
          font-size: var(--text-xs);
          text-decoration: underline;
        }

        .swap-tabs {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }

        .swap-tab {
          padding: var(--space-2) 0;
          border: 1px solid var(--hairline);
          background: var(--bg-canvas);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-xs);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          color: var(--body);
        }

        .swap-tab:hover {
          border-color: #d4d4d4;
        }

        .swap-tab.active {
          border-color: var(--brand-pink);
          background: var(--brand-pink);
          color: white;
        }

        .swap-preview {
          display: flex;
          justify-content: space-between;
          font-size: var(--text-xs);
          color: var(--muted);
          padding: var(--space-2) var(--space-3);
          background: var(--bg-surface-soft);
          border-radius: var(--radius-md);
        }

        .badge-warning {
          background: #fef3c7;
          color: #92400e;
        }

        .badge-muted {
          background: var(--bg-surface-strong);
          color: var(--muted);
        }

        .btn-danger {
          background: #ef4444;
          color: white;
          border: 1px solid #ef4444;
        }

        .btn-danger:hover {
          background: #dc2626;
        }

        @media (max-width: 1024px) {
          .liquidity-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .liquidity-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .pool-table th:nth-child(3),
          .pool-table td:nth-child(3),
          .pool-table th:nth-child(4),
          .pool-table td:nth-child(4) {
            display: none;
          }
        }
      `}</style>

    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit/react';
import { useAppKitConnection } from '@reown/appkit-adapter-solana/react';
import CopyButton from '@/app/components/CopyButton';
import NetworkBadge from '@/app/components/NetworkBadge';
import AuthGuard from '@/app/components/AuthGuard';
import { useNetwork } from '@/app/providers/NetworkProvider';
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
  buildCloseCurveTx,
  buildMigrateToDexTx,
} from '@/app/lib/bondingCurve';
import { getBondingCurveState } from '@/app/lib/poolState';

const API_BASE = '/api/liquidity';
const POSITIONS_API = '/api/liquidity/positions';

// Local URL builders (no external deps, safe for SSR)
function getMeteoraPoolUrl(poolAddress, net = 'devnet') {
  return net === 'mainnet'
    ? `https://app.meteora.ag/pools/${poolAddress}`
    : `https://app.devnet.meteora.ag/pools/${poolAddress}`;
}
function getRaydiumPoolUrl(poolAddress, net = 'devnet') {
  return net === 'mainnet'
    ? `https://raydium.io/pools/${poolAddress}`
    : `https://api-v3-devnet.raydium.io/pools/detail/${poolAddress}`;
}
function getRaydiumSwapUrl(inputMint, outputMint, net = 'devnet') {
  return net === 'mainnet'
    ? `https://raydium.io/swap/?inputMint=${inputMint}&outputMint=${outputMint}`
    : `https://api-v3-devnet.raydium.io/swap?inputMint=${inputMint}&outputMint=${outputMint}`;
}

export default function LiquidityPage() {
  const { address, isConnected } = useAppKitAccount();
  const { connection } = useAppKitConnection();
  const { walletProvider } = useAppKitProvider('solana');
  const { network } = useNetwork();

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

  // Liquidity state
  const [liqPool, setLiqPool] = useState(null);
  const [liqProcessing, setLiqProcessing] = useState(false);

  // DLMM pool creation state (post-graduation)
  const [dlmmSolAmount, setDlmmSolAmount] = useState('');
  const [dlmmTokenAmount, setDlmmTokenAmount] = useState('');
  const [dlmmFeeBps, setDlmmFeeBps] = useState(100);
  const [dlmmCreating, setDlmmCreating] = useState(false);
  const [dlmmResult, setDlmmResult] = useState(null);
  const [dlmmError, setDlmmError] = useState(null);

  // DEX selection (meteora | raydium)
  const [selectedDex, setSelectedDex] = useState('meteora');

  // Raydium pool creation state
  const [raydiumCreating, setRaydiumCreating] = useState(false);
  const [raydiumResult, setRaydiumResult] = useState(null);
  const [raydiumError, setRaydiumError] = useState(null);

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

  // Migrate pool to DEX (graduation)
  const handleMigrate = async () => {
    if (!isConnected || !searchedPool) return;
    if (!confirm('Migrate this pool to Meteora DLMM? All remaining SOL and tokens will be returned to your wallet. You can then create a DLMM pool using the Meteora SDK.')) return;

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

  // Create DLMM pool (post-graduation)
  const handleCreateDlmmPool = async (e) => {
    e.preventDefault();
    if (!isConnected || !walletProvider || !connection || !searchedPool) return;
    if (!dlmmSolAmount || !dlmmTokenAmount) return;

    setDlmmCreating(true);
    setDlmmError(null);
    setDlmmResult(null);

    try {
      const { Keypair, PublicKey: PK } = await import('@solana/web3.js');
      const { BN } = await import('@coral-xyz/anchor');
      const { createDlmmPool, addLiquidityByStrategy, getDlmmPool } = await import('@/app/lib/dlmm');

      const tokenMint = new PK(searchedPool.mintAddress || searchedPool.mint);

      // 1. Create the DLMM pool
      const { tx: createPoolTx } = await createDlmmPool(
        connection,
        tokenMint,
        dlmmFeeBps,
        network,
        { creatorKey: new PK(address) }
      );

      setTxStatus('Creating DLMM pool...');
      const poolTxSig = await executeTx(createPoolTx, 'Create DLMM Pool');

      // Extract pool address from the transaction logs
      const poolAta = createPoolTx.instructions.find(
        ix => ix.keys.some(k => k.pubkey.equals(tokenMint))
      );

      setTxStatus('DLMM pool created! Now adding liquidity...');

      // 2. Initialize position + add liquidity
      const dlmm = await getDlmmPool(connection, poolAta?.keys[0]?.pubkey || tokenMint);
      const positionKeypair = Keypair.generate();

      const totalXAmount = new BN(dlmmTokenAmount);
      const totalYAmount = new BN(Math.floor(parseFloat(dlmmSolAmount) * 1e9));

      const strategy = {
        minBinId: -7,
        maxBinId: 7,
        strategyType: 0,
      };

      const addLiqTx = await addLiquidityByStrategy(
        dlmm, positionKeypair, totalXAmount, totalYAmount,
        strategy, new PK(address), 1
      );

      await executeTx(addLiqTx, 'Add Initial Liquidity');

      setDlmmResult({
        poolAddress: poolAta?.keys[0]?.pubkey?.toBase58() || 'See Meteora',
        txSignature: poolTxSig,
      });

      await recordPosition('create_dlmm_pool', poolAta?.keys[0]?.pubkey?.toBase58() || searchedPool.poolId, {
        sol: parseFloat(dlmmSolAmount),
        token: parseInt(dlmmTokenAmount),
        tx: poolTxSig,
      });

      loadPools();
      loadPositions();
    } catch (err) {
      console.error('DLMM pool creation error:', err);
      setDlmmError(err.message || 'Failed to create DLMM pool');
    } finally {
      setDlmmCreating(false);
      setTxStatus(null);
    }
  };

  // Create Raydium AMM pool (post-graduation)
  const handleCreateRaydiumPool = async (e) => {
    e.preventDefault();
    if (!isConnected || !walletProvider || !connection || !searchedPool) return;
    if (!dlmmSolAmount || !dlmmTokenAmount) return;

    setRaydiumCreating(true);
    setRaydiumError(null);
    setRaydiumResult(null);

    try {
      const { PublicKey: PK } = await import('@solana/web3.js');
      const { BN } = await import('@coral-xyz/anchor');
      const { initRaydium, createRaydiumPool } = await import('@/app/lib/raydium');

      const tokenMint = new PK(searchedPool.mintAddress || searchedPool.mint);

      // Initialize Raydium SDK
      const raydium = await initRaydium(connection, walletProvider, network);

      const tokenAmount = new BN(dlmmTokenAmount);
      const solAmount = new BN(Math.floor(parseFloat(dlmmSolAmount) * 1e9));

      setTxStatus('Creating Raydium pool + market...');

      const result = await createRaydiumPool(
        raydium, tokenMint, 9, tokenAmount, solAmount, network
      );

      setRaydiumResult({
        poolAddress: result.poolAddress,
        txSignature: result.txSignatures?.[0] || 'Sent',
      });

      await recordPosition('create_raydium_pool', result.poolAddress || searchedPool.poolId, {
        sol: parseFloat(dlmmSolAmount),
        token: parseInt(dlmmTokenAmount),
        tx: result.txSignatures?.[0],
      });

      loadPools();
      loadPositions();
    } catch (err) {
      console.error('Raydium pool creation error:', err);
      setRaydiumError(err.message || 'Failed to create Raydium pool');
    } finally {
      setRaydiumCreating(false);
      setTxStatus(null);
    }
  };

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
    <AuthGuard>
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
                      {pos.pool_status === 'active' && pos.mint_address && (
                        <button
                          className="btn btn-danger btn-sm btn-full"
                          style={{ marginTop: 'var(--space-2)' }}
                          onClick={async () => {
                            if (!confirm('Close this pool? Remaining funds will be returned to your wallet.')) return;
                            try {
                              const res = await fetch(API_BASE, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  action: 'close',
                                  wallet: address,
                                  mint_address: pos.mint_address,
                                  network: pos.network || network,
                                }),
                              });
                              const data = await res.json();
                              if (!res.ok) throw new Error(data.error);

                              const { Transaction } = await import('@solana/web3.js');
                              const txBytes = Uint8Array.from(atob(data.transaction), c => c.charCodeAt(0));
                              const transaction = Transaction.from(txBytes);
                              await executeTx(transaction, 'Close Pool');
                              loadPositions();
                            } catch (err) {
                              setTxError(err.message);
                            }
                          }}
                        >
                          Close & Withdraw
                        </button>
                      )}
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
                <h2 className="panel-title">Pool Management</h2>

                {searchedPool.status === 'migrated' ? (
                  <div>
                    <p className="panel-desc" style={{ marginBottom: 'var(--space-4)' }}>
                      This pool has graduated. Choose a DEX to create your liquidity pool.
                    </p>

                    {/* DEX Selector Tabs */}
                    <div className="swap-tabs" style={{ marginBottom: 'var(--space-4)' }}>
                      <button
                        className={`swap-tab ${selectedDex === 'meteora' ? 'active' : ''}`}
                        onClick={() => { setSelectedDex('meteora'); setDlmmResult(null); setRaydiumResult(null); }}
                      >
                        Meteora DLMM
                      </button>
                      <button
                        className={`swap-tab ${selectedDex === 'raydium' ? 'active' : ''}`}
                        onClick={() => { setSelectedDex('raydium'); setDlmmResult(null); setRaydiumResult(null); }}
                      >
                        Raydium AMM
                      </button>
                    </div>

                    {/* Meteora DLMM Panel */}
                    {selectedDex === 'meteora' && (
                      !dlmmResult ? (
                        <form onSubmit={handleCreateDlmmPool} className="create-pool-form">
                          <div className="input-group">
                            <label className="input-label">SOL Amount (Wrapped)</label>
                            <div className="sol-input-wrap">
                              <input
                                type="number"
                                className="input"
                                placeholder="e.g. 3.5"
                                min="0.1"
                                step="0.1"
                                required
                                value={dlmmSolAmount}
                                onChange={(e) => setDlmmSolAmount(e.target.value)}
                              />
                              <span className="sol-input-addon">SOL</span>
                            </div>
                            <span className="input-hint">Liquidity in wrapped SOL (WSOL).</span>
                          </div>

                          <div className="input-group">
                            <label className="input-label">Token Amount</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="e.g. 500000000"
                              min="1"
                              required
                              value={dlmmTokenAmount}
                              onChange={(e) => setDlmmTokenAmount(e.target.value)}
                            />
                            <span className="input-hint">Amount of your token to provide as liquidity.</span>
                          </div>

                          <div className="input-group">
                            <label className="input-label">Fee Tier</label>
                            <div className="fee-presets">
                              {[10, 50, 100, 200].map((bps) => (
                                <button
                                  key={bps}
                                  type="button"
                                  className={`fee-preset-btn ${dlmmFeeBps === bps ? 'active' : ''}`}
                                  onClick={() => setDlmmFeeBps(bps)}
                                >
                                  {bps / 100}%
                                </button>
                              ))}
                            </div>
                          </div>

                          {dlmmError && (
                            <div className="error-message">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              {dlmmError}
                            </div>
                          )}

                          <button
                            type="submit"
                            className="btn btn-mint btn-lg btn-full"
                            disabled={dlmmCreating || !isConnected || !dlmmSolAmount || !dlmmTokenAmount}
                          >
                            {dlmmCreating ? (
                              <div className="spinner" style={{ width: 18, height: 18 }} />
                            ) : (
                              'Create Meteora DLMM Pool'
                            )}
                          </button>

                          <a
                            href={getMeteoraPoolUrl(searchedPool.mintAddress || searchedPool.mint, network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm btn-full"
                            style={{ marginTop: 'var(--space-2)' }}
                          >
                            Create on Meteora App Instead
                          </a>
                        </form>
                      ) : (
                        <div className="success-toast animate-fade-in" style={{ marginTop: 'var(--space-3)' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          DLMM pool created successfully!
                          <CopyButton text={dlmmResult.poolAddress} />
                          <a
                            href={getMeteoraPoolUrl(dlmmResult.poolAddress, network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ marginLeft: 'auto' }}
                          >
                            View on Meteora
                          </a>
                        </div>
                      )
                    )}

                    {/* Raydium AMM Panel */}
                    {selectedDex === 'raydium' && (
                      !raydiumResult ? (
                        <form onSubmit={handleCreateRaydiumPool} className="create-pool-form">
                          <div className="input-group">
                            <label className="input-label">SOL Amount</label>
                            <div className="sol-input-wrap">
                              <input
                                type="number"
                                className="input"
                                placeholder="e.g. 3.5"
                                min="0.1"
                                step="0.1"
                                required
                                value={dlmmSolAmount}
                                onChange={(e) => setDlmmSolAmount(e.target.value)}
                              />
                              <span className="sol-input-addon">SOL</span>
                            </div>
                            <span className="input-hint">SOL liquidity (native, used as quote token).</span>
                          </div>

                          <div className="input-group">
                            <label className="input-label">Token Amount</label>
                            <input
                              type="number"
                              className="input"
                              placeholder="e.g. 500000000"
                              min="1"
                              required
                              value={dlmmTokenAmount}
                              onChange={(e) => setDlmmTokenAmount(e.target.value)}
                            />
                            <span className="input-hint">Amount of your token to provide as liquidity.</span>
                          </div>

                          {raydiumError && (
                            <div className="error-message">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                              {raydiumError}
                            </div>
                          )}

                          <button
                            type="submit"
                            className="btn btn-mint btn-lg btn-full"
                            disabled={raydiumCreating || !isConnected || !dlmmSolAmount || !dlmmTokenAmount}
                          >
                            {raydiumCreating ? (
                              <div className="spinner" style={{ width: 18, height: 18 }} />
                            ) : (
                              'Create Raydium AMM Pool'
                            )}
                          </button>

                          <a
                            href={getRaydiumSwapUrl('So11111111111111111111111111111111111111112', searchedPool.mintAddress || searchedPool.mint, network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm btn-full"
                            style={{ marginTop: 'var(--space-2)' }}
                          >
                            Create on Raydium App Instead
                          </a>
                        </form>
                      ) : (
                        <div className="success-toast animate-fade-in" style={{ marginTop: 'var(--space-3)' }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                          Raydium pool created successfully!
                          <CopyButton text={raydiumResult.poolAddress} />
                          <a
                            href={getRaydiumPoolUrl(raydiumResult.poolAddress, network)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary btn-sm"
                            style={{ marginLeft: 'auto' }}
                          >
                            View on Raydium
                          </a>
                        </div>
                      )
                    )}
                  </div>
                ) : searchedPool.status === 'active' ? (
                  <div>
                    <p className="panel-desc" style={{ marginBottom: 'var(--space-4)' }}>
                      {address === searchedPool.creator
                        ? 'You are the creator. When the curve reaches its SOL target, you can migrate to Meteora DLMM.'
                        : 'Liquidity is managed by the bonding curve. Trade via the swap panel above.'}
                    </p>
                    {(searchedPool.progress || 0) >= 100 && address === searchedPool.creator && (
                      <button
                        className="btn btn-danger btn-sm btn-full"
                        onClick={handleMigrate}
                        disabled={liqProcessing}
                      >
                        {liqProcessing ? <div className="spinner" style={{ width: 14, height: 14 }} /> : 'Graduate to Meteora DLMM'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="panel-desc">Pool is {searchedPool.status}.</p>
                )}

                {address === searchedPool.creator && searchedPool.status !== 'migrated' && (
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
    </AuthGuard>
  );
}

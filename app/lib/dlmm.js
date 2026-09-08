/**
 * Meteora DLMM SDK integration — pool creation + liquidity management.
 *
 * Flow after bonding curve graduation:
 *   1. Creator calls migrate_to_dex → receives SOL + tokens
 *   2. Creator calls createDlmmPool() → creates a DLMM pair on-chain
 *   3. Creator calls addLiquidityToPool() → seeds initial liquidity
 *
 * Uses @meteora-ag/dlmm (client-side only, needs wallet provider).
 */

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Meteora DLMM program ID (same on mainnet and devnet)
export const DLMM_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

// Wrapped SOL mint (DLMM uses wrapped SOL, not native SOL)
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

// Default bin step: 10 = 0.1% price per bin
const DEFAULT_BIN_STEP = 10;

/**
 * Create a Meteora DLMM pool for a graduated token.
 *
 * @param {Connection} connection - Solana RPC connection
 * @param {PublicKey} tokenMint - The Token-2022 mint of the memecoin
 * @param {number} feeBps - Fee in basis points (e.g. 100 = 1%)
 * @param {string} network - 'mainnet' | 'devnet'
 * @param {object} [opts] - Additional options
 * @returns {Promise<{ poolAddress: string, tx: Transaction }>}
 */
export async function createDlmmPool(connection, tokenMint, feeBps = 100, network = 'devnet', opts = {}) {
  const { DLMM } = await import('@meteora-ag/dlmm');

  const binStep = new BN(DEFAULT_BIN_STEP);
  const fee = new BN(feeBps);
  const activeId = new BN(0); // Start at center price
  const creatorKey = opts.creatorKey;

  // createCustomizablePermissionlessLbPair2 supports Token-2022
  // ActivationType.Slot = 0 → pool activates immediately at next slot
  const tx = await DLMM.createCustomizablePermissionlessLbPair2(
    connection,
    binStep,
    tokenMint,       // tokenX (our memecoin)
    WSOL_MINT,       // tokenY (wrapped SOL)
    activeId,
    fee,
    0,               // ActivationType.Slot (activate immediately)
    false,           // hasAlphaVault
    creatorKey,
    undefined,       // activationPoint (undefined = immediate)
    false,           // creatorPoolOnOffControl
    undefined,       // concreteFunctionType
    0,               // CollectFeeMode.InputOnly
    { ...opts, programId: DLMM_PROGRAM_ID }
  );

  // The pool address is derived from the tx; we can extract it or return the tx
  // For now, the caller needs to extract from the tx response
  return { tx };
}

/**
 * Get a DLMM pool instance by its public key.
 */
export async function getDlmmPool(connection, poolAddress) {
  const { DLMM } = await import('@meteora-ag/dlmm');
  const pubkey = typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
  return await DLMM.create(connection, pubkey, { programId: DLMM_PROGRAM_ID });
}

/**
 * Initialize a position and add liquidity to a DLMM pool.
 *
 * @param {DLMM} dlmm - DLMM instance from getDlmmPool()
 * @param {Keypair} positionKeypair - New position keypair
 * @param {BN} totalXAmount - Amount of token X (memecoin) in smallest unit
 * @param {BN} totalYAmount - Amount of token Y (WSOL) in lamports
 * @param {object} strategy - Strategy parameters { minBinId, maxBinId, strategyType }
 * @param {PublicKey} user - User's wallet public key
 * @param {number} slippage - Slippage tolerance (0-100, default 1)
 * @returns {Promise<Transaction>}
 */
export async function addLiquidityByStrategy(dlmm, positionKeypair, totalXAmount, totalYAmount, strategy, user, slippage = 1) {
  const tx = await dlmm.initializePositionAndAddLiquidityByStrategy({
    positionPubKey: positionKeypair.publicKey,
    totalXAmount,
    totalYAmount,
    strategy,
    user,
    slippage,
  });
  return tx;
}

/**
 * Calculate suggested price bins for initial liquidity.
 * Returns a balanced distribution around the current price.
 */
export function getSuggestedDistribution() {
  // Even distribution across 15 bins centered at active bin
  return Array.from({ length: 15 }, (_, i) => ({
    binId: i - 7, // -7 to +7 around active
    amount: 1,
  }));
}

/**
 * Build a Meteora app URL for viewing/interacting with a DLMM pool.
 */
export function getMeteoraPoolUrl(poolAddress, network = 'devnet') {
  if (network === 'mainnet') {
    return `https://app.meteora.ag/pools/${poolAddress}`;
  }
  return `https://app.devnet.meteora.ag/pools/${poolAddress}`;
}

/**
 * Build a URL to create a new DLMM pool on the Meteora app.
 */
export function getMeteoraCreatePoolUrl(mintX, mintY, network = 'devnet') {
  if (network === 'mainnet') {
    return `https://app.meteora.ag/pool/new?tokenA=${mintX}&tokenB=${mintY}`;
  }
  return `https://app.devnet.meteora.ag/pool/new?tokenA=${mintX}&tokenB=${mintY}`;
}

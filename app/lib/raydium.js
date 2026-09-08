/**
 * Raydium AMM SDK integration for MemeMint.
 *
 * Provides an alternative graduation path alongside Meteora DLMM.
 * After a bonding curve graduates, the creator can choose to create
 * a Raydium AMM V4 pool with their SOL + tokens.
 *
 * Uses @raydium-io/raydium-sdk-v2 (client-side only).
 */

import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// Raydium AMM V4 program IDs
export const RAYDIUM_AMM_V4_MAINNET = new PublicKey('675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8');
export const RAYDIUM_AMM_V4_DEVNET = new PublicKey('HWy1jotHpo6UeR5NZQ85Sm3qYy47zqvTYBJMPSmuy25N');

// Raydium fee destination accounts
export const RAYDIUM_FEE_DEST_MAINNET = new PublicKey('GpMZaz65bUe7TWgMj4pLXw6sJFRGec3tbyZ5cViBCmD');
export const RAYDIUM_FEE_DEST_DEVNET = new PublicKey('3XMrhbv989VxAMi3DErLV9eJht1pYppT5qZ1g8fBEZ6');

// OpenBook/Serum DEX program IDs (required for Raydium V4 market)
export const OPENBOOK_MAINNET = new PublicKey('opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EQrfr8');
export const OPENBOOK_DEVNET = new PublicKey('EoTJyfRjChLKam6Kj4tjxrz5D5j1Wx2Tz7C1zF5t6Y8');

// Wrapped SOL
export const WSOL_MINT = new PublicKey('So11111111111111111111111111111111111111112');

/**
 * Get Raydium program IDs for the given network.
 */
export function getRaydiumIds(network = 'devnet') {
  return {
    ammV4: network === 'mainnet' ? RAYDIUM_AMM_V4_MAINNET : RAYDIUM_AMM_V4_DEVNET,
    feeDestination: network === 'mainnet' ? RAYDIUM_FEE_DEST_MAINNET : RAYDIUM_FEE_DEST_DEVNET,
    openbook: network === 'mainnet' ? OPENBOOK_MAINNET : OPENBOOK_DEVNET,
  };
}

/**
 * Initialize Raydium SDK instance.
 *
 * @param {Connection} connection - Solana RPC connection
 * @param {object} wallet - Wallet adapter { publicKey, signTransaction, signAllTransactions }
 * @param {string} network - 'mainnet' | 'devnet'
 * @returns {Promise<Raydium>} Initialized Raydium instance
 */
export async function initRaydium(connection, wallet, network = 'devnet') {
  const { Raydium } = await import('@raydium-io/raydium-sdk-v2');

  const raydium = await Raydium.load({
    connection,
    owner: wallet.publicKey,
    signAllTransactions: wallet.signAllTransactions,
    cluster: network,
    disableFeatureCheck: true,
    disableLoadToken: false,
    blockhashCommitment: 'confirmed',
  });

  return raydium;
}

/**
 * Create a Raydium AMM V4 pool (creates market + pool in one transaction).
 *
 * @param {Raydium} raydium - Initialized Raydium instance
 * @param {PublicKey} tokenMint - The memecoin Token-2022 mint
 * @param {number} tokenDecimals - Token decimals (usually 9)
 * @param {BN} tokenAmount - Amount of tokens to seed (in smallest unit)
 * @param {BN} solAmount - Amount of SOL to seed (in lamports)
 * @param {string} network - 'mainnet' | 'devnet'
 * @returns {Promise<{ txSignatures: string[], poolAddress: string }>}
 */
export async function createRaydiumPool(raydium, tokenMint, tokenDecimals, tokenAmount, solAmount, network = 'devnet') {
  const ids = getRaydiumIds(network);

  // createMarketAndPoolV4 creates the OpenBook market + AMM pool in one go
  const result = await raydium.liquidity.createMarketAndPoolV4({
    programId: ids.ammV4,
    marketProgram: ids.openbook,
    feeDestinationId: ids.feeDestination,
    baseMintInfo: {
      mint: tokenMint,
      decimals: tokenDecimals,
    },
    quoteMintInfo: {
      mint: WSOL_MINT,
      decimals: 9,
    },
    baseAmount: tokenAmount,
    quoteAmount: solAmount,
    startTime: new BN(0), // Start trading immediately
    ownerInfo: {
      useSOLBalance: true,
    },
    associatedOnly: false,
    txVersion: 'V0',
  });

  return {
    txSignatures: result.txSigned?.signatures || [],
    poolAddress: result.address?.ammId?.toBase58() || '',
    address: result.address,
  };
}

/**
 * Add liquidity to an existing Raydium AMM V4 pool.
 *
 * @param {Raydium} raydium - Initialized Raydium instance
 * @param {object} poolInfo - Pool info from API
 * @param {BN} tokenAmount - Amount of tokens to add
 * @param {BN} solAmount - Amount of SOL to add
 * @returns {Promise<object>} Transaction data
 */
export async function addRaydiumLiquidity(raydium, poolInfo, tokenAmount, solAmount) {
  const result = await raydium.liquidity.addLiquidity({
    poolInfo,
    amountInA: tokenAmount,
    amountInB: solAmount,
    fixedSide: 'A',
    txVersion: 'V0',
  });

  return result;
}

/**
 * Get Raydium pool URL for the Meteora-style frontend link.
 */
export function getRaydiumPoolUrl(poolAddress, network = 'devnet') {
  if (network === 'mainnet') {
    return `https://raydium.io/pools/${poolAddress}`;
  }
  return `https://api-v3-devnet.raydium.io/pools/detail/${poolAddress}`;
}

/**
 * Get Raydium swap URL for trading.
 */
export function getRaydiumSwapUrl(inputMint, outputMint, network = 'devnet') {
  if (network === 'mainnet') {
    return `https://raydium.io/swap/?inputMint=${inputMint}&outputMint=${outputMint}`;
  }
  return `https://api-v3-devnet.raydium.io/swap?inputMint=${inputMint}&outputMint=${outputMint}`;
}

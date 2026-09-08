/**
 * Meteora DLMM SDK integration for MemeMint.
 *
 * This module provides helpers for interacting with Meteora DLMM pools
 * after a bonding curve graduates. The DLMM program ID is the same on
 * mainnet and devnet: LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo
 *
 * SDK: @meteora-ag/dlmm
 * Data API (read-only): https://dlmm.datapi.meteora.ag
 */

import { PublicKey } from '@solana/web3.js';

// Meteora DLMM program ID (same on mainnet and devnet)
export const DLMM_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

// Meteora DLMM Data API base URLs
export const DLMM_API_MAINNET = 'https://dlmm.datapi.meteora.ag';
export const DLMM_API_DEVNET = 'https://dlmm.dev.metdev.io';

/**
 * Get the DLMM Data API base URL for the given network.
 */
export function getDlmmApiUrl(network = 'mainnet') {
  return network === 'mainnet' ? DLMM_API_MAINNET : DLMM_API_DEVNET;
}

/**
 * Find a DLMM pool by token mint address using the Data API.
 * Returns the first pool found for the token pair (tokenX/tokenY).
 */
export async function findDlmmPoolByMint(mintAddress, network = 'devnet') {
  const apiUrl = getDlmmApiUrl(network);

  try {
    const res = await fetch(
      `${apiUrl}/pools?query=${mintAddress}&page_size=10`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!res.ok) return null;

    const data = await res.json();
    const pools = data.pools || data || [];

    // Find a pool that contains our mint as either tokenX or tokenY
    const mint = mintAddress.toLowerCase();
    return pools.find(
      (p) =>
        p.mint_x?.toLowerCase() === mint ||
        p.mint_y?.toLowerCase() === mint
    ) || null;
  } catch (err) {
    console.error('Failed to find DLMM pool:', err);
    return null;
  }
}

/**
 * Get pool details from the DLMM Data API.
 */
export async function getDlmmPoolDetails(poolAddress, network = 'devnet') {
  const apiUrl = getDlmmApiUrl(network);

  try {
    const res = await fetch(`${apiUrl}/pools/${poolAddress}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    console.error('Failed to get DLMM pool details:', err);
    return null;
  }
}

/**
 * Get a user's DLMM positions from the Data API.
 */
export async function getUserDlmmPositions(walletAddress, network = 'devnet') {
  const apiUrl = getDlmmApiUrl(network);

  try {
    const res = await fetch(`${apiUrl}/portfolio/open?wallet=${walletAddress}`, {
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) return [];
    const data = await res.json();
    return data.pools || [];
  } catch (err) {
    console.error('Failed to get user DLMM positions:', err);
    return [];
  }
}

/**
 * Build a DLMM pool creation URL for the Meteora app.
 * Users can click this to create a pool via the Meteora UI.
 */
export function getMeteoraPoolUrl(poolAddress, network = 'devnet') {
  if (network === 'mainnet') {
    return `https://app.meteora.ag/pools/${poolAddress}`;
  }
  return `https://app.devnet.meteora.ag/pools/${poolAddress}`;
}

/**
 * Build a DLMM pool creation URL for a new token pair.
 * Users can click this to create a new DLMM pool on Meteora.
 */
export function getMeteoraCreatePoolUrl(mintX, mintY, network = 'devnet') {
  if (network === 'mainnet') {
    return `https://app.meteora.ag/dlmm/pool/${mintX}/${mintY}`;
  }
  return `https://app.devnet.meteora.ag/dlmm/pool/${mintX}/${mintY}`;
}

/**
 * Check if a token mint is supported by Meteora DLMM (permissionless).
 * Token-2022 mints with only MetadataPointer + TokenMetadata are permissionless.
 * Mints with freeze authority need a token badge review.
 */
export function isTokenSupported(tokenExtensions = {}) {
  // If the mint has a freeze authority, it needs a token badge
  if (tokenExtensions.freezeAuthority) {
    return { supported: false, reason: 'Mint has freeze authority - requires Meteora token badge review' };
  }

  // Permissionless extensions
  const allowedExtensions = [
    'TransferFeeConfig',
    'MetadataPointer',
    'TokenMetadata',
    'MemoTransfer',
  ];

  const usedExtensions = Object.keys(tokenExtensions).filter(
    (k) => tokenExtensions[k] && k !== 'freezeAuthority'
  );

  const unsupported = usedExtensions.filter((e) => !allowedExtensions.includes(e));
  if (unsupported.length > 0) {
    return { supported: false, reason: `Unsupported extensions: ${unsupported.join(', ')}` };
  }

  return { supported: true };
}

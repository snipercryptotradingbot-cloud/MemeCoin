import { PublicKey } from '@solana/web3.js';

// Program ID - replace with actual deployed program ID
export const BONDING_CURVE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_BONDING_CURVE_PROGRAM_ID || '3MQL5zPvAZvC8ZWkLc5qkGy3Cy31KFwxA8zngNQfoTu6'
);

// PDA seed prefixes (must match the on-chain program)
export const CURVE_SEED = Buffer.from('bonding_curve');
export const SOL_VAULT_SEED = Buffer.from('sol_vault');
export const TOKEN_VAULT_SEED = Buffer.from('token_vault');
export const USER_POSITION_SEED = Buffer.from('user_position');

// Fee defaults
export const DEFAULT_FEE_BASIS_POINTS = 100; // 1%
export const DEFAULT_SOL_TARGET_SOL = 85;
export const MIN_SOL_DEPOSIT_SOL = 1;
export const PLATFORM_FEE_SOL = parseFloat(process.env.NEXT_PUBLIC_PLATFORM_FEE_SOL || '0.1');
export const MIGRATE_FEE_SOL = parseFloat(process.env.NEXT_PUBLIC_MIGRATE_FEE_SOL || '0.05');

// Curve status enum values
export const CurveStatus = {
  Active: 0,
  Paused: 1,
  Closed: 2,
};

// Treasury wallet
export const TREASURY_WALLET = process.env.NEXT_PUBLIC_TREASURY_WALLET || process.env.TREASURY_WALLET_ADDRESS;

/**
 * Derive the curve PDA address
 */
export function getCurvePda(mintAddress) {
  const mint = typeof mintAddress === 'string' ? new PublicKey(mintAddress) : mintAddress;
  return PublicKey.findProgramAddressSync(
    [CURVE_SEED, mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
}

/**
 * Derive the SOL vault PDA address
 */
export function getSolVaultPda(curveAddress) {
  const curve = typeof curveAddress === 'string' ? new PublicKey(curveAddress) : curveAddress;
  return PublicKey.findProgramAddressSync(
    [SOL_VAULT_SEED, curve.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
}

/**
 * Derive the user position PDA address
 */
export function getUserPositionPda(curveAddress, userAddress) {
  const curve = typeof curveAddress === 'string' ? new PublicKey(curveAddress) : curveAddress;
  const user = typeof userAddress === 'string' ? new PublicKey(userAddress) : userAddress;
  return PublicKey.findProgramAddressSync(
    [USER_POSITION_SEED, curve.toBuffer(), user.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
}

/**
 * Convert SOL to lamports
 */
export function solToLamports(sol) {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Convert lamports to SOL
 */
export function lamportsToSol(lamports) {
  return lamports / 1_000_000_000;
}

/**
 * Calculate fee in lamports
 */
export function calculateFee(amount, feeBasisPoints) {
  return Math.floor((amount * feeBasisPoints) / 10_000);
}

/**
 * Calculate tokens out from bonding curve buy
 */
export function calculateTokensOut(solInAfterFee, solReserves, tokenReserves) {
  const k = BigInt(solReserves) * BigInt(tokenReserves);
  const newSolReserves = BigInt(solReserves) + BigInt(solInAfterFee);
  const newTokenReserves = k / newSolReserves;
  return Number(BigInt(tokenReserves) - newTokenReserves);
}

/**
 * Calculate SOL out from bonding curve sell
 */
export function calculateSolOut(tokensInAfterFee, solReserves, tokenReserves) {
  const k = BigInt(solReserves) * BigInt(tokenReserves);
  const newTokenReserves = BigInt(tokenReserves) + BigInt(tokensInAfterFee);
  const newSolReserves = k / newTokenReserves;
  return Number(BigInt(solReserves) - newSolReserves);
}

import { PublicKey } from '@solana/web3.js';
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getCurvePda, getSolVaultPda, getUserPositionPda, BONDING_CURVE_PROGRAM_ID } from './constants';

const CURVE_ACCOUNT_SIZE = 8 + 32 + 32 + 1 + 1 + 1 + 1 + 8 + 8 + 8 + 2 + 32 + 8 + 8 + 32; // ~208 bytes
const POSITION_ACCOUNT_SIZE = 8 + 32 + 32 + 1 + 8 + 8 + 8 + 16; // ~113 bytes

/**
 * Deserialize a BondingCurve account from raw data.
 */
function deserializeCurve(data) {
  let offset = 8; // skip discriminator

  const creator = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const mint = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const curveBump = data[offset]; offset += 1;
  const solVaultBump = data[offset]; offset += 1;
  const tokenVaultBump = data[offset]; offset += 1;
  const status = data[offset]; offset += 1;
  const solReserves = Number(data.readBigUInt64LE(offset)); offset += 8;
  const tokenReserves = Number(data.readBigUInt64LE(offset)); offset += 8;
  const initialSolTarget = Number(data.readBigUInt64LE(offset)); offset += 8;
  const feeBasisPoints = data.readUInt16LE(offset); offset += 2;
  const platformWallet = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const totalSwaps = Number(data.readBigUInt64LE(offset)); offset += 8;
  const createdAt = Number(data.readBigInt64LE(offset)); offset += 8;
  const totalLpSupply = Number(data.readBigUInt64LE(offset)); offset += 8;

  return {
    creator: creator.toBase58(),
    mint: mint.toBase58(),
    curveBump,
    solVaultBump,
    tokenVaultBump,
    status,
    solReserves,
    tokenReserves,
    initialSolTarget,
    feeBasisPoints,
    platformWallet: platformWallet.toBase58(),
    totalSwaps,
    createdAt,
    totalLpSupply,
  };
}

/**
 * Deserialize a UserPosition account from raw data.
 */
function deserializePosition(data) {
  let offset = 8; // skip discriminator

  const user = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const curve = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const bump = data[offset]; offset += 1;
  const solDeposited = Number(data.readBigUInt64LE(offset)); offset += 8;
  const tokensDeposited = Number(data.readBigUInt64LE(offset)); offset += 8;
  const lpTokens = Number(data.readBigUInt64LE(offset)); offset += 8;

  return {
    user: user.toBase58(),
    curve: curve.toBase58(),
    bump,
    solDeposited,
    tokensDeposited,
    lpTokens,
  };
}

/**
 * Fetch the on-chain bonding curve state for a given token mint.
 */
export async function getBondingCurveState(connection, mintAddress) {
  const mint = new PublicKey(mintAddress);
  const [curvePda] = getCurvePda(mint);

  const accountInfo = await connection.getAccountInfo(curvePda);
  if (!accountInfo) return null;

  const curve = deserializeCurve(accountInfo.data);

  // Fetch SOL vault balance
  const [solVaultPda] = getSolVaultPda(curvePda);
  const solVaultInfo = await connection.getAccountInfo(solVaultPda);
  curve.solVaultLamports = solVaultInfo ? solVaultInfo.lamports : 0;

  // Fetch token vault balance
  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_2022_PROGRAM_ID
  );
  const tokenVaultInfo = await connection.getTokenAccountBalance(tokenVault);
  curve.tokenVaultAmount = tokenVaultInfo?.value?.amount ? Number(tokenVaultInfo.value.amount) : 0;

  curve.curveAddress = curvePda.toBase58();
  curve.solVaultAddress = solVaultPda.toBase58();
  curve.tokenVaultAddress = tokenVault.toBase58();

  return curve;
}

/**
 * Fetch user's position in a specific bonding curve.
 */
export async function getUserPosition(connection, curveAddress, userAddress) {
  const curve = new PublicKey(curveAddress);
  const user = new PublicKey(userAddress);
  const [positionPda] = getUserPositionPda(curve, user);

  const accountInfo = await connection.getAccountInfo(positionPda);
  if (!accountInfo) return null;

  return deserializePosition(accountInfo.data);
}

/**
 * Fetch all bonding curves (via getProgramAccounts).
 * Note: This can be slow on mainnet with many curves. Consider using indexed data in production.
 */
export async function getAllBondingCurves(connection) {
  const accounts = await connection.getProgramAccounts(BONDING_CURVE_PROGRAM_ID, {
    commitment: 'confirmed',
  });

  return accounts
    .map(({ pubkey, account }) => ({
      curveAddress: pubkey.toBase58(),
      ...deserializeCurve(account.data),
    }))
    .filter((curve) => curve.status !== 2); // exclude closed
}

/**
 * Get pool summary for display (combines on-chain + DB data).
 */
export async function getPoolSummary(connection, mintAddress, dbPool = null) {
  const curve = await getBondingCurveState(connection, mintAddress);
  if (!curve) return null;

  const progress = curve.initialSolTarget > 0
    ? Math.min((curve.solReserves / curve.initialSolTarget) * 100, 100)
    : 0;

  const statusMap = { 0: 'active', 1: 'paused', 2: 'closed' };

  return {
    curveAddress: curve.curveAddress,
    mintAddress: curve.mint,
    creator: curve.creator,
    solReserves: curve.solReserves / 1e9,
    tokenReserves: curve.tokenReserves,
    solTarget: curve.initialSolTarget / 1e9,
    progress,
    status: statusMap[curve.status] || 'unknown',
    feeBasisPoints: curve.feeBasisPoints,
    feePercent: (curve.feeBasisPoints / 100).toFixed(1) + '%',
    totalSwaps: curve.totalSwaps,
    totalLpSupply: curve.totalLpSupply,
    createdAt: curve.createdAt,
    // Merge DB data if available
    ...(dbPool ? {
      poolId: dbPool.id,
      tokenId: dbPool.token_id,
      tokenName: dbPool.token_name,
      tokenSymbol: dbPool.token_symbol,
    } : {}),
  };
}

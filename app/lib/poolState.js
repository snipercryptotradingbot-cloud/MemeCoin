import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { getCurvePda, getSolVaultPda, getProgramId, BONDING_CURVE_PROGRAM_ID } from './constants.js';

// BondingCurve: discriminator(8) + creator(32) + mint(32) + curveBump(1) + solVaultBump(1) + status(1)
//   + solReserves(8) + tokenReserves(8) + initialSolTarget(8) + feeBasisPoints(2)
//   + platformWallet(32) + totalSwaps(8) + createdAt(8) + dlmmPool(32) + padding(32)
const CURVE_ACCOUNT_SIZE = 8 + 32 + 32 + 1 + 1 + 1 + 8 + 8 + 8 + 2 + 32 + 8 + 8 + 32 + 32; // 232 bytes

/**
 * Deserialize a BondingCurve account from raw data.
 */
function deserializeCurve(data) {
  let offset = 8; // skip discriminator

  const creator = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const mint = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const curveBump = data[offset]; offset += 1;
  const solVaultBump = data[offset]; offset += 1;
  const status = data[offset]; offset += 1;
  const solReserves = Number(data.readBigUInt64LE(offset)); offset += 8;
  const tokenReserves = Number(data.readBigUInt64LE(offset)); offset += 8;
  const initialSolTarget = Number(data.readBigUInt64LE(offset)); offset += 8;
  const feeBasisPoints = data.readUInt16LE(offset); offset += 2;
  const platformWallet = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const totalSwaps = Number(data.readBigUInt64LE(offset)); offset += 8;
  const createdAt = Number(data.readBigInt64LE(offset)); offset += 8;
  const dlmmPool = new PublicKey(data.slice(offset, offset + 32)); offset += 32;

  return {
    creator: creator.toBase58(),
    mint: mint.toBase58(),
    curveBump,
    solVaultBump,
    status,
    solReserves,
    tokenReserves,
    initialSolTarget,
    feeBasisPoints,
    platformWallet: platformWallet.toBase58(),
    totalSwaps,
    createdAt,
    dlmmPool: dlmmPool.toBase58(),
  };
}

/**
 * Fetch the on-chain bonding curve state for a given token mint.
 */
export async function getBondingCurveState(connection, mintAddress, network = 'devnet') {
  const mint = new PublicKey(mintAddress);
  const [curvePda] = getCurvePda(mint, network);

  const accountInfo = await connection.getAccountInfo(curvePda);
  if (!accountInfo) return null;

  const curve = deserializeCurve(accountInfo.data);

  // Fetch SOL vault balance
  const [solVaultPda] = getSolVaultPda(curvePda, network);
  const solVaultInfo = await connection.getAccountInfo(solVaultPda);
  curve.solVaultLamports = solVaultInfo ? solVaultInfo.lamports : 0;

  // Fetch token vault balance
  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_PROGRAM_ID
  );
  const tokenVaultInfo = await connection.getTokenAccountBalance(tokenVault);
  curve.tokenVaultAmount = tokenVaultInfo?.value?.amount ? Number(tokenVaultInfo.value.amount) : 0;

  curve.curveAddress = curvePda.toBase58();
  curve.solVaultAddress = solVaultPda.toBase58();
  curve.tokenVaultAddress = tokenVault.toBase58();

  return curve;
}

/**
 * Fetch all bonding curves (via getProgramAccounts).
 */
export async function getAllBondingCurves(connection, network = 'devnet') {
  const accounts = await connection.getProgramAccounts(getProgramId(network), {
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
export async function getPoolSummary(connection, mintAddress, dbPool = null, network = 'devnet') {
  const curve = await getBondingCurveState(connection, mintAddress, network);
  if (!curve) return null;

  const progress = curve.initialSolTarget > 0
    ? Math.min((curve.solReserves / curve.initialSolTarget) * 100, 100)
    : 0;

  const statusMap = { 0: 'active', 1: 'paused', 2: 'closed', 3: 'migrated' };

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
    createdAt: curve.createdAt,
    dlmmPool: curve.dlmmPool,
    solVaultLamports: curve.solVaultLamports || 0,
    // Merge DB data if available
    ...(dbPool ? {
      poolId: dbPool.id,
      tokenId: dbPool.token_id,
      tokenName: dbPool.token_name,
      tokenSymbol: dbPool.token_symbol,
    } : {}),
  };
}

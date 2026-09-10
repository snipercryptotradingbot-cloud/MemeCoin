import {
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  BONDING_CURVE_PROGRAM_ID,
  getProgramId,
  CURVE_SEED,
  SOL_VAULT_SEED,
  DEFAULT_FEE_BASIS_POINTS,
  DEFAULT_SOL_TARGET_SOL,
  solToLamports,
  getCurvePda,
  getSolVaultPda,
} from './constants.js';

import { getBondingCurveState } from './poolState.js';

/**
 * Build an initialize_curve instruction.
 */
export async function buildInitializeCurveTx(
  connection,
  walletAddress,
  mintAddress,
  initialSol,
  initialTokens,
  feeBasisPoints = DEFAULT_FEE_BASIS_POINTS,
  solTarget = DEFAULT_SOL_TARGET_SOL,
  network = 'devnet'
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const programId = getProgramId(network);

  const [curvePda] = getCurvePda(mint, network);
  const [solVaultPda] = getSolVaultPda(curvePda, network);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_PROGRAM_ID
  );

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_PROGRAM_ID
  );

  const solLamports = solToLamports(initialSol);
  const solTargetLamports = solToLamports(solTarget);

  const transaction = new Transaction();

  // Platform fee
  const platformFeeLamports = solToLamports(0.1);
  if (platformFeeLamports > 0) {
    const treasuryAddress = process.env.NEXT_PUBLIC_TREASURY_WALLET || process.env.TREASURY_WALLET_ADDRESS;
    if (treasuryAddress) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: new PublicKey(treasuryAddress),
          lamports: platformFeeLamports,
        })
      );
    }
  }

  // discriminator = sha256("global:initialize_curve")[0..8]
  const discriminator = Buffer.from([170, 84, 186, 253, 131, 149, 95, 213]);
  const data = Buffer.alloc(8 + 8 + 8 + 8 + 2);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(solLamports), 8);
  data.writeBigUInt64LE(BigInt(initialTokens), 16);
  data.writeBigUInt64LE(BigInt(solTargetLamports), 24);
  data.writeUInt16LE(feeBasisPoints, 32);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: solVaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build a buy_tokens instruction.
 */
export async function buildBuyTokensTx(
  connection,
  walletAddress,
  mintAddress,
  solAmount,
  minTokensOut = 0,
  network = 'devnet'
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const programId = getProgramId(network);

  const [curvePda] = getCurvePda(mint, network);
  const [solVaultPda] = getSolVaultPda(curvePda, network);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_PROGRAM_ID
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_PROGRAM_ID
  );

  const solLamports = solToLamports(solAmount);

  const curveState = await getBondingCurveState(connection, mintAddress, network);
  if (!curveState) throw new Error('Bonding curve not found for mint');
  const platformWallet = new PublicKey(curveState.platformWallet);

  const transaction = new Transaction();

  const discriminator = Buffer.from([189, 21, 230, 133, 247, 2, 110, 42]);
  const data = Buffer.alloc(8 + 8 + 8);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(solLamports), 8);
  data.writeBigUInt64LE(BigInt(minTokensOut), 16);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: solVaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: platformWallet, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build a sell_tokens instruction.
 */
export async function buildSellTokensTx(
  connection,
  walletAddress,
  mintAddress,
  tokenAmount,
  minSolOut = 0,
  network = 'devnet'
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const programId = getProgramId(network);

  const [curvePda] = getCurvePda(mint, network);
  const [solVaultPda] = getSolVaultPda(curvePda, network);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_PROGRAM_ID
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_PROGRAM_ID
  );

  const curveState = await getBondingCurveState(connection, mintAddress, network);
  if (!curveState) throw new Error('Bonding curve not found for mint');
  const platformWallet = new PublicKey(curveState.platformWallet);

  const transaction = new Transaction();

  const discriminator = Buffer.from([114, 242, 25, 12, 62, 126, 92, 2]);
  const data = Buffer.alloc(8 + 8 + 8);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(tokenAmount), 8);
  data.writeBigUInt64LE(BigInt(minSolOut), 16);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: solVaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: userTokenAccount, isSigner: false, isWritable: true },
    { pubkey: platformWallet, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build a migrate_to_dex instruction.
 * Graduates the curve: pays out remaining SOL and tokens to the creator.
 * The creator then uses the Meteora DLMM SDK via the frontend to create a pool.
 */
export async function buildMigrateToDexTx(
  connection,
  walletAddress,
  mintAddress,
  network = 'devnet'
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const programId = getProgramId(network);

  const [curvePda] = getCurvePda(mint, network);
  const [solVaultPda] = getSolVaultPda(curvePda, network);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_PROGRAM_ID
  );

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_PROGRAM_ID
  );

  const transaction = new Transaction();

  const discriminator = Buffer.from([246, 150, 122, 141, 49, 26, 211, 26]);
  const data = Buffer.alloc(8);
  discriminator.copy(data, 0);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: solVaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build a pause_curve instruction.
 */
export async function buildPauseCurveTx(connection, walletAddress, mintAddress, network = 'devnet') {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const programId = getProgramId(network);
  const [curvePda] = getCurvePda(mint, network);

  const transaction = new Transaction();

  const discriminator = Buffer.from([239, 130, 222, 185, 53, 147, 181, 249]);
  const data = Buffer.alloc(8);
  discriminator.copy(data, 0);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build a close_curve instruction.
 */
export async function buildCloseCurveTx(connection, walletAddress, mintAddress, network = 'devnet') {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const programId = getProgramId(network);
  const [curvePda] = getCurvePda(mint, network);

  const transaction = new Transaction();

  const discriminator = Buffer.from([228, 177, 198, 182, 76, 121, 111, 104]);
  const data = Buffer.alloc(8);
  discriminator.copy(data, 0);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

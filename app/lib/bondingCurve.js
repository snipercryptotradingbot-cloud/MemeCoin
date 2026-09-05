import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import {
  BONDING_CURVE_PROGRAM_ID,
  CURVE_SEED,
  SOL_VAULT_SEED,
  USER_POSITION_SEED,
  DEFAULT_FEE_BASIS_POINTS,
  DEFAULT_SOL_TARGET_SOL,
  MIN_SOL_DEPOSIT_SOL,
  solToLamports,
  getCurvePda,
  getSolVaultPda,
  getUserPositionPda,
} from './constants';

/**
 * Build an initialize_curve instruction.
 * Creates the bonding curve PDA, SOL vault, token vault, and deposits initial reserves.
 */
export async function buildInitializeCurveTx(
  connection,
  walletAddress,
  mintAddress,
  initialSol,
  initialTokens,
  feeBasisPoints = DEFAULT_FEE_BASIS_POINTS,
  solTarget = DEFAULT_SOL_TARGET_SOL
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const [curvePda] = getCurvePda(mint);
  const [solVaultPda] = getSolVaultPda(curvePda);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true, // allowOwnerOffCurve - PDA is owner
    TOKEN_2022_PROGRAM_ID
  );

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const solLamports = solToLamports(initialSol);
  const solTargetLamports = solToLamports(solTarget);

  const transaction = new Transaction();

  // Platform fee
  const platformFeeLamports = solToLamports(0.1); // 0.1 SOL platform fee
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

  // Build the instruction data manually (Anchor discriminator + args)
  // discriminator = sha256("global:initialize_curve")[0..8]
  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
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
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
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
  minTokensOut = 0
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const [curvePda] = getCurvePda(mint);
  const [solVaultPda] = getSolVaultPda(curvePda);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const solLamports = solToLamports(solAmount);

  const transaction = new Transaction();

  // discriminator for buy_tokens = sha256("global:buy_tokens")[0..8]
  const discriminator = Buffer.from([183, 18, 246, 207, 160, 24, 174, 174]);
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
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
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
  minSolOut = 0
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const [curvePda] = getCurvePda(mint);
  const [solVaultPda] = getSolVaultPda(curvePda);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const userTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const transaction = new Transaction();

  // discriminator for sell_tokens = sha256("global:sell_tokens")[0..8]
  const discriminator = Buffer.from([109, 61, 44, 130, 164, 149, 45, 170]);
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
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build an add_liquidity instruction.
 */
export async function buildAddLiquidityTx(
  connection,
  walletAddress,
  mintAddress,
  solAmount,
  tokenAmount
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const [curvePda] = getCurvePda(mint);
  const [solVaultPda] = getSolVaultPda(curvePda);
  const [userPositionPda] = getUserPositionPda(curvePda, payer);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const solLamports = solToLamports(solAmount);

  const transaction = new Transaction();

  // discriminator for add_liquidity = sha256("global:add_liquidity")[0..8]
  const discriminator = Buffer.from([163, 109, 175, 81, 186, 131, 242, 135]);
  const data = Buffer.alloc(8 + 8 + 8);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(solLamports), 8);
  data.writeBigUInt64LE(BigInt(tokenAmount), 16);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: solVaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPositionPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

/**
 * Build a remove_liquidity instruction.
 */
export async function buildRemoveLiquidityTx(
  connection,
  walletAddress,
  mintAddress,
  lpTokens
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const [curvePda] = getCurvePda(mint);
  const [solVaultPda] = getSolVaultPda(curvePda);
  const [userPositionPda] = getUserPositionPda(curvePda, payer);

  const tokenVault = getAssociatedTokenAddressSync(
    mint,
    curvePda,
    true,
    TOKEN_2022_PROGRAM_ID
  );

  const creatorTokenAccount = getAssociatedTokenAddressSync(
    mint,
    payer,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  const transaction = new Transaction();

  // discriminator for remove_liquidity = sha256("global:remove_liquidity")[0..8]
  const discriminator = Buffer.from([136, 224, 193, 174, 206, 148, 205, 186]);
  const data = Buffer.alloc(8 + 8);
  discriminator.copy(data, 0);
  data.writeBigUInt64LE(BigInt(lpTokens), 8);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: solVaultPda, isSigner: false, isWritable: true },
    { pubkey: tokenVault, isSigner: false, isWritable: true },
    { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
    { pubkey: userPositionPda, isSigner: false, isWritable: true },
    { pubkey: TOKEN_2022_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'), isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
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
export async function buildPauseCurveTx(connection, walletAddress, mintAddress) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const [curvePda] = getCurvePda(mint);

  const transaction = new Transaction();

  // discriminator for pause_curve = sha256("global:pause_curve")[0..8]
  const discriminator = Buffer.from([185, 99, 185, 225, 26, 153, 143, 163]);
  const data = Buffer.alloc(8);
  discriminator.copy(data, 0);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
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
export async function buildCloseCurveTx(connection, walletAddress, mintAddress) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);
  const [curvePda] = getCurvePda(mint);

  const transaction = new Transaction();

  // discriminator for close_curve = sha256("global:close_curve")[0..8]
  const discriminator = Buffer.from([25, 180, 31, 42, 237, 65, 148, 160]);
  const data = Buffer.alloc(8);
  discriminator.copy(data, 0);

  const keys = [
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: curvePda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
  ];

  transaction.add({
    keys,
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  });

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  return { transaction, curvePda: curvePda.toBase58() };
}

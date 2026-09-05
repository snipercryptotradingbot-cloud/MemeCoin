/**
 * Migrate Liquidity - DEPRECATED
 *
 * This module previously handled migration to Raydium AMM.
 * The new architecture uses a self-contained bonding curve program
 * that serves as both the bonding curve and AMM.
 *
 * For pool lifecycle management, use:
 *   - app/lib/bondingCurve.js (build transactions)
 *   - app/lib/poolState.js (read on-chain state)
 *   - app/api/liquidity/route.js (API endpoints)
 */

const MIGRATE_FEE_SOL = 0.05;

export { MIGRATE_FEE_SOL };

/**
 * @deprecated Use bondingCurve.js functions instead.
 * This function is kept for backward compatibility.
 */
export async function migrateToAmm(
  connection,
  walletProvider,
  walletAddress,
  tokenMint,
  poolAddress,
  treasuryAddress
) {
  console.warn('migrateToAmm is deprecated. Use the bonding curve program instead.');

  // For backward compatibility, just transfer the fee
  const { SystemProgram, Transaction, PublicKey, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

  const payer = new PublicKey(walletAddress);
  const transaction = new Transaction();

  if (treasuryAddress) {
    const feeLamports = Math.floor(MIGRATE_FEE_SOL * LAMPORTS_PER_SOL);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: new PublicKey(treasuryAddress),
        lamports: feeLamports,
      })
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  const txSignature = await walletProvider.sendTransaction(transaction, connection);

  await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return {
    txSignature,
    action: 'fee_only',
    tokenMint,
    poolAddress,
    feePaid: MIGRATE_FEE_SOL,
  };
}

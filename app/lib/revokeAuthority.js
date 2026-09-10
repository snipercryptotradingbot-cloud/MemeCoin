import {
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createSetAuthorityInstruction,
  AuthorityType,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

const REVOKE_FEE_SOL = 0.02;

export async function revokeMintAuthority(
  connection,
  walletProvider,
  walletAddress,
  mintAddress,
  treasuryAddress
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const transaction = new Transaction();

  if (treasuryAddress) {
    const feeLamports = Math.floor(REVOKE_FEE_SOL * LAMPORTS_PER_SOL);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: new PublicKey(treasuryAddress),
        lamports: feeLamports,
      })
    );
  }

  transaction.add(
    createSetAuthorityInstruction(
      mint,
      payer,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  const txSignature = await walletProvider.sendTransaction(transaction, connection);

  await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return { txSignature, action: 'revoke_mint_authority' };
}

export async function revokeFreezeAuthority(
  connection,
  walletProvider,
  walletAddress,
  mintAddress,
  treasuryAddress
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const transaction = new Transaction();

  if (treasuryAddress) {
    const feeLamports = Math.floor(REVOKE_FEE_SOL * LAMPORTS_PER_SOL);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: new PublicKey(treasuryAddress),
        lamports: feeLamports,
      })
    );
  }

  transaction.add(
    createSetAuthorityInstruction(
      mint,
      payer,
      AuthorityType.FreezeAccount,
      null,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  const txSignature = await walletProvider.sendTransaction(transaction, connection);

  await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return { txSignature, action: 'revoke_freeze_authority' };
}

export async function revokeBoth(
  connection,
  walletProvider,
  walletAddress,
  mintAddress,
  treasuryAddress
) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const transaction = new Transaction();

  if (treasuryAddress) {
    const feeLamports = Math.floor(REVOKE_FEE_SOL * LAMPORTS_PER_SOL);
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: payer,
        toPubkey: new PublicKey(treasuryAddress),
        lamports: feeLamports,
      })
    );
  }

  transaction.add(
    createSetAuthorityInstruction(
      mint,
      payer,
      AuthorityType.MintTokens,
      null,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  transaction.add(
    createSetAuthorityInstruction(
      mint,
      payer,
      AuthorityType.FreezeAccount,
      null,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  const txSignature = await walletProvider.sendTransaction(transaction, connection);

  await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    'confirmed'
  );

  return { txSignature, action: 'revoke_both_authorities' };
}

export { REVOKE_FEE_SOL };
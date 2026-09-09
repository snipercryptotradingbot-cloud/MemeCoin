import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createInitializeMetadataPointerInstruction,
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  AuthorityType,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  pack,
} from '@solana/spl-token-metadata';

/**
 * Create a new SPL Token (Token-2022) with on-chain metadata.
 * Includes a platform fee transfer in the same atomic transaction.
 */
export async function createMemeCoin(connection, walletProvider, walletAddress, config, treasuryAddress) {
  const payer = new PublicKey(walletAddress);
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const tokenMetadata = {
    mint: mint,
    name: config.name,
    symbol: config.symbol,
    uri: config.uri,
    additionalMetadata: [],
  };

  // Manual space: base mint (82) + MetadataPointer ext (12) + TokenMetadata ext header (3) + packed metadata
  const BASE_MINT_SIZE = 82;
  const METADATA_POINTER_EXT_SIZE = 12;
  const TOKEN_METADATA_EXT_HEADER_SIZE = 3;
  const packedMetadata = pack(tokenMetadata);
  const totalLen = BASE_MINT_SIZE + METADATA_POINTER_EXT_SIZE + TOKEN_METADATA_EXT_HEADER_SIZE + packedMetadata.length;

  const lamports = await connection.getMinimumBalanceForRentExemption(totalLen);

  const transaction = new Transaction();

  // 1. Platform fee transfer
  if (treasuryAddress) {
    const platformFeeLamports = Math.floor(
      parseFloat(process.env.NEXT_PUBLIC_PLATFORM_FEE_SOL || '0.1') * LAMPORTS_PER_SOL
    ) - lamports - 5000;

    if (platformFeeLamports > 0) {
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: payer,
          toPubkey: new PublicKey(treasuryAddress),
          lamports: platformFeeLamports,
        })
      );
    }
  }

  // 2. Create the mint account (with space for extensions)
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: totalLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 3. Initialize Mint2 FIRST (writes base mint data at bytes 0-81)
  transaction.add(
    createInitializeMint2Instruction(
      mint,
      config.decimals,
      payer,
      payer,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Initialize Metadata Pointer (writes to extension area AFTER mint init)
  transaction.add(
    createInitializeMetadataPointerInstruction(
      mint,
      payer,
      mint,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 5. Initialize token metadata on the mint account
  transaction.add(
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      metadata: mint,
      name: tokenMetadata.name,
      symbol: tokenMetadata.symbol,
      uri: tokenMetadata.uri,
      mintAuthority: payer,
      updateAuthority: payer,
    })
  );

  // 6. Create ATA and mint supply
  const supply = BigInt(config.supply) * BigInt(10 ** config.decimals);
  if (supply > 0n) {
    const ata = getAssociatedTokenAddressSync(mint, payer, false, TOKEN_2022_PROGRAM_ID);

    transaction.add(
      createAssociatedTokenAccountInstruction(payer, ata, payer, mint, TOKEN_2022_PROGRAM_ID)
    );

    transaction.add(
      createMintToInstruction(mint, ata, payer, supply, [], TOKEN_2022_PROGRAM_ID)
    );
  }

  // 7. Revoke Mint Authority
  if (config.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID)
    );
  }

  // 8. Revoke Freeze Authority
  if (config.revokeFreezeAuthority) {
    transaction.add(
      createSetAuthorityInstruction(mint, payer, AuthorityType.FreezeAccount, null, [], TOKEN_2022_PROGRAM_ID)
    );
  }

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  transaction.partialSign(mintKeypair);

  const txSignature = await walletProvider.sendTransaction(transaction, connection);

  await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed');

  return { mintAddress: mint.toBase58(), txSignature };
}

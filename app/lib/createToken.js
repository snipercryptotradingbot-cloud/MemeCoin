import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import {
  createInitializeMetadataPointerInstruction,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  ExtensionType,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  AuthorityType,
  LENGTH_SIZE,
  TYPE_SIZE,
} from '@solana/spl-token';
import {
  createInitializeInstruction,
  pack,
} from '@solana/spl-token-metadata';

/**
 * Create a new SPL Token (Token-2022) with on-chain metadata.
 * Includes a platform fee transfer in the same atomic transaction.
 *
 * @param {Connection} connection - Solana connection
 * @param {object} walletProvider - Reown wallet provider with sendTransaction
 * @param {string} walletAddress - Connected wallet public key string
 * @param {object} config - Token configuration
 * @param {string} config.name - Token name
 * @param {string} config.symbol - Token symbol
 * @param {string} config.uri - Metadata URI (IPFS)
 * @param {number} config.decimals - Token decimals (0-9)
 * @param {string} config.supply - Total supply as string
 * @param {boolean} config.revokeMintAuthority - Whether to revoke mint authority
 * @param {boolean} config.revokeFreezeAuthority - Whether to revoke freeze authority
 * @param {string} treasuryAddress - Treasury wallet for platform fee
 * @returns {{ mintAddress: string, txSignature: string }}
 */
export async function createMemeCoin(connection, walletProvider, walletAddress, config, treasuryAddress) {
  const payer = new PublicKey(walletAddress);
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  // Build the on-chain metadata
  const tokenMetadata = {
    mint: mint,
    name: config.name,
    symbol: config.symbol,
    uri: config.uri,
    additionalMetadata: [],
  };

  // Calculate the space needed for the mint account
  const mintLen = getMintLen([ExtensionType.MetadataPointer]);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(tokenMetadata).length;
  const totalLen = mintLen + metadataLen;

  // Calculate rent
  const lamports = await connection.getMinimumBalanceForRentExemption(totalLen);

  // Build the transaction
  const transaction = new Transaction();

  // 1. Platform fee transfer (if treasury address is set)
  if (treasuryAddress) {
    const platformFeeLamports = Math.floor(
      parseFloat(process.env.NEXT_PUBLIC_PLATFORM_FEE_SOL || '0.1') * LAMPORTS_PER_SOL
    ) - lamports - 5000; // Subtract rent and tx fee from total 0.1 SOL

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

  // 2. Create the mint account
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: totalLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 3. Initialize the Mint (must come before extension initialization)
  transaction.add(
    createInitializeMintInstruction(
      mint,
      config.decimals,
      payer,
      payer, // freeze authority (will be revoked if configured)
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Initialize Metadata Pointer (points to the mint itself)
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

  // 6. Create Associated Token Account and Mint Supply (if supply > 0)
  const supply = BigInt(config.supply) * BigInt(10 ** config.decimals);
  if (supply > 0n) {
    const ata = getAssociatedTokenAddressSync(
      mint,
      payer,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    transaction.add(
      createAssociatedTokenAccountInstruction(
        payer,
        ata,
        payer,
        mint,
        TOKEN_2022_PROGRAM_ID
      )
    );

    transaction.add(
      createMintToInstruction(
        mint,
        ata,
        payer,
        supply,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // 7. Revoke Mint Authority (makes supply immutable)
  if (config.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mint,
        payer,
        AuthorityType.MintTokens,
        null,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // 8. Revoke Freeze Authority
  if (config.revokeFreezeAuthority) {
    transaction.add(
      createSetAuthorityInstruction(
        mint,
        payer,
        AuthorityType.FreezeAccount,
        null,
        [],
        TOKEN_2022_PROGRAM_ID
      )
    );
  }

  // Set recent blockhash and fee payer
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  // Partially sign with the mint keypair
  transaction.partialSign(mintKeypair);

  // Send the transaction via the wallet provider
  const txSignature = await walletProvider.sendTransaction(transaction, connection);

  // Wait for confirmation
  await connection.confirmTransaction(
    {
      signature: txSignature,
      blockhash,
      lastValidBlockHeight,
    },
    'confirmed'
  );

  return {
    mintAddress: mint.toBase58(),
    txSignature,
  };
}

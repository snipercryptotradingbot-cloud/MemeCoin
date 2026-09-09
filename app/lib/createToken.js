import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  createInitializeMint2Instruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  AuthorityType,
} from '@solana/spl-token';

const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

function getMetadataPda(mint) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  )[0];
}

function createCreateMetadataAccountV3Instruction(mint, name, symbol, uri, payer) {
  const metadataPda = getMetadataPda(mint);

  function borshString(str) {
    const buf = Buffer.from(str, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }

  const discriminator = Buffer.from([33]);

  const dataV2 = Buffer.concat([
    borshString(name),
    borshString(symbol),
    borshString(uri),
    Buffer.from([0, 0]),
    Buffer.from([0]),
    Buffer.from([0]),
    Buffer.from([0]),
  ]);

  const isMutable = Buffer.from([1]);
  const collectionDetails = Buffer.from([0]);

  const data = Buffer.concat([discriminator, dataV2, isMutable, collectionDetails]);

  const keys = [
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
  ];

  return new TransactionInstruction({
    keys,
    programId: METADATA_PROGRAM_ID,
    data,
  });
}

/**
 * Transaction 1: Create Token-2022 mint, ATA, mint supply, revoke authorities.
 * This is a simple transaction that simulates and sends without issues.
 */
export async function createMintTransaction(connection, walletProvider, walletAddress, config, treasuryAddress) {
  const payer = new PublicKey(walletAddress);
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const lamports = await connection.getMinimumBalanceForRentExemption(82);

  const transaction = new Transaction();

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

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: 82,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  transaction.add(
    createInitializeMint2Instruction(
      mint,
      config.decimals,
      payer,
      payer,
      TOKEN_2022_PROGRAM_ID
    )
  );

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

  if (config.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID)
    );
  }

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

/**
 * Transaction 2: Create Metaplex on-chain metadata for the mint.
 * Uses skipPreflight because the Metaplex instruction causes Phantom simulation failures.
 */
export async function createMetadataTransaction(connection, walletProvider, walletAddress, mintAddress, name, symbol, uri) {
  const payer = new PublicKey(walletAddress);
  const mint = new PublicKey(mintAddress);

  const transaction = new Transaction();

  transaction.add(
    createCreateMetadataAccountV3Instruction(mint, name, symbol, uri, payer)
  );

  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = payer;

  const txSignature = await walletProvider.sendTransaction(transaction, connection, {
    skipPreflight: true,
  });

  await connection.confirmTransaction({ signature: txSignature, blockhash, lastValidBlockHeight }, 'confirmed');

  return { txSignature };
}

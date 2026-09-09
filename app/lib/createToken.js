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

  // Borsh encode DataV2
  function borshString(str) {
    const buf = Buffer.from(str, 'utf8');
    const len = Buffer.alloc(4);
    len.writeUInt32LE(buf.length);
    return Buffer.concat([len, buf]);
  }

  // Discriminator for CreateMetadataAccountV3: sha256("global:create_metadata_account_v3")[..8]
  const discriminator = Buffer.from([33, 205, 169, 68, 211, 188, 208, 161]);

  const dataV2 = Buffer.concat([
    borshString(name),
    borshString(symbol),
    borshString(uri),
    Buffer.from([0, 0]), // sellerFeeBasisPoints: u16 = 0
    Buffer.from([0]),    // creators: Option = None
    Buffer.from([0]),    // collection: Option = None
    Buffer.from([0]),    // uses: Option = None
  ]);

  const isMutable = Buffer.from([1]); // true
  const collectionDetails = Buffer.from([0]); // Option = None

  const data = Buffer.concat([discriminator, dataV2, isMutable, collectionDetails]);

  const keys = [
    { pubkey: metadataPda, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: payer, isSigner: true, isWritable: true },
    { pubkey: payer, isSigner: true, isWritable: true }, // updateAuthority (same as payer)
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
 * Create a new SPL Token (Token-2022) with Metaplex on-chain metadata.
 */
export async function createMemeCoin(connection, walletProvider, walletAddress, config, treasuryAddress) {
  const payer = new PublicKey(walletAddress);
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

  const lamports = await connection.getMinimumBalanceForRentExemption(82);

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

  // 2. Create the mint account (bare 82 bytes, Token-2022)
  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint,
      space: 82,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    })
  );

  // 3. Initialize the Mint
  transaction.add(
    createInitializeMint2Instruction(
      mint,
      config.decimals,
      payer,
      payer,
      TOKEN_2022_PROGRAM_ID
    )
  );

  // 4. Create Metaplex on-chain metadata
  transaction.add(
    createCreateMetadataAccountV3Instruction(
      mint,
      config.name,
      config.symbol,
      config.uri,
      payer
    )
  );

  // 5. Create ATA and mint supply
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

  // 6. Revoke Mint Authority
  if (config.revokeMintAuthority) {
    transaction.add(
      createSetAuthorityInstruction(mint, payer, AuthorityType.MintTokens, null, [], TOKEN_2022_PROGRAM_ID)
    );
  }

  // 7. Revoke Freeze Authority
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

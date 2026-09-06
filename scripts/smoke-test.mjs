#!/usr/bin/env node
/**
 * MemeMint E2E smoke test (Solana devnet).
 *
 * Modes:
 *   --local  Build + sign transactions locally (RPC only). Does not touch the worker.
 *   --api    Drive every action through the deployed worker's /api/liquidity endpoints
 *            (mirrors the browser UI) and assert D1-backed responses.
 *
 * Env:
 *   WORKER_BASE            Base URL of the worker (default mememint-dev).
 *   NETWORK                devnet (default) | mainnet.
 *   SOLANA_DEPLOYER_KEYPAIR  Base64 solana keypair that funds the ephemeral wallets
 *                           (falls back to ~/.config/solana/id.json).
 *
 * Flow: fund creator+trader -> create Token-2022 mint -> initialize curve (target 2 SOL)
 *   -> buy 0.2 + 2.1 SOL (surpass target) -> trader sell -> trader add_liquidity
 *   -> trader remove_liquidity -> creator migrate_to_dex (payout + status Migrated)
 *   -> creator close_curve. Every step is asserted on-chain via poolState.js; in --api
 *   mode also via the worker APIs (GET status/pools + positions D1 records).
 *
 * Note: spl-token action helpers (createMint, mintTo, getOrCreateAssociatedTokenAccount)
 * build transactions without a blockhash/feePayer, so token instructions are constructed
 * manually and pushed through the same serialize->sendRawTransaction pipeline.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import {
  MINT_SIZE,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createInitializeMintInstruction,
  createMintToInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import {
  buildInitializeCurveTx,
  buildBuyTokensTx,
  buildSellTokensTx,
  buildAddLiquidityTx,
  buildRemoveLiquidityTx,
  buildMigrateToDexTx,
  buildCloseCurveTx,
} from '../app/lib/bondingCurve.js';
import { getBondingCurveState, getUserPosition } from '../app/lib/poolState.js';

// ---------- config ----------
const args = process.argv.slice(2);
const MODE = args.includes('--api') ? 'api' : 'local';
const QUICK = args.includes('--quick');
const WORKER_BASE = process.env.WORKER_BASE || 'https://mememint-dev.snipercryptotradingbot.workers.dev';
const NETWORK = process.env.NETWORK || 'devnet';

// Load .env.local into process.env so builders read NEXT_PUBLIC_* consistently.
{
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
    }
  }
}

const RPC_URL = NETWORK === 'mainnet'
  ? process.env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
  : process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET || 'https://api.devnet.solana.com';

const connection = new Connection(RPC_URL, 'confirmed');

// ---------- helpers ----------
let passed = 0;
let failed = 0;
function check(label, cond, extra = '') {
  if (cond) {
    passed++;
    console.log(`  \u2713 ${label}`);
  } else {
    failed++;
    console.log(`  \u2717 ${label} ${extra}`);
  }
}
function sol(v) { return v / LAMPORTS_PER_SOL; }
function loadFunder() {
  const b64 = process.env.SOLANA_SMOKE_FUNDER_KEYPAIR || process.env.SOLANA_DEPLOYER_KEYPAIR;
  if (b64) {
    const raw = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const p = path.resolve(process.env.HOME || process.env.USERPROFILE || '~', '.config/solana/id.json');
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(p, 'utf8'))));
}
async function sendAndConfirm(tx) {
  const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}
async function ensureFunderBalance(fromKeypair, needed) {
  const buffer = 0.05 * LAMPORTS_PER_SOL;
  const dropEndpoints = [
    process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET,
    'https://api.devnet.solana.com',
  ].filter(Boolean);
  for (let i = 0; i < 8; i++) {
    let bal = await connection.getBalance(fromKeypair.publicKey);
    if (bal >= needed + buffer) return bal;
    const drop = Math.min(2 * LAMPORTS_PER_SOL, Math.ceil(needed + buffer - bal));
    console.log(`  airdropping ${sol(drop).toFixed(2)} SOL to funder (balance=${sol(bal).toFixed(2)}, need=${sol(needed + buffer).toFixed(2)})`);
    let ok = false;
    for (const url of dropEndpoints) {
      try {
        const c = url === RPC_URL ? connection : new Connection(url, 'confirmed');
        const sig = await c.requestAirdrop(fromKeypair.publicKey, drop);
        await c.confirmTransaction(sig, 'confirmed');
        ok = true;
        break;
      } catch (e) {
        console.log(`    faucet ${url} refused: ${e.message.slice(0, 120)}`);
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ok) {
      throw new Error(
        `Funder ${fromKeypair.publicKey.toBase58()} needs ~${sol(needed + buffer).toFixed(2)} SOL but has ${sol(bal).toFixed(2)}, ` +
        `and all devnet faucets are rate-limited (Helius: 1 SOL/day, public api: per-IP daily). ` +
        `Top up the funder first, then re-run. Options:\n` +
        `  1) solana airdrop 2 ${fromKeypair.publicKey.toBase58()} --url devnet\n` +
        `  2) Use a browser faucet for devnet (e.g. https://faucet.quicknode.com/solana/devnet — free faucet).\n` +
        `  3) Set SOLANA_SMOKE_FUNDER_KEYPAIR to the base64 of any devnet wallet with >= ${sol(needed + buffer).toFixed(2)} SOL.`
      );
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return connection.getBalance(fromKeypair.publicKey);
}
async function signAndSend(tx, keypair) {
  tx.partialSign(keypair);
  return sendAndConfirm(tx);
}
async function signAndSendIx(ixs, feePayer, keypair) {
  const tx = new Transaction().add(...ixs);
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = feePayer;
  return signAndSend(tx, keypair);
}
async function fund(fromKeypair, toPubkey, lamports, label) {
  console.log(`  funding ${label} with ${sol(lamports).toFixed(3)} SOL`);
  await signAndSendIx(
    [SystemProgram.transfer({ fromPubkey: fromKeypair.publicKey, toPubkey, lamports })],
    fromKeypair.publicKey,
    fromKeypair
  );
  for (let i = 0; i < 30; i++) {
    const bal = await connection.getBalance(toPubkey);
    if (bal >= lamports) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`funding ${label} did not arrive`);
}
async function ensureAta(ownerKeypair, mint) {
  const ata = getAssociatedTokenAddressSync(mint, ownerKeypair.publicKey, false, TOKEN_2022_PROGRAM_ID);
  if (!(await connection.getAccountInfo(ata))) {
    await signAndSendIx(
      [createAssociatedTokenAccountIdempotentInstruction(
        ownerKeypair.publicKey, ata, ownerKeypair.publicKey, mint, TOKEN_2022_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
      )],
      ownerKeypair.publicKey,
      ownerKeypair
    );
  }
  return ata;
}
async function createToken2022Mint(creator, decimals) {
  const mintKp = Keypair.generate();
  const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: creator.publicKey,
      newAccountPubkey: mintKp.publicKey,
      lamports: mintRent,
      space: MINT_SIZE,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMintInstruction(mintKp.publicKey, decimals, creator.publicKey, null, TOKEN_2022_PROGRAM_ID),
  );
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  tx.recentBlockhash = blockhash;
  tx.feePayer = creator.publicKey;
  tx.partialSign(creator, mintKp);
  await sendAndConfirm(tx);
  return mintKp.publicKey;
}
async function mintTokens(mint, mintAuthority, destination, amount) {
  return signAndSendIx(
    [createMintToInstruction(mint, destination, mintAuthority.publicKey, amount, [], TOKEN_2022_PROGRAM_ID)],
    mintAuthority.publicKey,
    mintAuthority
  );
}
async function tokenBalance(ata) {
  const r = await connection.getTokenAccountBalance(ata);
  return r.value; // { uiAmount, amount }
}
async function txFromBase64(b64) {
  return Transaction.from(Uint8Array.from(Buffer.from(b64, 'base64')));
}
async function apiAction(payerKeypair, body) {
  const res = await fetch(`${WORKER_BASE}/api/liquidity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.transaction) {
    throw new Error(`API ${body.action} failed: ${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  }
  return { txSignature: await signAndSend(await txFromBase64(data.transaction), payerKeypair), ...data };
}
async function apiPositions(body) {
  const res = await fetch(`${WORKER_BASE}/api/liquidity/positions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  check(`record ${body.action} position (D1)`, res.ok && data.status === 'recorded', JSON.stringify(data));
}

// ---------- main ----------
async function main() {
  console.log(`\nMemeMint smoke test  mode=${MODE}${QUICK ? ' (quick: init+buy only)' : ''}  network=${NETWORK}`);
  console.log(`  RPC ${RPC_URL}`);

  const funder = loadFunder();
  console.log(`  funder      ${funder.publicKey.toBase58()}`);
  const funderBal = await connection.getBalance(funder.publicKey);
  check('funder has devnet SOL', funderBal > 1 * LAMPORTS_PER_SOL, `balance=${sol(funderBal)}`);

  const FUNDING_CREATOR = 1.4; // init 1.0 (MIN_SOL_DEPOSIT) + platform fee 0.1 + rent/fees
  const FUNDING_TRADER = 0.6;  // buys 0.35 + add 0.1 + fees
  await ensureFunderBalance(funder, (FUNDING_CREATOR + FUNDING_TRADER) * LAMPORTS_PER_SOL);

  const creator = Keypair.generate();
  const trader = Keypair.generate();
  console.log(`  creator     ${creator.publicKey.toBase58()}`);
  console.log(`  trader      ${trader.publicKey.toBase58()}`);

  await fund(funder, creator.publicKey, FUNDING_CREATOR * LAMPORTS_PER_SOL, 'creator');
  await fund(funder, trader.publicKey, FUNDING_TRADER * LAMPORTS_PER_SOL, 'trader');

  // Create Token-2022 mint + balances
  console.log('\n[1] create Token-2022 mint + balances');
  const mint = await createToken2022Mint(creator, 9);
  console.log(`  mint        ${mint.toBase58()}`);
  const creatorAta = await ensureAta(creator, mint);
  await mintTokens(mint, creator, creatorAta, 5_000_000_000);
  check('creator token balance 5e9', (await tokenBalance(creatorAta)).uiAmount === 5,
    JSON.stringify(await tokenBalance(creatorAta)));

  const traderAta = await ensureAta(trader, mint);
  await mintTokens(mint, creator, traderAta, 1_000_000_000);

  const INITIAL_SOL = 1.0; // = MIN_SOL_DEPOSIT (program enforces >= 1 SOL)
  const INITIAL_TOKENS = 1_000_000_000;
  const SOL_TARGET = 0.5;

  // Initialize
  console.log('\n[2] initialize curve');
  let poolId = null;
  if (MODE === 'api') {
    const res = await apiAction(creator, {
      action: 'initialize', wallet: creator.publicKey.toBase58(), mint_address: mint.toBase58(),
      initial_sol: INITIAL_SOL, initial_tokens: INITIAL_TOKENS, fee_basis_points: 100,
      sol_target: SOL_TARGET, network: NETWORK,
    });
    poolId = res.pool_id || null;
    check('initialize via API returns pool_id', !!poolId, JSON.stringify(res));
    check('initialize tx confirmed', !!res.txSignature);
  } else {
    const { transaction } = await buildInitializeCurveTx(
      connection, creator.publicKey.toBase58(), mint.toBase58(), INITIAL_SOL, INITIAL_TOKENS, 100, SOL_TARGET
    );
    await signAndSend(transaction, creator);
  }
  let curve = await getBondingCurveState(connection, mint.toBase58());
  check('curve initialized (Active)', curve && curve.status === 0, curve ? `status=${curve.status}` : 'not found');
  check('curve reserves ~ initial SOL', curve.solReserves >= INITIAL_SOL * LAMPORTS_PER_SOL * 0.99,
    `solReserves=${sol(curve.solReserves)}`);
  check('curve token reserves ~ initial tokens', curve.tokenReserves >= INITIAL_TOKENS * 0.99,
    `tokenReserves=${curve.tokenReserves}`);

  // Quick mode stops here
  if (QUICK) return;

  // Buy to surpass target
  console.log('\n[3] buy tokens (0.1 + 0.25 SOL) to surpass 0.5 SOL target');
  if (MODE === 'api') {
    let r = await apiAction(trader, {
      action: 'buy', wallet: trader.publicKey.toBase58(), mint_address: mint.toBase58(),
      sol_amount: 0.1, min_tokens_out: 0, network: NETWORK,
    });
    await apiPositions({ wallet: trader.publicKey.toBase58(), pool_id: poolId, action: 'buy', sol_amount: 0.1, tx_signature: r.txSignature });
    r = await apiAction(trader, {
      action: 'buy', wallet: trader.publicKey.toBase58(), mint_address: mint.toBase58(),
      sol_amount: 0.25, min_tokens_out: 0, network: NETWORK,
    });
    await apiPositions({ wallet: trader.publicKey.toBase58(), pool_id: poolId, action: 'buy', sol_amount: 0.25, tx_signature: r.txSignature });
  } else {
    for (const amt of [0.1, 0.25]) {
      const { transaction } = await buildBuyTokensTx(
        connection, trader.publicKey.toBase58(), mint.toBase58(), amt, 0
      );
      await signAndSend(transaction, trader);
    }
  }
  curve = await getBondingCurveState(connection, mint.toBase58());
  const traderTokBal = await tokenBalance(traderAta);
  console.log(`  trader balance now ${traderTokBal.uiAmount} tokens, swaps=${curve.totalSwaps}`);
  check('trader received tokens', Number(traderTokBal.amount) > 0, `amount=${traderTokBal.amount}`);
  check('curve surpassed SOL target (>= 2 SOL)', curve.solReserves >= SOL_TARGET * LAMPORTS_PER_SOL,
    `solReserves=${sol(curve.solReserves)}`);
  check('curve token reserves dropped', curve.tokenReserves < INITIAL_TOKENS, `tokenReserves=${curve.tokenReserves}`);

  console.log('\n[4] trader sell (exercise sell builder + D1 record)');
  const tokBalBeforeSell = (await tokenBalance(traderAta)).amount;
  const solBeforeSell = await connection.getBalance(trader.publicKey);
  const SELL_AMOUNT = 10_000_000;
  if (MODE === 'api') {
    await apiAction(trader, {
      action: 'sell', wallet: trader.publicKey.toBase58(), mint_address: mint.toBase58(),
      token_amount: SELL_AMOUNT, min_sol_out: 0, network: NETWORK,
    });
    await apiPositions({ wallet: trader.publicKey.toBase58(), pool_id: poolId, action: 'sell', token_amount: SELL_AMOUNT });
  } else {
    const { transaction } = await buildSellTokensTx(
      connection, trader.publicKey.toBase58(), mint.toBase58(), SELL_AMOUNT, 0
    );
    await signAndSend(transaction, trader);
  }
  const tokBalAfterSell = (await tokenBalance(traderAta)).amount;
  const solAfterSell = await connection.getBalance(trader.publicKey);
  check('trader tokens decreased after sell', Number(tokBalAfterSell) < Number(tokBalBeforeSell));
  check('trader received SOL from sell', solAfterSell > solBeforeSell + 500,
    `delta=${sol(solAfterSell - solBeforeSell)}`);

  console.log('\n[5] trader add_liquidity (proves LP relaxed beyond creator)');
  const solBeforeAdd = await connection.getBalance(trader.publicKey);
  let posBefore = await getUserPosition(connection, curve.curveAddress, trader.publicKey.toBase58());
  const lpBeforeAdd = posBefore ? posBefore.lpTokens : 0;
  if (MODE === 'api') {
    await apiAction(trader, {
      action: 'add_liquidity', wallet: trader.publicKey.toBase58(), mint_address: mint.toBase58(),
      sol_amount: 0.1, token_amount: 300_000_000, network: NETWORK,
    });
    await apiPositions({ wallet: trader.publicKey.toBase58(), pool_id: poolId, action: 'add_liquidity', sol_amount: 0.1, token_amount: 300_000_000 });
  } else {
    const { transaction } = await buildAddLiquidityTx(
      connection, trader.publicKey.toBase58(), mint.toBase58(), 0.1, 300_000_000
    );
    await signAndSend(transaction, trader);
  }
  curve = await getBondingCurveState(connection, mint.toBase58());
  posBefore = await getUserPosition(connection, curve.curveAddress, trader.publicKey.toBase58());
  check('curve LP supply increased', curve.totalLpSupply > lpBeforeAdd && curve.totalLpSupply > 0,
    `totalLpSupply=${curve.totalLpSupply}`);
  check('trader position created with LP>0', posBefore && posBefore.lpTokens > 0,
    posBefore ? `lp=${posBefore.lpTokens}` : 'no position');
  check('trader SOL decreased (deposit)', solBeforeAdd > (await connection.getBalance(trader.publicKey)));
  const totalLpAfterAdd = curve.totalLpSupply;

  console.log('\n[6] trader remove_liquidity (50% of LP)');
  const solBeforeRemove = await connection.getBalance(trader.publicKey);
  const lpToRemove = Math.floor(posBefore.lpTokens / 2);
  if (MODE === 'api') {
    await apiAction(trader, {
      action: 'remove_liquidity', wallet: trader.publicKey.toBase58(), mint_address: mint.toBase58(),
      lp_tokens: lpToRemove, network: NETWORK,
    });
  } else {
    const { transaction } = await buildRemoveLiquidityTx(
      connection, trader.publicKey.toBase58(), mint.toBase58(), lpToRemove
    );
    await signAndSend(transaction, trader);
  }
  curve = await getBondingCurveState(connection, mint.toBase58());
  const posAfter = await getUserPosition(connection, curve.curveAddress, trader.publicKey.toBase58());
  check('trader LP reduced', posAfter && posAfter.lpTokens < posBefore.lpTokens,
    posAfter ? `lp=${posAfter.lpTokens}` : 'position gone?');
  check('trader received SOL back', (await connection.getBalance(trader.publicKey)) > solBeforeRemove + 100_000);
  check('curve totals reduced after remove', curve.totalLpSupply < totalLpAfterAdd,
    `totalLpSupply=${curve.totalLpSupply} (was ${totalLpAfterAdd})`);

  console.log('\n[7] creator migrate_to_dex (graduation payout)');
  const solBeforeMigrate = await connection.getBalance(creator.publicKey);
  const tokenBalBeforeMigrate = (await tokenBalance(creatorAta)).uiAmount;
  if (MODE === 'api') {
    const r = await apiAction(creator, {
      action: 'migrate', wallet: creator.publicKey.toBase58(), mint_address: mint.toBase58(), network: NETWORK,
    });
    await apiPositions({ wallet: creator.publicKey.toBase58(), pool_id: poolId, action: 'migrate', tx_signature: r.txSignature });
  } else {
    const { transaction } = await buildMigrateToDexTx(
      connection, creator.publicKey.toBase58(), mint.toBase58()
    );
    await signAndSend(transaction, creator);
  }
  curve = await getBondingCurveState(connection, mint.toBase58());
  check('curve status Migrated (3)', curve.status === 3, `status=${curve.status}`);
  check('curve reserves zeroed', curve.solReserves === 0 && curve.tokenReserves === 0,
    `sol=${curve.solReserves} tok=${curve.tokenReserves}`);
  check('curve LP supply burned', curve.totalLpSupply === 0, `totalLpSupply=${curve.totalLpSupply}`);
  const solAfterMigrate = await connection.getBalance(creator.publicKey);
  const tokenBalAfterMigrate = (await tokenBalance(creatorAta)).uiAmount;
  check('creator received SOL payout', solAfterMigrate > solBeforeMigrate + 0.3 * LAMPORTS_PER_SOL,
    `delta=${sol(solAfterMigrate - solBeforeMigrate)}`);
  check('creator received token payout', tokenBalAfterMigrate > tokenBalBeforeMigrate);

  console.log('\n[8] creator close_curve (allow Migrated status)');
  if (MODE === 'api') {
    await apiAction(creator, {
      action: 'close', wallet: creator.publicKey.toBase58(), mint_address: mint.toBase58(), network: NETWORK,
    });
  } else {
    const { transaction } = await buildCloseCurveTx(connection, creator.publicKey.toBase58(), mint.toBase58());
    await signAndSend(transaction, creator);
  }
  curve = await getBondingCurveState(connection, mint.toBase58());
  check('curve status Closed (2)', curve.status === 2, `status=${curve.status}`);

  console.log('\n[9] worker API assertions');
  if (MODE === 'api') {
    const poolsRes = await fetch(`${WORKER_BASE}/api/liquidity?action=pools&network=${NETWORK}`);
    const pools = await poolsRes.json();
    const inList = (pools.pools || []).find(
      (p) => p.pool_address === mint.toBase58() || p.curve_address === curve.curveAddress
    );
    check('pool listed in GET action=pools', !!inList, JSON.stringify(pools).slice(0, 200));

    const statusRes = await fetch(
      `${WORKER_BASE}/api/liquidity?action=status&mint_address=${mint.toBase58()}&network=${NETWORK}`
    );
    const status = await statusRes.json();
    console.log(`  GET status -> ${JSON.stringify(status).slice(0, 220)}`);
    check('GET action=status returns summary', !!status.curveAddress, JSON.stringify(status).slice(0, 200));

    const posRes = await fetch(
      `${WORKER_BASE}/api/liquidity/positions?wallet=${trader.publicKey.toBase58()}&network=${NETWORK}`
    );
    const pos = await posRes.json();
    check('trader D1 positions include add_liquidity',
      (pos.positions || []).some((p) => p.action === 'add_liquidity'));
  }

  console.log(`\nRESULT: ${failed === 0 ? 'PASSED' : 'FAILED'} (${passed} passed, ${failed} failed)`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nSMOKE TEST ERROR:', err.message);
  console.error(err);
  process.exit(1);
});
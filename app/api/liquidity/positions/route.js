import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { getCurvePda } from '@/app/lib/constants';

function getConnection(network = 'devnet') {
  const url = network === 'mainnet'
    ? process.env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
    : process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;
  if (!url) throw new Error(`No RPC URL for network: ${network}`);
  return new Connection(url, 'confirmed');
}

/**
 * GET /api/liquidity/positions
 * Query params: wallet, curve_address, mint_address, network
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');
    const db = process.env.DB;

    if (!wallet) {
      return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
    }

    // Get all positions from D1
    if (db) {
      const result = await db.prepare(
        `SELECT up.*, lp.pool_address, lp.curve_address, lp.creator_wallet, lp.status as pool_status
         FROM user_liquidity_positions up
         JOIN liquidity_pools lp ON up.pool_id = lp.id
         WHERE up.user_wallet = ?
         ORDER BY up.created_at DESC`
      ).bind(wallet).all();

      return NextResponse.json({ positions: result.results || [] });
    }

    return NextResponse.json({ positions: [] });
  } catch (error) {
    console.error('Positions GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/liquidity/positions
 * Body: { wallet, pool_id, action, sol_amount, token_amount, tx_signature, lp_tokens }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { wallet, pool_id, action, sol_amount, token_amount, tx_signature, lp_tokens } = body;
    const db = process.env.DB;

    if (!wallet || !pool_id || !action) {
      return NextResponse.json({ error: 'wallet, pool_id, and action are required' }, { status: 400 });
    }

    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    // Insert position record
    await db.prepare(
      `INSERT INTO user_liquidity_positions (id, user_wallet, pool_id, sol_deposited, tokens_deposited, lp_tokens, action, tx_signature)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      wallet,
      pool_id,
      sol_amount || 0,
      token_amount || 0,
      lp_tokens || 0,
      action,
      tx_signature || null
    ).run();

    // Update pool totals based on action
    if (action === 'initialize') {
      await db.prepare(
        `UPDATE liquidity_pools SET
          sol_accumulated = sol_accumulated + ?,
          token_reserves = token_reserves + ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).bind(sol_amount || 0, token_amount || 0, pool_id).run();
    } else if (action === 'migrate') {
      await db.prepare(
        `UPDATE liquidity_pools SET
          is_migrated = 1,
          amm = 'meteora',
          lp_burned = 1,
          status = 'migrated',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).bind(pool_id).run();
    } else if (action === 'buy' || action === 'sell') {
      await db.prepare(
        `UPDATE liquidity_pools SET
          total_swaps = total_swaps + 1,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).bind(pool_id).run();
    }

    // Log activity
    await db.prepare(
      `INSERT INTO liquidity_activity_log (id, user_wallet, pool_id, action, sol_amount, token_amount, tx_signature)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      wallet,
      pool_id,
      action,
      sol_amount || null,
      token_amount || null,
      tx_signature || null
    ).run();

    return NextResponse.json({ status: 'recorded', action });
  } catch (error) {
    console.error('Positions POST error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

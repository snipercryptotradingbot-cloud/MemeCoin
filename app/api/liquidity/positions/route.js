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
    const network = searchParams.get('network');
    const db = process.env.DB;

    if (!wallet) {
      return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
    }

    // Get all positions from D1
    if (db) {
      let sql = `SELECT up.*, lp.pool_address, lp.curve_address, lp.creator_wallet, lp.status as pool_status, lp.network, lp.token_id as mint_address
         FROM user_liquidity_positions up
         JOIN liquidity_pools lp ON up.pool_id = lp.id
         WHERE up.user_wallet = ?`;
      const params = [wallet];

      if (network) {
        sql += ` AND lp.network = ?`;
        params.push(network);
      }

      sql += ` ORDER BY up.created_at DESC`;

      const result = await db.prepare(sql).bind(...params).all();

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
 * Body: { wallet, pool_id, action, sol_amount, token_amount, tx_signature, lp_tokens, network }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { wallet, pool_id, action, sol_amount, token_amount, tx_signature, lp_tokens, network } = body;
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
          network = COALESCE(?, network),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).bind(sol_amount || 0, token_amount || 0, network || null, pool_id).run();
    } else if (action === 'migrate') {
      await db.prepare(
        `UPDATE liquidity_pools SET
          is_migrated = 1,
          amm = COALESCE(?, amm),
          pool_address = COALESCE(?, pool_address),
          transaction_signature = COALESCE(?, transaction_signature),
          status = 'migrated',
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      ).bind(body.amm || 'meteora', body.pool_address || null, tx_signature || null, pool_id).run();
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

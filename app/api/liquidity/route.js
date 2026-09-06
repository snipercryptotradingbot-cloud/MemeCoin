import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  buildInitializeCurveTx,
  buildBuyTokensTx,
  buildSellTokensTx,
  buildAddLiquidityTx,
  buildRemoveLiquidityTx,
  buildPauseCurveTx,
  buildCloseCurveTx,
  buildMigrateToDexTx,
} from '@/app/lib/bondingCurve';
import { getBondingCurveState, getPoolSummary } from '@/app/lib/poolState';
import { TREASURY_WALLET } from '@/app/lib/constants';

function getConnection(network = 'devnet') {
  const url = network === 'mainnet'
    ? process.env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
    : process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;
  if (!url) throw new Error(`No RPC URL for network: ${network}`);
  return new Connection(url, 'confirmed');
}

/**
 * GET /api/liquidity
 * Query params: action=status|pools, token_id, mint_address, page, limit
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'status';
    const db = process.env.DB;

    if (action === 'status') {
      const mintAddress = searchParams.get('mint_address');
      if (!mintAddress) {
        return NextResponse.json({ error: 'mint_address is required' }, { status: 400 });
      }

      const network = searchParams.get('network') || 'devnet';
      const connection = getConnection(network);

      const curveState = await getBondingCurveState(connection, mintAddress);
      if (!curveState) {
        return NextResponse.json({ error: 'Bonding curve not found' }, { status: 404 });
      }

      // Get DB metadata if available
      let dbPool = null;
      if (db) {
        const result = await db.prepare(
          "SELECT * FROM liquidity_pools WHERE curve_address = ? OR pool_address = ?"
        ).bind(curveState.curveAddress, mintAddress).first();
        dbPool = result;
      }

      const summary = await getPoolSummary(connection, mintAddress, dbPool);
      return NextResponse.json(summary);
    }

    if (action === 'pools') {
      if (!db) {
        return NextResponse.json({ pools: [], total: 0 });
      }

      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const result = await db.prepare(
        "SELECT * FROM liquidity_pools WHERE status != 'closed' ORDER BY created_at DESC LIMIT ? OFFSET ?"
      ).bind(limit, offset).all();

      const countResult = await db.prepare(
        "SELECT COUNT(*) as total FROM liquidity_pools WHERE status != 'closed'"
      ).first();

      return NextResponse.json({
        pools: result.results || [],
        total: countResult?.total || 0,
        page,
        limit,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Liquidity GET error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/liquidity
 * Body: { action, wallet, mint_address, ...params }
 *
 * Actions:
 *   initialize - Build initialize_curve transaction
 *   buy - Build buy_tokens transaction
 *   sell - Build sell_tokens transaction
 *   add_liquidity - Build add_liquidity transaction
 *   remove_liquidity - Build remove_liquidity transaction
 *   pause - Build pause_curve transaction
 *   close - Build close_curve transaction
 *   confirm - Record confirmed transaction to D1
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action, wallet, mint_address, network = 'devnet' } = body;
    const db = process.env.DB;

    if (!action) {
      return NextResponse.json({ error: 'action is required' }, { status: 400 });
    }

    // Confirm action - record tx to D1 after on-chain confirmation
    if (action === 'confirm') {
      const { tx_signature, pool_id, pool_data } = body;
      if (!tx_signature || !pool_id) {
        return NextResponse.json({ error: 'tx_signature and pool_id are required' }, { status: 400 });
      }

      if (db) {
        // Update pool record
        if (pool_data) {
          await db.prepare(
            `UPDATE liquidity_pools SET
              sol_accumulated = COALESCE(?, sol_accumulated),
              token_reserves = COALESCE(?, token_reserves),
              total_swaps = COALESCE(?, total_swaps),
              transaction_signature = COALESCE(?, transaction_signature),
              updated_at = CURRENT_TIMESTAMP
            WHERE id = ?`
          ).bind(
            pool_data.sol_reserves || null,
            pool_data.token_reserves || null,
            pool_data.total_swaps || null,
            tx_signature,
            pool_id
          ).run();
        }

        // Log activity
        await db.prepare(
          "INSERT INTO liquidity_activity_log (id, user_wallet, pool_id, action, sol_amount, token_amount, tx_signature) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(
          crypto.randomUUID(),
          wallet || '',
          pool_id,
          body.activity_action || 'confirm',
          body.sol_amount || null,
          body.token_amount || null,
          tx_signature
        ).run();
      }

      return NextResponse.json({ status: 'confirmed', tx_signature });
    }

    // All other actions require wallet and mint
    if (!wallet || !mint_address) {
      return NextResponse.json({ error: 'wallet and mint_address are required' }, { status: 400 });
    }

    const connection = getConnection(network);
    let result;

    switch (action) {
      case 'initialize': {
        const { initial_sol, initial_tokens, fee_basis_points, sol_target } = body;
        if (!initial_sol || !initial_tokens) {
          return NextResponse.json({ error: 'initial_sol and initial_tokens are required' }, { status: 400 });
        }

        result = await buildInitializeCurveTx(
          connection,
          wallet,
          mint_address,
          parseFloat(initial_sol),
          parseInt(initial_tokens),
          fee_basis_points || 100,
          parseFloat(sol_target || '85')
        );

        // Create pool record in D1
        if (db) {
          const poolId = crypto.randomUUID();
          await db.prepare(
            `INSERT INTO liquidity_pools (id, token_id, pool_address, curve_address, sol_accumulated, token_reserves, fee_tier, creator_wallet, status, sol_target)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`
          ).bind(
            poolId,
            body.token_id || '',
            mint_address,
            result.curvePda,
            parseFloat(initial_sol),
            parseInt(initial_tokens),
            ((fee_basis_points || 100) / 100).toFixed(1) + '%',
            wallet,
            parseFloat(sol_target || '85')
          ).run();

          // Log position
          await db.prepare(
            "INSERT INTO user_liquidity_positions (id, user_wallet, pool_id, sol_deposited, tokens_deposited, action) VALUES (?, ?, ?, ?, ?, 'initialize')"
          ).bind(
            crypto.randomUUID(),
            wallet,
            poolId,
            parseFloat(initial_sol),
            parseInt(initial_tokens)
          ).run();

          result.poolId = poolId;
        }
        break;
      }

      case 'buy': {
        const { sol_amount, min_tokens_out } = body;
        if (!sol_amount) {
          return NextResponse.json({ error: 'sol_amount is required' }, { status: 400 });
        }

        result = await buildBuyTokensTx(
          connection,
          wallet,
          mint_address,
          parseFloat(sol_amount),
          parseInt(min_tokens_out || '0')
        );
        break;
      }

      case 'sell': {
        const { token_amount, min_sol_out } = body;
        if (!token_amount) {
          return NextResponse.json({ error: 'token_amount is required' }, { status: 400 });
        }

        result = await buildSellTokensTx(
          connection,
          wallet,
          mint_address,
          parseInt(token_amount),
          parseFloat(min_sol_out || '0')
        );
        break;
      }

      case 'add_liquidity': {
        const { sol_amount, token_amount } = body;
        if (!sol_amount && !token_amount) {
          return NextResponse.json({ error: 'sol_amount or token_amount required' }, { status: 400 });
        }

        result = await buildAddLiquidityTx(
          connection,
          wallet,
          mint_address,
          parseFloat(sol_amount || '0'),
          parseInt(token_amount || '0')
        );
        break;
      }

      case 'remove_liquidity': {
        const { lp_tokens } = body;
        if (!lp_tokens) {
          return NextResponse.json({ error: 'lp_tokens is required' }, { status: 400 });
        }

        result = await buildRemoveLiquidityTx(
          connection,
          wallet,
          mint_address,
          parseInt(lp_tokens)
        );
        break;
      }

      case 'pause': {
        result = await buildPauseCurveTx(connection, wallet, mint_address);
        break;
      }

      case 'close': {
        result = await buildCloseCurveTx(connection, wallet, mint_address);
        break;
      }

      case 'migrate': {
        result = await buildMigrateToDexTx(connection, wallet, mint_address);
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    // Serialize transaction for client
    const serializedTx = result.transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return NextResponse.json({
      status: 'success',
      action,
      transaction: serializedTx.toString('base64'),
      curve_address: result.curvePda,
      pool_id: result.poolId || null,
    });
  } catch (error) {
    console.error('Liquidity POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

function parseAuth(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

async function getDb() {
  const { env } = await getCloudflareContext({ async: true });
  return env.DB;
}

export async function GET(request) {
  const token = parseAuth(request);
  if (!token || token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const [users, tokens, recentLogs] = await Promise.all([
      db.prepare('SELECT id, wallet_address, role, created_at FROM users ORDER BY created_at DESC LIMIT 20').all(),
      db.prepare('SELECT id, mint_address, name, symbol, creator_id, created_at FROM tokens ORDER BY created_at DESC LIMIT 20').all(),
      db.prepare('SELECT id, admin_id, action, target, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 20').all(),
    ]);

    return NextResponse.json({ users: users.results, tokens: tokens.results, logs: recentLogs.results });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  const token = parseAuth(request);
  if (!token || token !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, target, metadata, admin_id } = body;

    if (!action || !target) {
      return NextResponse.json({ error: 'action and target are required' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const id = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO admin_audit_logs (id, admin_id, action, target, metadata) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      admin_id || 'admin',
      action,
      target,
      metadata ? JSON.stringify(metadata) : null
    ).run();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

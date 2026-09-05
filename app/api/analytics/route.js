import { NextResponse } from 'next/server';

async function getDb() {
  const db = process.env.DB;
  if (!db) throw new Error('Database not configured');
  return db;
}

export async function GET(request) {
  try {
    const db = await getDb();
    const url = new URL(request.url);
    const tokenId = url.searchParams.get('token_id');

    let query = `
      SELECT 
        event_type,
        COUNT(*) as count,
        MIN(created_at) as first_seen,
        MAX(created_at) as last_seen
      FROM analytics_events
    `;
    const params = [];

    if (tokenId) {
      query += ' WHERE token_id = ?';
      params.push(tokenId);
    }

    query += ' GROUP BY event_type ORDER BY count DESC';

    const { results } = await db.prepare(query).bind(...params).all();

    const totals = await db.prepare(`
      SELECT 
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_events
      FROM analytics_events ${tokenId ? 'WHERE token_id = ?' : ''}
    `).bind(...(tokenId ? [tokenId] : [])).all();

    return NextResponse.json({ 
      success: true, 
      summary: totals.results?.[0] || { active_users: 0, total_events: 0 },
      data: results 
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { event_type, token_id, user_id, metadata } = body;

    if (!event_type) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 });
    }

    const db = await getDb();
    const id = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO analytics_events (id, event_type, token_id, user_id, metadata) VALUES (?, ?, ?, ?, ?)'
    ).bind(
      id,
      event_type,
      token_id || null,
      user_id || null,
      metadata ? JSON.stringify(metadata) : null
    ).run();

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

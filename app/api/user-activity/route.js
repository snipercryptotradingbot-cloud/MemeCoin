import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { user_id, action, target, metadata, session_id } = body;

    if (!user_id || !action) {
      return NextResponse.json({ error: 'user_id and action are required' }, { status: 400 });
    }

    const db = process.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ip = request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const id = crypto.randomUUID();
    await db.prepare(
      'INSERT INTO user_activities (id, user_id, action, target, metadata, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      user_id,
      action,
      target || null,
      metadata ? JSON.stringify(metadata) : null,
      ip,
      userAgent
    ).run();

    return new Response(JSON.stringify({ success: true, id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('User activity API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const action = url.searchParams.get('action');

    const db = process.env.DB;
    if (!db) {
      return new Response(JSON.stringify({ error: 'Database not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let query = 'SELECT * FROM user_activities WHERE 1=1';
    const params = [];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    if (action) {
      query += ' AND action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);

    const { results } = await db.prepare(query).bind(...params).all();

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('User activity API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

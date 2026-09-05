const ONLINE_ROOMS = new Map();
const ACTIVITY_BUFFER = [];
const ANALYTICS_BUFFER = [];

function getRoom(roomId) {
  if (!ONLINE_ROOMS.has(roomId)) {
    ONLINE_ROOMS.set(roomId, { messages: [] });
  }
  return ONLINE_ROOMS.get(roomId);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

function parseAuth(request) {
  const header = request.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/);
  return match ? match[1] : null;
}

async function ensureParents(env, tokenId, userId) {
  if (!tokenId || !env.DB) return;
  try {
    await env.DB.prepare('INSERT OR IGNORE INTO tokens (id, mint_address, name, symbol, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(tokenId, tokenId, 'Token', 'TKN', userId || 'unknown', new Date().toISOString())
      .run();
  } catch {}
  if (!userId || !env.DB) return;
  try {
    await env.DB.prepare('INSERT OR IGNORE INTO users (id, wallet_address, role, created_at) VALUES (?, ?, ?, ?)')
      .bind(userId, userId, 'user', new Date().toISOString())
      .run();
  } catch {}
}

async function chatHandler(request, env) {
  const url = new URL(request.url);
  let roomId = url.pathname.replace('/api/chat', '').replace(/^\//, '') || 'general';
  if (!roomId) roomId = 'general';

  const id = env.CHAT_ROOM.idFromName(roomId);
  const stub = env.CHAT_ROOM.get(id);
  return stub.fetch(request);
}

async function adminHandler(request, env) {
  const token = parseAuth(request);
  if (!token || token !== env.ADMIN_SECRET) return json({ error: 'Unauthorized' }, 401);

  if (request.method === 'GET') {
    const [users, tokens, logs] = await Promise.all([
      env.DB.prepare('SELECT id, wallet_address, role, created_at FROM users ORDER BY created_at DESC LIMIT 20').all(),
      env.DB.prepare('SELECT id, mint_address, name, symbol, creator_id, created_at FROM tokens ORDER BY created_at DESC LIMIT 20').all(),
      env.DB.prepare('SELECT id, admin_id, action, target, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 20').all(),
    ]);
    return json({ users: users.results, tokens: tokens.results, logs: logs.results });
  }

  if (request.method === 'POST') {
    const body = await request.json();
    const { action, target, metadata, admin_id } = body;
    if (!action || !target) return json({ error: 'action and target are required' }, 400);
    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO admin_audit_logs (id, admin_id, action, target, metadata) VALUES (?, ?, ?, ?, ?)'
    ).bind(admin_id || 'admin', action, target, metadata ? JSON.stringify(metadata) : null).run();
    return json({ success: true, id });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

async function analyticsHandler(request, env) {
  if (request.method === 'POST') {
    const body = await request.json();
    const { event_type, token_id, user_id, metadata } = body;
    if (!event_type) return json({ error: 'event_type is required' }, 400);
    const id = crypto.randomUUID();
    await ensureParents(env, token_id, user_id);
    await env.DB.prepare(
      'INSERT INTO analytics_events (id, event_type, token_id, user_id, metadata) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, event_type, token_id || null, user_id || null, metadata ? JSON.stringify(metadata) : null).run();
    return json({ success: true, id });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const tokenId = url.searchParams.get('token_id');
    const { results } = await env.DB.prepare(
      'SELECT event_type, COUNT(*) as count, MIN(created_at) as first_seen, MAX(created_at) as last_seen FROM analytics_events ' +
      (tokenId ? 'WHERE token_id = ? ' : '') +
      'GROUP BY event_type ORDER BY count DESC'
    ).bind(...(tokenId ? [tokenId] : [])).all();

    const totals = await env.DB.prepare(
      'SELECT COUNT(DISTINCT user_id) as active_users, COUNT(*) as total_events FROM analytics_events ' +
      (tokenId ? 'WHERE token_id = ?' : '')
    ).bind(...(tokenId ? [tokenId] : [])).all();

    return json({ success: true, summary: totals.results?.[0] || { active_users: 0, total_events: 0 }, data: results });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

async function activitiesHandler(request, env) {
  if (request.method === 'POST') {
    const body = await request.json();
    const { event_type, token_id, user_id, metadata } = body;
    if (!event_type) return json({ error: 'event_type is required' }, 400);
    const id = crypto.randomUUID();
    await ensureParents(env, token_id, user_id);
    await env.DB.prepare(
      'INSERT INTO user_activities (id, user_id, action, target, metadata, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      user_id || 'anonymous',
      event_type,
      token_id || null,
      metadata ? JSON.stringify(metadata) : null,
      request.headers.get('cf-connecting-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ).run();
    return json({ success: true, id });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    let query = 'SELECT * FROM user_activities WHERE 1=1';
    const params = [];
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json({ success: true, data: results });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

async function userActivityHandler(request, env) {
  if (request.method === 'POST') {
    const body = await request.json();
    const { user_id, action, target, metadata } = body;
    if (!user_id || !action) return json({ error: 'user_id and action are required' }, 400);
    const id = crypto.randomUUID();
    await ensureParents(env, target, user_id);
    await env.DB.prepare(
      'INSERT INTO user_activities (id, user_id, action, target, metadata, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(
      id,
      user_id,
      action,
      target || null,
      metadata ? JSON.stringify(metadata) : null,
      request.headers.get('cf-connecting-ip') || 'unknown',
      request.headers.get('user-agent') || 'unknown'
    ).run();
    return json({ success: true, id });
  }

  if (request.method === 'GET') {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const action = url.searchParams.get('action');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    let query = 'SELECT * FROM user_activities WHERE 1=1';
    const params = [];
    if (userId) { query += ' AND user_id = ?'; params.push(userId); }
    if (action) { query += ' AND action = ?'; params.push(action); }
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(limit);
    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json({ success: true, data: results });
  }

  return json({ error: 'Method Not Allowed' }, 405);
}

async function whaleTrackerHandler(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);
  const address = url.searchParams.get('address');
  const network = url.searchParams.get('network') || 'mainnet';
  if (!address) return json({ error: 'address is required' }, 400);

  const rpcUrl = network === 'mainnet'
    ? env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
    : env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;
  if (!rpcUrl) return json({ error: 'RPC not configured. Set Helius env vars.' }, 500);

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'whale-tracker', method: 'getBalance', params: [address, { commitment: 'confirmed' }] }),
  });
  const data = await response.json();
  if (!response.ok || data.error) return json({ error: data.error?.message || 'Failed to fetch wallet balance' }, 502);
  const lamports = Number(data.result?.value ?? 0);
  const sol = lamports / 1e9;
  return json({ success: true, address, network, lamports, sol, isWhale: sol > 1000, thresholdSol: 1000, lastChecked: new Date().toISOString() });
}

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    let roomId = url.pathname.split('/').pop() || 'general';
    if (roomId === 'chat' || !roomId) roomId = 'general';

    if (roomId === 'rooms') {
      if (request.method === 'GET') {
        try {
          const { results } = await this.env.DB.prepare(
            'SELECT id, room_name as name, created_by as createdBy FROM chat_rooms ORDER BY created_at ASC'
          ).all();
          return json({ success: true, rooms: results || [] });
        } catch (err) {
          console.error('DO D1 rooms select error:', err);
          return json({ success: false, error: err.message }, 500);
        }
      }
      if (request.method === 'POST') {
        try {
          const { id, name, createdBy } = await request.json();
          if (!id || !name) return json({ error: 'id and name are required' }, 400);
          await this.env.DB.prepare(
            'INSERT OR IGNORE INTO chat_rooms (id, room_name, created_by) VALUES (?, ?, ?)'
          ).bind(id, name, createdBy || 'anonymous').run();
          return json({ success: true, room: { id, name, createdBy } });
        } catch (err) {
          console.error('DO D1 rooms insert error:', err);
          return json({ success: false, error: err.message }, 500);
        }
      }
    }

    if (request.method === 'GET') {
      try {
        const { results } = await this.env.DB.prepare(
          'SELECT user_wallet as userWallet, message, message_type as messageType, created_at as createdAt FROM chats WHERE room_id = ? ORDER BY created_at DESC LIMIT 50'
        ).bind(roomId).all();
        
        const dbMessages = (results || []).map(r => ({
          id: r.id || crypto.randomUUID(),
          userWallet: r.userWallet,
          message: r.message,
          messageType: r.messageType || 'text',
          createdAt: r.createdAt
        })).reverse();

        return json({ success: true, roomId, messages: dbMessages });
      } catch (err) {
        const room = getRoom(roomId);
        return json({ success: true, roomId, messages: room.messages });
      }
    }

    if (request.method === 'POST') {
      const body = await request.json();
      const { userWallet, message, messageType = 'text', userId } = body;
      if (!userWallet || !message) return json({ error: 'userWallet and message are required' }, 400);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      try {
        await ensureParents(this.env, roomId, userId || userWallet);
        await this.env.DB.prepare(
          'INSERT INTO chats (id, room_id, user_id, user_wallet, message, message_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, roomId, userId || userWallet, userWallet, message, messageType, now).run();
      } catch (dbErr) {
        console.error('DO DB save error:', dbErr);
      }

      const msgObj = { id, userWallet, message, messageType, createdAt: now };
      const room = getRoom(roomId);
      room.messages.push(msgObj);
      if (room.messages.length > 100) room.messages = room.messages.slice(-100);

      return json({ success: true, message: msgObj });
    }

    return json({ error: 'Method Not Allowed' }, 405);
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path.startsWith('/api/chat')) return chatHandler(request, env);
    if (path.startsWith('/api/admin')) return adminHandler(request, env);
    if (path.startsWith('/api/analytics')) return analyticsHandler(request, env);
    if (path.startsWith('/api/activities')) return activitiesHandler(request, env);
    if (path.startsWith('/api/user-activity')) return userActivityHandler(request, env);
    if (path.startsWith('/api/whale-tracker')) return whaleTrackerHandler(request, env);
    return json({ error: 'Not Found' }, 404);
  },
};

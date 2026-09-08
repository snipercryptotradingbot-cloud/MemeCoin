// ============================================================
// MemeMint — Consolidated Cloudflare Worker
// Serves: API routes + Durable Objects; forwards page requests to the OpenNext render worker (mememint-render)
// ============================================================

// ---------- Shared Utilities ----------

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

function html(body, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
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
    await env.DB.prepare(
      'INSERT OR IGNORE INTO tokens (id, mint_address, name, symbol, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(tokenId, tokenId, 'Token', 'TKN', userId || 'unknown', new Date().toISOString()).run();
  } catch {}
  if (!userId || !env.DB) return;
  try {
    await env.DB.prepare(
      'INSERT OR IGNORE INTO users (id, wallet_address, role, created_at) VALUES (?, ?, ?, ?)'
    ).bind(userId, userId, 'user', new Date().toISOString()).run();
  } catch {}
}

// ---------- Auth Helpers ----------

async function verifyAuth(request, env) {
  const token = parseAuth(request);
  if (!token || !env.JWT_SECRET) return null;
  try {
    const payload = await decodeJWT(token, env.JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

async function createJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + 86400 * 7 };
  const enc = (o) => btoa(JSON.stringify(o)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const h = enc(header);
  const b = enc(body);
  const signature = await crypto.subtle.sign(
    { name: 'HMAC', hash: 'SHA-256' },
    await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
    new TextEncoder().encode(`${h}.${b}`)
  );
  const s = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  return `${h}.${b}.${s}`;
}

async function decodeJWT(token, secret) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid token');
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    { name: 'HMAC', hash: 'SHA-256' },
    key,
    Uint8Array.from(atob(parts[2].replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!valid) throw new Error('Invalid signature');
  const body = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  if (body.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return body;
}

// ---------- Password Hashing (Web Crypto API) ----------

async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: encoder.encode(salt), iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
  return btoa(String.fromCharCode(...new Uint8Array(bits)));
}

function generateSalt() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

// ---------- Username Generation ----------

function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 20) || 'user';
}

async function generateUniqueUsername(env, name, email) {
  const base = slugify(name || email?.split('@')[0] || 'user');
  const suffix = Math.random().toString(36).slice(2, 6);
  const candidates = [
    `${base}_${suffix}`,
    `${base}${Math.floor(Math.random() * 900) + 100}`,
    base,
  ];
  for (const candidate of candidates) {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(candidate).first();
    if (!existing) return candidate;
  }
  return `${base}_${Date.now()}`;
}

// ---------- API Handlers ----------

async function authHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/auth', '');

  // POST /api/auth/register — email + password
  if (request.method === 'POST' && path === '/register') {
    try {
      const { name, email, password } = await request.json();
      if (!email || !password) return json({ error: 'email and password are required' }, 400);
      if (password.length < 8) return json({ error: 'Password must be at least 8 characters' }, 400);

      const normalizedEmail = email.toLowerCase().trim();

      // Check if user already exists
      if (env.DB) {
        const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
        if (existing) return json({ error: 'An account with this email already exists' }, 409);
      }

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const userId = `email_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}_${Date.now()}`;
      const displayName = name || normalizedEmail.split('@')[0];
      const now = new Date().toISOString();

      let username = null;
      if (env.DB) username = await generateUniqueUsername(env, displayName, normalizedEmail);

      if (env.DB) {
        await env.DB.prepare(
          'INSERT INTO users (id, email, name, username, password_hash, provider, role, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, normalizedEmail, displayName, username, `${salt}:${passwordHash}`, 'email', 'user', now, now).run();
      }

      const token = await createJWT(
        { sub: userId, email: normalizedEmail, name: displayName, provider: 'email', role: 'user' },
        env.JWT_SECRET
      );

      return json({
        success: true, token,
        user: { id: userId, email: normalizedEmail, name: displayName, username, provider: 'email', role: 'user' },
      });
    } catch (err) {
      console.error('Register error:', err);
      return json({ error: 'Registration failed' }, 500);
    }
  }

  // POST /api/auth/login — email + password
  if (request.method === 'POST' && path === '/login') {
    try {
      const { email, password } = await request.json();
      if (!email || !password) return json({ error: 'email and password are required' }, 400);

      const normalizedEmail = email.toLowerCase().trim();

      if (!env.DB) return json({ error: 'Auth service not configured' }, 500);

      const user = await env.DB.prepare(
        'SELECT id, email, name, username, password_hash, avatar, provider, role FROM users WHERE email = ?'
      ).bind(normalizedEmail).first();

      if (!user) return json({ error: 'No account found with this email' }, 401);
      if (!user.password_hash) return json({ error: 'This account uses social login. Please sign in with Google or your wallet.' }, 400);

      const [salt, storedHash] = user.password_hash.split(':');
      const computedHash = await hashPassword(password, salt);

      if (computedHash !== storedHash) return json({ error: 'Incorrect password' }, 401);

      const now = new Date().toISOString();
      if (env.DB) {
        await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now, user.id).run();
      }

      const token = await createJWT(
        { sub: user.id, email: user.email, name: user.name, provider: user.provider, role: user.role },
        env.JWT_SECRET
      );

      return json({
        success: true, token,
        user: { id: user.id, email: user.email, name: user.name, username: user.username, avatar: user.avatar, provider: user.provider, role: user.role },
      });
    } catch (err) {
      console.error('Login error:', err);
      return json({ error: 'Login failed' }, 500);
    }
  }

  // POST /api/auth/siws — Sign In With Solana
  if (request.method === 'POST' && path === '/siws') {
    try {
      const { wallet_address, signature, message } = await request.json();
      if (!wallet_address || !signature || !message) {
        return json({ error: 'wallet_address, signature, and message are required' }, 400);
      }

      // Verify the signed message matches the wallet
      const encoder = new TextEncoder();
      const messageBytes = encoder.encode(message);
      const signatureBytes = Uint8Array.from(atob(signature), (c) => c.charCodeAt(0));

      // Import the wallet's public key from base58
      const bs58 = await import('bs58');
      const publicKeyBytes = bs58.default.decode(wallet_address);
      const publicKey = await crypto.subtle.importKey(
        'raw',
        publicKeyBytes,
        { name: 'Ed25519', namedCurve: 'Ed25519' },
        false,
        ['verify']
      );

      const isValid = await crypto.subtle.verify(
        'Ed25519',
        publicKey,
        signatureBytes,
        messageBytes
      );

      if (!isValid) {
        return json({ error: 'Invalid signature' }, 401);
      }

      // Create or update user in D1
      if (env.DB) {
        const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(wallet_address).first();
        const now = new Date().toISOString();
        if (existing) {
          await env.DB.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').bind(now, wallet_address).run();
        } else {
          const username = await generateUniqueUsername(env, wallet_address.slice(0, 8), null);
          await env.DB.prepare(
            'INSERT INTO users (id, wallet_address, username, provider, role, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).bind(wallet_address, wallet_address, username, 'wallet', 'user', now, now).run();
        }
      }

      // Issue JWT
      const jwtPayload = { sub: wallet_address, wallet: wallet_address, role: 'user' };
      const token = await createJWT(jwtPayload, env.JWT_SECRET);

      // Fetch full user from DB
      let user = { id: wallet_address, name: wallet_address.slice(0, 8), provider: 'wallet', role: 'user' };
      if (env.DB) {
        const dbUser = await env.DB.prepare('SELECT id, email, name, username, avatar, bio, wallet_address, connected_wallet, provider, role, credits_balance, preferences, created_at FROM users WHERE id = ?').bind(wallet_address).first();
        if (dbUser) user = dbUser;
      }

      return json({ success: true, token, user });
    } catch (err) {
      console.error('Auth SIWS error:', err);
      return json({ error: 'Authentication failed' }, 500);
    }
  }

  // GET /api/auth/me — verify JWT and return full user info
  if (request.method === 'GET' && path === '/me') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    let user = null;
    if (env.DB) {
      try {
        user = await env.DB.prepare(
          'SELECT id, email, name, username, avatar, bio, wallet_address, connected_wallet, provider, role, credits_balance, preferences, last_login_at, created_at FROM users WHERE id = ?'
        ).bind(payload.sub).first();
      } catch {}
    }

    return json({
      success: true,
      user: user || {
        id: payload.sub, email: payload.email, name: payload.name,
        username: null, avatar: null, bio: '', wallet_address: payload.wallet,
        connected_wallet: null, provider: payload.provider, role: payload.role,
        credits_balance: 0, preferences: '{}', last_login_at: null, created_at: null,
      },
    });
  }

  // POST /api/auth/google — Google OAuth
  if (request.method === 'POST' && path === '/google') {
    const { google_token } = await request.json();
    if (!google_token) return json({ error: 'google_token required' }, 400);

    const googleResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${google_token}`);
    if (!googleResp.ok) return json({ error: 'Invalid Google token' }, 401);

    const googleData = await googleResp.json();
    const email = googleData.email;
    const name = googleData.name || email.split('@')[0];
    const userId = `google_${email}`;
    const now = new Date().toISOString();

    if (env.DB) {
      const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      if (existing) {
        const username = existing.username || await generateUniqueUsername(env, name, email);
        await env.DB.prepare(
          'UPDATE users SET email = ?, name = ?, username = COALESCE(username, ?), last_login_at = ? WHERE id = ?'
        ).bind(email, name, username, now, userId).run();
      } else {
        const username = await generateUniqueUsername(env, name, email);
        await env.DB.prepare(
          'INSERT INTO users (id, email, name, username, provider, role, last_login_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(userId, email, name, username, 'google', email.toLowerCase().includes('admin') ? 'admin' : 'user', now, now).run();
      }
    }

    const token = await createJWT(
      { sub: userId, email, name, provider: 'google', role: email.toLowerCase().includes('admin') ? 'admin' : 'user' },
      env.JWT_SECRET
    );

    return json({ success: true, token, user: { id: userId, email, name, provider: 'google' } });
  }

  // GET /api/auth/nonce — get a nonce for SIWS
  if (request.method === 'GET' && path === '/nonce') {
    const nonce = crypto.randomUUID().slice(0, 16);
    return json({ success: true, nonce });
  }

  return json({ error: 'Not Found' }, 404);
}

async function chatRoomCRUD(request, env) {
  const url = new URL(request.url);

  if (url.pathname === '/api/chat/rooms' || url.pathname === '/api/chat/rooms/') {
    if (request.method === 'GET') {
      try {
        const { results } = await env.DB.prepare(
          'SELECT id, room_name as name, created_by as createdBy, topic, member_count, last_active_at, is_pinned FROM chat_rooms ORDER BY is_pinned DESC, last_active_at DESC'
        ).all();
        return json({ success: true, rooms: results || [] });
      } catch (err) {
        return json({ success: false, error: err.message }, 500);
      }
    }
    if (request.method === 'POST') {
      try {
        const { id, name, topic, createdBy } = await request.json();
        if (!id || !name) return json({ error: 'id and name are required' }, 400);
        await env.DB.prepare(
          'INSERT OR IGNORE INTO chat_rooms (id, room_name, created_by, topic, last_active_at) VALUES (?, ?, ?, ?, ?)'
        ).bind(id, name, createdBy || 'anonymous', topic || '', new Date().toISOString()).run();
        return json({ success: true, room: { id, name, createdBy, topic } });
      } catch (err) {
        return json({ success: false, error: err.message }, 500);
      }
    }
    return json({ error: 'Method Not Allowed' }, 405);
  }

  return null;
}

async function chatHandler(request, env) {
  const crud = await chatRoomCRUD(request, env);
  if (crud) return crud;

  const url = new URL(request.url);
  let roomId = url.pathname.replace('/api/chat', '').replace(/^\//, '') || 'general';
  if (!roomId || roomId === 'chat') roomId = 'general';

  const id = env.ChatRoom ? env.ChatRoom.idFromName(roomId) : null;
  if (!id) return json({ error: 'Chat service not configured' }, 500);
  const stub = env.ChatRoom.get(id);
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
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 'whale-tracker',
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }],
    }),
  });
  const data = await response.json();
  if (!response.ok || data.error) return json({ error: data.error?.message || 'Failed to fetch wallet balance' }, 502);
  const lamports = Number(data.result?.value ?? 0);
  const sol = lamports / 1e9;
  return json({ success: true, address, network, lamports, sol, isWhale: sol > 1000, thresholdSol: 1000, lastChecked: new Date().toISOString() });
}

async function tokenInfoHandler(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);
  const mint = url.searchParams.get('mint');
  const network = url.searchParams.get('network') || 'devnet';

  if (!mint) return json({ error: 'Missing mint address' }, 400);
  if (mint.length < 32 || mint.length > 44) return json({ error: 'Invalid mint address format' }, 400);

  const rpcUrl = network === 'mainnet'
    ? env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
    : env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;
  if (!rpcUrl) return json({ error: 'RPC not configured' }, 500);

  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0', id: 'mememint', method: 'getAsset',
      params: { id: mint },
    }),
  });

  if (!response.ok) return json({ error: 'Failed to fetch token info' }, 502);
  const data = await response.json();

  if (data.error) {
    const accountResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 'mememint', method: 'getAccountInfo',
        params: [mint, { encoding: 'jsonParsed' }],
      }),
    });
    const accountData = await accountResponse.json();
    if (accountData.result?.value) {
      return json({ success: true, token: { mint, raw: accountData.result.value } });
    }
    return json({ error: 'Token not found' }, 404);
  }

  return json({
    success: true,
    token: {
      mint,
      name: data.result?.content?.metadata?.name || 'Unknown',
      symbol: data.result?.content?.metadata?.symbol || 'N/A',
      description: data.result?.content?.metadata?.description || '',
      image: data.result?.content?.links?.image || data.result?.content?.files?.[0]?.uri || '',
      uri: data.result?.content?.json_uri || '',
      supply: data.result?.token_info?.supply || 0,
      decimals: data.result?.token_info?.decimals || 0,
      authorities: data.result?.authorities || [],
    },
  });
}

async function dexScreenerHandler(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);
  const mint = url.searchParams.get('mint');
  if (!mint) return json({ error: 'mint is required' }, 400);

  const dsUrl = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
  const response = await fetch(dsUrl);
  if (!response.ok) return json({ error: 'Failed to fetch from DexScreener' }, 502);
  const data = await response.json();
  return json({ success: true, data });
}

async function heliusRpcHandler(request, env) {
  const url = new URL(request.url);
  const network = url.searchParams.get('network') || 'devnet';
  const rpcUrl = network === 'mainnet'
    ? env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
    : env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;
  if (!rpcUrl) return json({ error: 'RPC not configured' }, 500);

  const body = await request.json();
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return json({ success: true, data: data?.result || data });
}

async function jupiterQuoteHandler(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);
  const inputMint = url.searchParams.get('inputMint');
  const outputMint = url.searchParams.get('outputMint');
  const amount = url.searchParams.get('amount');
  if (!inputMint || !outputMint || !amount) return json({ error: 'inputMint, outputMint, and amount required' }, 400);

  const quoteUrl = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50`;
  const response = await fetch(quoteUrl);
  if (!response.ok) return json({ error: 'Failed to fetch quote' }, 502);
  const data = await response.json();
  return json({ success: true, data });
}

async function uploadImageHandler(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return json({ error: 'No file provided' }, 400);

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return json({ error: 'Invalid file type. Allowed: PNG, JPG, GIF, WEBP' }, 400);
    }
    if (file.size > 5 * 1024 * 1024) {
      return json({ error: 'File too large. Maximum size is 5MB' }, 400);
    }

    const jwt = env.PINATA_JWT;
    if (!jwt) return json({ error: 'IPFS service not configured' }, 500);

    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    pinataFormData.append('pinataMetadata', JSON.stringify({ name: `mememint-token-image-${Date.now()}` }));
    pinataFormData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: { Authorization: `Bearer ${jwt}` },
      body: pinataFormData,
    });

    if (!pinataResponse.ok) return json({ error: 'Failed to upload to IPFS' }, 500);
    const pinataData = await pinataResponse.json();
    const gateway = env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
    const url = `https://${gateway}/ipfs/${pinataData.IpfsHash}`;

    return json({ success: true, ipfsHash: pinataData.IpfsHash, url });
  } catch (error) {
    console.error('Upload image error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

async function uploadMetadataHandler(request, env) {
  if (request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  try {
    const body = await request.json();
    if (!body.name || !body.symbol || !body.image) {
      return json({ error: 'Missing required fields: name, symbol, image' }, 400);
    }

    const jwt = env.PINATA_JWT;
    if (!jwt) return json({ error: 'IPFS service not configured' }, 500);

    const metadata = {
      name: body.name,
      symbol: body.symbol,
      description: body.description || '',
      image: body.image,
      external_url: body.external_url || '',
      attributes: body.attributes || [],
      properties: body.properties || {
        files: [{ uri: body.image, type: 'image/png' }],
        category: 'currency',
      },
    };
    if (body.social_links) metadata.social_links = body.social_links;

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: { name: `mememint-metadata-${body.symbol}-${Date.now()}` },
        pinataOptions: { cidVersion: 1 },
      }),
    });

    if (!pinataResponse.ok) return json({ error: 'Failed to upload metadata to IPFS' }, 500);
    const pinataData = await pinataResponse.json();
    const gateway = env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
    const uri = `https://${gateway}/ipfs/${pinataData.IpfsHash}`;

    return json({ success: true, ipfsHash: pinataData.IpfsHash, uri });
  } catch (error) {
    console.error('Upload metadata error:', error);
    return json({ error: 'Internal server error' }, 500);
  }
}

// ---------- Durable Object: ChatRoom ----------

const MSG_TYPE_TEXT = 'text';
const MSG_TYPE_SYSTEM = 'system';
const MSG_TYPE_JOIN = 'user_joined';
const MSG_TYPE_LEAVE = 'user_left';
const WS_MSG_CHAT = 'chat_message';
const WS_MSG_TYPING = 'typing';
const WS_MSG_JOIN = 'join';
const WS_MSG_LEAVE = 'leave';
const WS_MSG_CONNECTED_USERS = 'connected_users';
const WS_MSG_SYSTEM = 'system';
const TYPING_TIMEOUT_MS = 3000;
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX_MSG = 5;

export class ChatRoom {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sessions = [];
    this.userSessions = new Map();
    this.typingTimers = new Map();
    this.rateLimitWindow = new Map();
    this.roomId = 'general';
  }

  async fetch(request) {
    const url = new URL(request.url);
    this.roomId = url.pathname.replace('/api/chat', '').replace(/^\//, '') || 'general';
    if (!this.roomId || this.roomId === 'chat') this.roomId = 'general';

    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method === 'GET') {
      return this.getMessages(request);
    }

    if (request.method === 'POST') {
      return this.postMessageRest(request);
    }

    return json({ error: 'Method Not Allowed' }, 405);
  }

  handleWebSocket(request) {
    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();

    const userWallet = this.getUserIdFromRequest(request);
    const userId = userWallet;
    const userData = { ws: server, userId, userWallet, joinedAt: Date.now() };

    server.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === WS_MSG_CHAT) {
          this.handleChatMessage(server, userWallet, data);
        } else if (data.type === WS_MSG_TYPING) {
          this.handleTyping(server, userWallet, data);
        } else if (data.type === WS_MSG_JOIN) {
          this.broadcast({
            type: WS_MSG_SYSTEM,
            payload: {
              messageType: MSG_TYPE_JOIN,
              message: `${data.userWallet || 'Someone'} joined`,
              userWallet: data.userWallet || userWallet,
              userId: data.userId || userWallet,
              timestamp: Date.now(),
            },
          });
        } else if (data.type === WS_MSG_LEAVE) {
          this.broadcast({ type: WS_MSG_LEAVE, payload: { userId: data.userId || userWallet } });
        }
      } catch (err) {
        server.send(JSON.stringify({ type: 'error', payload: { message: 'Invalid message format' } }));
      }
    });

    server.addEventListener('close', () => {
      this.sessions = this.sessions.filter(s => s.ws !== server);
      this.broadcast({
        type: WS_MSG_LEAVE,
        payload: {
          userId,
          userWallet,
          connectedUsers: this.getConnectedUsers(),
        },
      });
    });

    this.sessions.push(userData);

    server.send(JSON.stringify({
      type: WS_MSG_SYSTEM,
      payload: {
        roomId: this.roomId,
        message: 'Connected to room',
        connectedUsers: this.getConnectedUsers(),
      },
    }));

    this.broadcast({
      type: WS_MSG_JOIN,
      payload: {
        userId,
        userWallet,
        connectedUsers: this.getConnectedUsers(),
      },
    }, [server]);

    return new Response(null, { status: 101, webSocket: client });
  }

  async handleChatMessage(server, userWallet, data) {
    const wallet = data.userWallet || userWallet || 'Anonymous';
    const message = data.message || '';
    const messageType = data.messageType || MSG_TYPE_TEXT;

    if (!message.trim()) return;

    if (this.isRateLimited(wallet)) {
      server.send(JSON.stringify({ type: 'error', payload: { message: 'Rate limited. Slow down.' } }));
      return;
    }

    this.clearTyping(wallet);

    // Clear typing indicator for this user
    this.clearTyping(userWallet);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const chatMessage = {
      id, userWallet: wallet, message, messageType,
      createdAt: now, timestamp: Date.now(),
      userId: data.userId || wallet,
    };

    if (this.env.DB) {
      try {
        await this.env.DB.prepare(
          'INSERT INTO chats (id, room_id, user_id, user_wallet, message, message_type, created_at) VALUES (?,?,?,?,?,?,?)'
        ).bind(id, this.roomId, data.userId || wallet, wallet, message, messageType, now).run();
        await this.env.DB.prepare(
          'UPDATE chat_rooms SET last_active_at = ? WHERE id = ?'
        ).bind(now, this.roomId).run();
      } catch {}
    }

    this.broadcast({ type: WS_MSG_CHAT, payload: chatMessage });
  }

  handleTyping(server, userWallet, data) {
    const wallet = data.userWallet || userWallet || 'Anonymous';
    const isTyping = data.isTyping === true;

    if (isTyping) {
      this.typingTimers.set(wallet, setTimeout(() => {
        this.clearTyping(wallet);
      }, TYPING_TIMEOUT_MS));
    } else {
      this.clearTyping(wallet);
    }

    this.broadcast({
      type: WS_MSG_TYPING,
      payload: {
        userWallet: wallet,
        isTyping,
        typingUsers: this.getTypingUsers(),
      },
    }, [server]);
  }

  clearTyping(userWallet) {
    const timer = this.typingTimers.get(userWallet);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(userWallet);
    }
  }

  getTypingUsers() {
    const now = Date.now();
    const active = [];
    this.typingTimers.forEach((timer, userWallet) => {
      active.push({ userWallet, startedAt: now - TYPING_TIMEOUT_MS });
    });
    return active;
  }

  getConnectedUsers() {
    const seen = new Map();
    this.sessions.forEach(s => {
      if (s.userWallet) seen.set(s.userWallet, { userWallet: s.userWallet, userId: s.userId });
    });
    return Array.from(seen.values());
  }

  isRateLimited(userKey) {
    const now = Date.now();
    const window = this.rateLimitWindow.get(userKey);
    if (!window) {
      this.rateLimitWindow.set(userKey, { count: 1, start: now });
      return false;
    }
    if (now - window.start > RATE_LIMIT_WINDOW_MS) {
      this.rateLimitWindow.set(userKey, { count: 1, start: now });
      return false;
    }
    window.count++;
    return window.count > RATE_LIMIT_MAX_MSG;
  }

  broadcast(payload, exclude = []) {
    const str = JSON.stringify(payload);
    this.sessions = this.sessions.filter(s => {
      if (exclude.includes(s.ws)) return true;
      try {
        s.ws.send(str);
        return true;
      } catch {
        return false;
      }
    });
  }

  getUserIdFromRequest(request) {
    const url = new URL(request.url);
    return url.searchParams.get('userId') || url.searchParams.get('userWallet') || 'anonymous';
  }

  async getMessages(request) {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const before = url.searchParams.get('before');

    try {
      let query = 'SELECT id, user_wallet as userWallet, message, message_type as messageType, created_at as createdAt FROM chats WHERE room_id = ?';
      const params = [this.roomId];
      if (before) {
        query += ' AND id < ?';
        params.push(before);
      }
      query += ' ORDER BY created_at DESC LIMIT ?';
      params.push(limit);

      const { results } = await this.env.DB.prepare(query).bind(...params).all();
      const messages = (results || []).map(r => ({
        id: r.id,
        userWallet: r.userWallet,
        message: r.message,
        messageType: r.messageType || 'text',
        createdAt: r.createdAt,
      })).reverse();

      return json({ success: true, roomId: this.roomId, messages });
    } catch (err) {
      return json({ success: true, roomId: this.roomId, messages: [] });
    }
  }

  async postMessageRest(request) {
    const body = await request.json();
    const { userWallet, message, messageType = 'text', userId } = body;
    if (!userWallet || !message) return json({ error: 'userWallet and message are required' }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (this.env.DB) {
      try {
        await this.env.DB.prepare(
          'INSERT INTO chats (id, room_id, user_id, user_wallet, message, message_type, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, this.roomId, userId || userWallet, userWallet, message, messageType, now).run();
        await this.env.DB.prepare(
          'UPDATE chat_rooms SET last_active_at = ? WHERE id = ?'
        ).bind(now, this.roomId).run();
      } catch {}
    }

    return json({
      success: true,
      message: { id, userWallet, message, messageType, createdAt: now },
    });
  }
}

// ---------- Profile Handler ----------

async function profileHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // GET /api/profile — full profile
  if (request.method === 'GET' && (path === '/api/profile' || path === '/api/profile/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    let user = null;
    if (env.DB) {
      try {
        user = await env.DB.prepare(
          'SELECT id, email, name, username, avatar, bio, wallet_address, connected_wallet, provider, role, credits_balance, preferences, last_login_at, created_at FROM users WHERE id = ?'
        ).bind(payload.sub).first();
      } catch {}
    }

    if (!user) return json({ error: 'User not found' }, 404);

    let tokenCount = 0;
    let liquidityCount = 0;
    let activityCount = 0;
    if (env.DB) {
      try {
        const tc = await env.DB.prepare('SELECT COUNT(*) as c FROM tokens WHERE creator_id = ?').bind(user.id).first();
        tokenCount = tc?.c || 0;
        const lc = await env.DB.prepare(
          'SELECT COUNT(*) as c FROM liquidity_pools lp JOIN tokens t ON lp.token_id = t.id WHERE t.creator_id = ?'
        ).bind(user.id).first();
        liquidityCount = lc?.c || 0;
        const ac = await env.DB.prepare('SELECT COUNT(*) as c FROM user_activities WHERE user_id = ?').bind(user.id).first();
        activityCount = ac?.c || 0;
      } catch {}
    }

    return json({ success: true, user: { ...user, stats: { tokenCount, liquidityCount, activityCount } } });
  }

  // PATCH /api/profile — update profile
  if (request.method === 'PATCH' && (path === '/api/profile' || path === '/api/profile/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const { name, bio, preferences } = body;
    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (preferences !== undefined) { updates.push('preferences = ?'); params.push(typeof preferences === 'string' ? preferences : JSON.stringify(preferences)); }

    if (updates.length === 0) return json({ error: 'No fields to update' }, 400);

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(payload.sub);

    if (env.DB) {
      await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run();
    }

    const user = await env.DB.prepare(
      'SELECT id, email, name, username, avatar, bio, wallet_address, connected_wallet, provider, role, credits_balance, preferences, last_login_at, created_at FROM users WHERE id = ?'
    ).bind(payload.sub).first();

    return json({ success: true, user });
  }

  // POST /api/profile/change-password
  if (request.method === 'POST' && path === '/api/profile/change-password') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) return json({ error: 'currentPassword and newPassword required' }, 400);
    if (newPassword.length < 8) return json({ error: 'New password must be at least 8 characters' }, 400);

    if (!env.DB) return json({ error: 'Auth service not configured' }, 500);

    const user = await env.DB.prepare('SELECT id, password_hash, provider FROM users WHERE id = ?').bind(payload.sub).first();
    if (!user) return json({ error: 'User not found' }, 404);
    if (user.provider !== 'email') return json({ error: 'Password change is only available for email accounts' }, 400);
    if (!user.password_hash) return json({ error: 'No password set' }, 400);

    const [salt, storedHash] = user.password_hash.split(':');
    const computedHash = await hashPassword(currentPassword, salt);
    if (computedHash !== storedHash) return json({ error: 'Incorrect current password' }, 401);

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(`${newSalt}:${newHash}`, new Date().toISOString(), payload.sub).run();

    return json({ success: true, message: 'Password updated' });
  }

  // POST /api/profile/connect-wallet
  if (request.method === 'POST' && path === '/api/profile/connect-wallet') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const { wallet_address } = await request.json();
    if (!wallet_address) return json({ error: 'wallet_address required' }, 400);

    if (env.DB) {
      await env.DB.prepare('UPDATE users SET connected_wallet = ?, wallet_address = COALESCE(wallet_address, ?), updated_at = ? WHERE id = ?')
        .bind(wallet_address, wallet_address, new Date().toISOString(), payload.sub).run();
    }

    return json({ success: true, connected_wallet: wallet_address });
  }

  return null;
}

// ---------- Follows Handler ----------

async function followsHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/follows — follow a user or token
  if (request.method === 'POST' && (path === '/api/follows' || path === '/api/follows/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const { target_type, target_id, target_name, target_image } = await request.json();
    if (!target_type || !target_id) return json({ error: 'target_type and target_id required' }, 400);
    if (!['user', 'token'].includes(target_type)) return json({ error: 'target_type must be user or token' }, 400);
    if (target_id === payload.sub) return json({ error: 'Cannot follow yourself' }, 400);

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT OR IGNORE INTO follows (id, follower_id, target_type, target_id, target_name, target_image, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, payload.sub, target_type, target_id, target_name || '', target_image || '', now).run();

        // Notification to target (if user)
        if (target_type === 'user') {
          const actor = await env.DB.prepare('SELECT username, name FROM users WHERE id = ?').bind(payload.sub).first();
          await env.DB.prepare(
            'INSERT INTO notifications (id, user_id, type, actor_id, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(crypto.randomUUID(), target_id, 'new_follower', payload.sub, 'New follower', `${actor?.name || 'Someone'} followed you`, `/u/${actor?.username || payload.sub}`, now).run();
        }

        // Notification to token creator (if token)
        if (target_type === 'token') {
          const token = await env.DB.prepare('SELECT creator_id, name FROM tokens WHERE mint_address = ?').bind(target_id).first();
          if (token?.creator_id && token.creator_id !== payload.sub) {
            const actor = await env.DB.prepare('SELECT username, name FROM users WHERE id = ?').bind(payload.sub).first();
            await env.DB.prepare(
              'INSERT INTO notifications (id, user_id, type, actor_id, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
            ).bind(crypto.randomUUID(), token.creator_id, 'token_followed', payload.sub, 'Token followed', `${actor?.name || 'Someone'} followed ${token.name || 'your token'}`, `/token/${target_id}`, now).run();
          }
        }
      } catch (e) {
        return json({ error: 'Failed to follow' }, 500);
      }
    }

    return json({ success: true, following: true });
  }

  // DELETE /api/follows — unfollow
  if (request.method === 'DELETE' && (path === '/api/follows' || path === '/api/follows/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const { target_type, target_id } = await request.json();
    if (!target_type || !target_id) return json({ error: 'target_type and target_id required' }, 400);

    if (env.DB) {
      await env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND target_type = ? AND target_id = ?')
        .bind(payload.sub, target_type, target_id).run();
    }

    return json({ success: true, following: false });
  }

  // GET /api/follows — list my follows
  if (request.method === 'GET' && (path === '/api/follows' || path === '/api/follows/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const type = url.searchParams.get('type'); // 'user' | 'token' | null
    let query = 'SELECT * FROM follows WHERE follower_id = ?';
    const params = [payload.sub];
    if (type) { query += ' AND target_type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const { results } = await env.DB.prepare(query).bind(...params).all();
    return json({ success: true, follows: results || [] });
  }

  // GET /api/follows/status — check if I follow a target
  if (request.method === 'GET' && path === '/api/follows/status') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const target_type = url.searchParams.get('target_type');
    const target_id = url.searchParams.get('target_id');
    if (!target_type || !target_id) return json({ error: 'target_type and target_id required' }, 400);

    const existing = await env.DB.prepare('SELECT id FROM follows WHERE follower_id = ? AND target_type = ? AND target_id = ?')
      .bind(payload.sub, target_type, target_id).first();

    return json({ success: true, following: !!existing });
  }

  return null;
}

// ---------- Feed Handler ----------

async function feedHandler(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);
  const scope = url.searchParams.get('scope') || 'home';
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 50);

  if (!env.DB) return json({ success: true, items: [] });

  try {
    let items = [];

    if (scope === 'home') {
      const { results } = await env.DB.prepare(
        `SELECT ua.id, ua.user_id, ua.action, ua.target, ua.metadata, ua.created_at,
                u.username, u.name as user_name
         FROM user_activities ua
         LEFT JOIN users u ON ua.user_id = u.id
         ORDER BY ua.created_at DESC LIMIT ?`
      ).bind(limit).all();
      items = (results || []).map(r => ({
        id: r.id, type: r.action, target: r.target,
        user: { id: r.user_id, username: r.username, name: r.user_name },
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        created_at: r.created_at,
      }));
    } else if (scope === 'user') {
      const userId = url.searchParams.get('user_id');
      if (!userId) return json({ error: 'user_id required' }, 400);
      const { results } = await env.DB.prepare(
        `SELECT ua.id, ua.action, ua.target, ua.metadata, ua.created_at,
                u.username, u.name as user_name
         FROM user_activities ua
         LEFT JOIN users u ON ua.user_id = u.id
         WHERE ua.user_id = ?
         ORDER BY ua.created_at DESC LIMIT ?`
      ).bind(userId, limit).all();
      items = (results || []).map(r => ({
        id: r.id, type: r.action, target: r.target,
        user: { id: userId, username: r.username, name: r.user_name },
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        created_at: r.created_at,
      }));
    } else if (scope === 'token') {
      const tokenId = url.searchParams.get('token_id');
      if (!tokenId) return json({ error: 'token_id required' }, 400);
      const { results } = await env.DB.prepare(
        `SELECT ae.id, ae.event_type, ae.user_id, ae.metadata, ae.created_at,
                u.username, u.name as user_name
         FROM analytics_events ae
         LEFT JOIN users u ON ae.user_id = u.id
         WHERE ae.token_id = ?
         ORDER BY ae.created_at DESC LIMIT ?`
      ).bind(tokenId, limit).all();
      items = (results || []).map(r => ({
        id: r.id, type: r.event_type, target: tokenId,
        user: { id: r.user_id, username: r.username, name: r.user_name },
        metadata: r.metadata ? JSON.parse(r.metadata) : {},
        created_at: r.created_at,
      }));
    }

    return json({ success: true, items });
  } catch {
    return json({ success: true, items: [] });
  }
}

// ---------- Users Handler ----------

async function usersHandler(request, env) {
  if (request.method !== 'GET') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);
  const path = url.pathname;
  const usernameMatch = path.match(/^\/api\/users\/([^/]+)$/);
  if (!usernameMatch) return json({ error: 'Not Found' }, 404);

  const handle = usernameMatch[1];
  if (!env.DB) return json({ error: 'DB not configured' }, 500);

  try {
    const user = await env.DB.prepare(
      'SELECT id, username, name, bio, avatar, provider, created_at FROM users WHERE username = ?'
    ).bind(handle).first();

    if (!user) return json({ error: 'User not found' }, 404);

    const followerCount = await env.DB.prepare('SELECT COUNT(*) as c FROM follows WHERE target_type = ? AND target_id = ?').bind('user', user.id).first();
    const followingCount = await env.DB.prepare('SELECT COUNT(*) as c FROM follows WHERE follower_id = ?').bind(user.id).first();
    const tokenCount = await env.DB.prepare('SELECT COUNT(*) as c FROM tokens WHERE creator_id = ?').bind(user.id).first();

    const { results: tokens } = await env.DB.prepare(
      'SELECT mint_address, name, symbol, image, network, created_at FROM tokens WHERE creator_id = ? ORDER BY created_at DESC LIMIT 10'
    ).bind(user.id).all();

    const { results: activity } = await env.DB.prepare(
      'SELECT id, action, target, metadata, created_at FROM user_activities WHERE user_id = ? ORDER BY created_at DESC LIMIT 20'
    ).bind(user.id).all();

    return json({
      success: true,
      user: {
        ...user,
        follower_count: followerCount?.c || 0,
        following_count: followingCount?.c || 0,
        token_count: tokenCount?.c || 0,
        tokens: tokens || [],
        activity: (activity || []).map(a => ({ ...a, metadata: a.metadata ? JSON.parse(a.metadata) : {} })),
      },
    });
  } catch {
    return json({ error: 'User not found' }, 404);
  }
}

// ---------- Notifications Handler ----------

async function notificationsHandler(request, env) {
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'Method Not Allowed' }, 405);
  const url = new URL(request.url);

  // GET /api/notifications — list notifications (unread first)
  if (request.method === 'GET') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const limit = Math.min(parseInt(url.searchParams.get('limit') || '30'), 100);
    const unreadOnly = url.searchParams.get('unread') === '1';

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [payload.sub];
    if (unreadOnly) { query += ' AND is_read = 0'; }
    query += ' ORDER BY is_read ASC, created_at DESC LIMIT ?';
    params.push(limit);

    const { results } = await env.DB.prepare(query).bind(...params).all();
    const unread = await env.DB.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id = ? AND is_read = 0').bind(payload.sub).first();

    return json({ success: true, notifications: results || [], unread_count: unread?.c || 0 });
  }

  // POST /api/notifications/read — mark read
  if (request.method === 'POST') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const { notification_ids, mark_all } = body;

    if (mark_all) {
      await env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').bind(payload.sub).run();
    } else if (notification_ids?.length) {
      const stmt = env.DB.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?');
      const batch = notification_ids.map(id => stmt.bind(id, payload.sub));
      await env.DB.batch(batch);
    }

    return json({ success: true });
  }

  return null;
}

// ---------- Tokens Handler ----------

async function tokensHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/tokens/record — record a newly created token
  if (request.method === 'POST' && path === '/api/tokens/record') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const body = await request.json();
    const { mint_address, name, symbol, image, metadata_uri, network } = body;
    if (!mint_address || !name || !symbol) return json({ error: 'mint_address, name, symbol required' }, 400);

    const id = mint_address;
    const now = new Date().toISOString();

    if (env.DB) {
      try {
        await env.DB.prepare(
          'INSERT OR REPLACE INTO tokens (id, mint_address, name, symbol, creator_id, image, metadata_uri, network, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(id, mint_address, name, symbol.toUpperCase(), payload.sub, image || '', metadata_uri || '', network || 'devnet', now).run();
      } catch (e) {
        return json({ error: 'Failed to record token' }, 500);
      }
    }

    return json({ success: true, token: { id, mint_address, name, symbol: symbol.toUpperCase(), creator_id: payload.sub, created_at: now } });
  }

  // GET /api/tokens/mine — list tokens created by authed user
  if (request.method === 'GET' && path === '/api/tokens/mine') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    let tokens = [];
    if (env.DB) {
      try {
        const { results } = await env.DB.prepare(
          'SELECT t.id, t.mint_address, t.name, t.symbol, t.image, t.network, t.created_at, lp.pool_address, lp.bonding_curve_progress, lp.is_migrated, lp.sol_accumulated, lp.sol_target FROM tokens t LEFT JOIN liquidity_pools lp ON lp.token_id = t.id WHERE t.creator_id = ? ORDER BY t.created_at DESC'
        ).bind(payload.sub).all();
        tokens = results || [];
      } catch {}
    }

    return json({ success: true, tokens });
  }

  // GET /api/tokens/:mint — public token info
  const mintMatch = path.match(/^\/api\/tokens\/([A-Za-z0-9]+)$/);
  if (request.method === 'GET' && mintMatch) {
    const mint = mintMatch[1];
    if (!env.DB) return json({ error: 'DB not configured' }, 500);

    try {
      const token = await env.DB.prepare(
        'SELECT t.*, u.username as creator_username, u.name as creator_name, lp.pool_address, lp.bonding_curve_progress, lp.is_migrated, lp.sol_accumulated, lp.sol_target, lp.amm FROM tokens t LEFT JOIN users u ON t.creator_id = u.id LEFT JOIN liquidity_pools lp ON lp.token_id = t.id WHERE t.mint_address = ?'
      ).bind(mint).first();

      if (!token) return json({ error: 'Token not found' }, 404);

      const followCount = await env.DB.prepare('SELECT COUNT(*) as c FROM follows WHERE target_type = ? AND target_id = ?').bind('token', mint).first();

      return json({ success: true, token: { ...token, follower_count: followCount?.c || 0 } });
    } catch {
      return json({ error: 'Token not found' }, 404);
    }
  }

  return null;
}

// ---------- Referrals Handler (Promote & Earn) ----------

const PROMOTER_CUT_PERCENT = 30; // promoter earns 30% of platform's 1% curve fee

async function referralsHandler(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  // POST /api/referrals/claim — visitor attributed to promoter on sign-in
  if (request.method === 'POST' && path === '/api/referrals/claim') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const { promoter_username, token_mint } = await request.json();
    if (!promoter_username) return json({ error: 'promoter_username required' }, 400);

    const promoter = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(promoter_username).first();
    if (!promoter) return json({ error: 'Promoter not found' }, 404);
    if (promoter.id === payload.sub) return json({ error: 'Cannot refer yourself' }, 400);

    const existing = await env.DB.prepare('SELECT id FROM referrals WHERE promoter_id = ? AND referred_id = ?')
      .bind(promoter.id, payload.sub).first();
    if (existing) return json({ success: true, already_claimed: true });

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO referrals (id, promoter_id, referred_id, token_mint, created_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, promoter.id, payload.sub, token_mint || '', new Date().toISOString()).run();

    return json({ success: true });
  }

  // POST /api/referrals/trade — record a referred trade and credit promoter
  if (request.method === 'POST' && path === '/api/referrals/trade') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const { token_mint, sol_amount, tx_signature } = await request.json();
    if (!token_mint || !sol_amount) return json({ error: 'token_mint and sol_amount required' }, 400);

    const referral = await env.DB.prepare('SELECT id, promoter_id FROM referrals WHERE referred_id = ? AND (token_mint = ? OR token_mint = ?) ORDER BY created_at DESC LIMIT 1')
      .bind(payload.sub, token_mint, '').first();

    if (!referral) return json({ success: true, no_referral: true });

    const platformFee = parseFloat(sol_amount) * 0.01;
    const promoterCutLamports = Math.floor(platformFee * 1e9 * PROMOTER_CUT_PERCENT / 100);

    const id = crypto.randomUUID();
    await env.DB.prepare(
      'INSERT INTO referrals (id, promoter_id, referred_id, token_mint, buyer_id, sol_amount, platform_fee, promoter_cut, tx_signature, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(id, referral.promoter_id, payload.sub, token_mint, payload.sub, parseFloat(sol_amount), platformFee, promoterCutLamports / 1e9, tx_signature || '', new Date().toISOString()).run();

    await env.DB.prepare('UPDATE users SET credits_balance = credits_balance + ? WHERE id = ?')
      .bind(promoterCutLamports, referral.promoter_id).run();

    const promoter = await env.DB.prepare('SELECT username, name FROM users WHERE id = ?').bind(referral.promoter_id).first();
    const actor = await env.DB.prepare('SELECT username, name FROM users WHERE id = ?').bind(payload.sub).first();
    await env.DB.prepare(
      'INSERT INTO notifications (id, user_id, type, actor_id, title, body, link, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), referral.promoter_id, 'commission_earned', payload.sub, 'Commission earned', `${actor?.name || 'Someone'} bought ${(parseFloat(sol_amount)).toFixed(4)} SOL of ${token_mint.slice(0, 8)}... — you earned ${(promoterCutLamports / 1e9).toFixed(6)} SOL in credits`, `/settings`, new Date().toISOString()).run();

    return json({ success: true, credited: promoterCutLamports / 1e9 });
  }

  // GET /api/referrals — my referrals + earnings
  if (request.method === 'GET' && (path === '/api/referrals' || path === '/api/referrals/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const referrals = await env.DB.prepare(
      'SELECT r.*, u.username as referred_username, u.name as referred_name FROM referrals r LEFT JOIN users u ON r.referred_id = u.id WHERE r.promoter_id = ? ORDER BY r.created_at DESC LIMIT 50'
    ).bind(payload.sub).all();

    const totalEarnings = await env.DB.prepare('SELECT COALESCE(SUM(promoter_cut), 0) as total FROM referrals WHERE promoter_id = ?').bind(payload.sub).first();
    const user = await env.DB.prepare('SELECT credits_balance FROM users WHERE id = ?').bind(payload.sub).first();

    return json({
      success: true,
      referrals: referrals.results || [],
      total_earnings: totalEarnings?.total || 0,
      credits_balance: user?.credits_balance || 0,
      promoter_cut_percent: PROMOTER_CUT_PERCENT,
    });
  }

  // POST /api/payouts/fee-credit — use credits toward creation fee (0.1 SOL)
  if (request.method === 'POST' && path === '/api/payouts/fee-credit') {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const CREATE_FEE_LAMPORTS = 100_000_000; // 0.1 SOL
    const user = await env.DB.prepare('SELECT credits_balance FROM users WHERE id = ?').bind(payload.sub).first();
    if (!user || user.credits_balance < CREATE_FEE_LAMPORTS) {
      return json({ error: 'Insufficient credits. Need at least 0.1 SOL in credits.' }, 400);
    }

    const id = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO payout_requests (id, user_id, amount_lamports, status, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, payload.sub, CREATE_FEE_LAMPORTS, 'processed', new Date().toISOString()).run();

    await env.DB.prepare('UPDATE users SET credits_balance = credits_balance - ? WHERE id = ?')
      .bind(CREATE_FEE_LAMPORTS, payload.sub).run();

    return json({ success: true, fee_applied: true, remaining_credits: user.credits_balance - CREATE_FEE_LAMPORTS });
  }

  // GET /api/payouts — earnings ledger
  if (request.method === 'GET' && (path === '/api/payouts' || path === '/api/payouts/')) {
    const payload = await verifyAuth(request, env);
    if (!payload) return json({ error: 'Unauthorized' }, 401);

    const payouts = await env.DB.prepare('SELECT * FROM payout_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 20').bind(payload.sub).all();
    const user = await env.DB.prepare('SELECT credits_balance FROM users WHERE id = ?').bind(payload.sub).first();

    return json({ success: true, payouts: payouts.results || [], credits_balance: user?.credits_balance || 0 });
  }

  return null;
}

// ---------- Config Endpoint ----------

async function configHandler(request, env) {
  return json({
    success: true,
    config: {
      googleClientId: env.GOOGLE_CLIENT_ID || env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    },
  });
}

// ---------- Main Router ----------

async function apiRouter(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  try {
    if (path === '/api/config' || path === '/api/config/') return configHandler(request, env);
    if (path.startsWith('/api/auth')) return authHandler(request, env);
    if (path.startsWith('/api/profile')) return profileHandler(request, env);
    if (path.startsWith('/api/follows')) return followsHandler(request, env);
    if (path.startsWith('/api/feed')) return feedHandler(request, env);
    if (path.startsWith('/api/notifications')) return notificationsHandler(request, env);
    if (path.startsWith('/api/referrals')) return referralsHandler(request, env);
    if (path.startsWith('/api/payouts')) return referralsHandler(request, env);
    if (path.match(/^\/api\/users\//)) return usersHandler(request, env);
    if (path.startsWith('/api/tokens')) return tokensHandler(request, env);
    if (path.startsWith('/api/chat')) return chatHandler(request, env);
    if (path.startsWith('/api/admin')) return adminHandler(request, env);
    if (path.startsWith('/api/analytics')) return analyticsHandler(request, env);
    if (path.startsWith('/api/activities')) return activitiesHandler(request, env);
    if (path.startsWith('/api/user-activity')) return activitiesHandler(request, env);
    if (path.startsWith('/api/whale-tracker')) return whaleTrackerHandler(request, env);
    if (path.startsWith('/api/liquidity')) return forwardApiToRender(request, env);
    if (path.startsWith('/api/token-info')) return tokenInfoHandler(request, env);
    if (path.startsWith('/api/dex-screener')) return dexScreenerHandler(request, env);
    if (path.startsWith('/api/helius-rpc')) return heliusRpcHandler(request, env);
    if (path.startsWith('/api/jupiter-quote')) return jupiterQuoteHandler(request, env);
    if (path.startsWith('/api/upload-image')) return uploadImageHandler(request, env);
    if (path.startsWith('/api/upload-metadata')) return uploadMetadataHandler(request, env);

    if (path === '/api/fees' || path === '/api/fees/') {
      return json({
        success: true,
        fees: {
          create: parseFloat(env.NEXT_PUBLIC_PLATFORM_FEE_SOL || '0.1'),
          revokeAuthority: parseFloat(env.NEXT_PUBLIC_REVOKE_FEE_SOL || '0.02'),
          migrateLiquidity: parseFloat(env.NEXT_PUBLIC_MIGRATE_FEE_SOL || '0.05'),
        },
      });
    }

    if (path.startsWith('/api/')) return json({ error: 'Not Found', path }, 404);

    return null; // not an API route — pass to assets
  } catch (err) {
    console.error('API error:', err);
    return json({ error: 'Internal server error', message: err.message }, 500);
  }
}

// ---------- Export ----------

async function forwardApiToRender(request, env) {
  if (!env.RENDER) return json({ error: 'Render service not configured' }, 502);
  return env.RENDER.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle CORS preflight globally
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Route API requests
    const apiResponse = await apiRouter(request, env);
    if (apiResponse) return apiResponse;

    // Forward non-API requests to the OpenNext render worker (SSR/pages)
    if (env.RENDER) {
      return env.RENDER.fetch(request);
    }
    return new Response('Frontend error: render service not configured', { status: 502 });
  },
};
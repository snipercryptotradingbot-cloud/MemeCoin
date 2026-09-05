import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 10;
const recentRequests = new Map();

function rateLimit(key) {
  const now = Date.now();
  const window = recentRequests.get(key) || [];
  const filtered = window.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (filtered.length >= RATE_LIMIT_MAX) {
    return false;
  }
  filtered.push(now);
  recentRequests.set(key, filtered);
  return true;
}

export async function POST(request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { method, params = [] } = await request.json();
    const heliusUrl = `https://rpc.helius.xyz/?api-key=${process.env.HELIUS_API_KEY}`;

    const response = await fetch(heliusUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
      next: { revalidate: 0 },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Helius RPC error', status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

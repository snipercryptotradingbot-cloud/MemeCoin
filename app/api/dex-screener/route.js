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

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');

    if (!tokenAddress) {
      return NextResponse.json({ error: 'Missing tokenAddress parameter' }, { status: 400 });
    }

    const dexScreenerUrl =
      `https://api.dexscreener.com/latest/dex/tokens/${encodeURIComponent(tokenAddress)}`;

    const response = await fetch(dexScreenerUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 30 },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'DEX Screener error', status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch DEX Screener data' }, { status: 500 });
  }
}

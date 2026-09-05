import { NextResponse } from 'next/server';

const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 20;
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
    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const jupiterUrl =
      `https://quote-api.jup.ag/v6/quote?inputMint=${encodeURIComponent(inputMint)}` +
      `&outputMint=${encodeURIComponent(outputMint)}&amount=${encodeURIComponent(amount)}`;

    const response = await fetch(jupiterUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 10 },
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'Jupiter quote error', status: response.status },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch Jupiter quote' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';

function isValidSolanaAddress(address) {
  try {
    // Basic validation: base58 encoded, typically 32-44 chars
    return address && address.length >= 32 && address.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(address);
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const address = url.searchParams.get('address');
    const network = url.searchParams.get('network') || 'mainnet';

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    if (!isValidSolanaAddress(address)) {
      return NextResponse.json({ error: 'Invalid Solana address format' }, { status: 400 });
    }

    const rpcUrl = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
      : process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;

    if (!rpcUrl) {
      return NextResponse.json({ error: 'RPC not configured. Set Helius env vars.' }, { status: 500 });
    }

    const payload = {
      jsonrpc: '2.0',
      id: 'whale-tracker',
      method: 'getBalance',
      params: [address, { commitment: 'confirmed' }],
    };

    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      next: { revalidate: 0 },
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return NextResponse.json({ 
        error: data.error?.message || 'Failed to fetch wallet balance' 
      }, { status: 502 });
    }

    const lamports = Number(data.result?.value ?? 0);
    const sol = lamports / 1e9;

    return NextResponse.json({
      success: true,
      address,
      network,
      lamports,
      sol,
      isWhale: sol > 1000,
      thresholdSol: 1000,
      lastChecked: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Whale tracker error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

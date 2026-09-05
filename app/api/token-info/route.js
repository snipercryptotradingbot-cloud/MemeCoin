export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const mint = searchParams.get('mint');
    const network = searchParams.get('network') || 'devnet';

    if (!mint) {
      return Response.json({ error: 'Missing mint address' }, { status: 400 });
    }

    // Validate mint address format (basic check)
    if (mint.length < 32 || mint.length > 44) {
      return Response.json({ error: 'Invalid mint address format' }, { status: 400 });
    }

    const rpcUrl = network === 'mainnet'
      ? process.env.NEXT_PUBLIC_HELIUS_RPC_MAINNET
      : process.env.NEXT_PUBLIC_HELIUS_RPC_DEVNET;

    if (!rpcUrl) {
      return Response.json({ error: 'RPC not configured' }, { status: 500 });
    }

    // Use Helius DAS API to get asset info
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'mememint',
        method: 'getAsset',
        params: { id: mint },
      }),
    });

    if (!response.ok) {
      return Response.json({ error: 'Failed to fetch token info' }, { status: 502 });
    }

    const data = await response.json();

    if (data.error) {
      // Fallback: try getAccountInfo for basic token data
      const accountResponse = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'mememint',
          method: 'getAccountInfo',
          params: [mint, { encoding: 'jsonParsed' }],
        }),
      });

      const accountData = await accountResponse.json();

      if (accountData.result?.value) {
        return Response.json({
          success: true,
          token: {
            mint,
            raw: accountData.result.value,
          },
        });
      }

      return Response.json({ error: 'Token not found' }, { status: 404 });
    }

    return Response.json({
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
  } catch (error) {
    console.error('Token info error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

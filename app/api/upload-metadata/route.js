export async function POST(request) {
  try {
    const body = await request.json();

    if (!body.name || !body.symbol || !body.image) {
      return Response.json(
        { error: 'Missing required fields: name, symbol, image' },
        { status: 400 }
      );
    }

    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return Response.json({ error: 'IPFS service not configured' }, { status: 500 });
    }

    // Construct Metaplex-compatible metadata JSON
    const metadata = {
      name: body.name,
      symbol: body.symbol,
      description: body.description || '',
      image: body.image,
      external_url: body.external_url || '',
      attributes: body.attributes || [],
      properties: body.properties || {
        files: [
          {
            uri: body.image,
            type: 'image/png',
          },
        ],
        category: 'currency',
      },
    };

    // Add social links if provided
    if (body.social_links) {
      metadata.social_links = body.social_links;
    }

    // Pin JSON to Pinata
    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `mememint-metadata-${body.symbol}-${Date.now()}`,
        },
        pinataOptions: {
          cidVersion: 1,
        },
      }),
    });

    if (!pinataResponse.ok) {
      const errText = await pinataResponse.text();
      console.error('Pinata pin JSON error:', errText);
      return Response.json({ error: 'Failed to upload metadata to IPFS' }, { status: 500 });
    }

    const pinataData = await pinataResponse.json();
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
    const uri = `https://${gateway}/ipfs/${pinataData.IpfsHash}`;

    return Response.json({
      success: true,
      ipfsHash: pinataData.IpfsHash,
      uri,
    });
  } catch (error) {
    console.error('Upload metadata error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Allowed: PNG, JPG, GIF, WEBP' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return Response.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
      return Response.json({ error: 'IPFS service not configured' }, { status: 500 });
    }

    // Upload to Pinata using fetch (Cloudflare Worker compatible)
    const pinataFormData = new FormData();
    pinataFormData.append('file', file);
    pinataFormData.append(
      'pinataMetadata',
      JSON.stringify({
        name: `mememint-token-image-${Date.now()}`,
      })
    );
    pinataFormData.append(
      'pinataOptions',
      JSON.stringify({
        cidVersion: 1,
      })
    );

    const pinataResponse = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: pinataFormData,
    });

    if (!pinataResponse.ok) {
      const errText = await pinataResponse.text();
      console.error('Pinata upload error:', errText);
      return Response.json({ error: 'Failed to upload to IPFS' }, { status: 500 });
    }

    const pinataData = await pinataResponse.json();
    const gateway = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';
    const url = `https://${gateway}/ipfs/${pinataData.IpfsHash}`;

    return Response.json({
      success: true,
      ipfsHash: pinataData.IpfsHash,
      url,
    });
  } catch (error) {
    console.error('Upload image error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

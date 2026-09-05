const GATEWAY = process.env.NEXT_PUBLIC_PINATA_GATEWAY || 'gateway.pinata.cloud';

/**
 * Upload an image file to IPFS via our API route
 */
export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/upload-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload image');
  }

  return response.json();
}

/**
 * Upload token metadata JSON to IPFS via our API route
 */
export async function uploadMetadata({ name, symbol, description, imageUrl, website, twitter, telegram }) {
  const metadata = {
    name,
    symbol,
    description,
    image: imageUrl,
    external_url: website || '',
    attributes: [],
    properties: {
      files: [
        {
          uri: imageUrl,
          type: 'image/png',
        },
      ],
      category: 'currency',
    },
  };

  // Add social links if provided
  if (twitter || telegram || website) {
    metadata.social_links = {};
    if (twitter) metadata.social_links.twitter = twitter.startsWith('http') ? twitter : `https://twitter.com/${twitter.replace('@', '')}`;
    if (telegram) metadata.social_links.telegram = telegram.startsWith('http') ? telegram : `https://t.me/${telegram.replace('@', '')}`;
    if (website) metadata.social_links.website = website;
  }

  const response = await fetch('/api/upload-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to upload metadata');
  }

  return response.json();
}

/**
 * Build full IPFS gateway URL from hash
 */
export function getIpfsUrl(hash) {
  return `https://${GATEWAY}/ipfs/${hash}`;
}

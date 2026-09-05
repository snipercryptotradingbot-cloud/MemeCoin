import { Metadata } from 'next';

export const metadata = {
  title: 'How to Create a Solana Meme Coin in 2026 | MemeMint Guide',
  description:
    'Step-by-step guide to launching a meme coin on Solana in 2026. Covers wallet setup, token metadata, IPFS hosting, Token-2022, DEX listing, and common mistakes to avoid.',
  keywords: [
    'create solana meme coin',
    'solana token guide',
    'token-2022 tutorial',
    'meme coin launch guide',
    'how to launch solana token',
    'spl token tutorial',
  ].join(', '),
  openGraph: {
    title: 'How to Create a Solana Meme Coin in 2026 | MemeMint Guide',
    description:
      'Step-by-step guide to launching a meme coin on Solana. From wallet setup to DEX listing — no coding required.',
    type: 'article',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'How to Create a Solana Meme Coin in 2026 | MemeMint Guide',
    description:
      'Step-by-step guide to launching a meme coin on Solana. From wallet setup to DEX listing — no coding required.',
  },
};

export default function HowToCreateMemeCoinLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Create a Solana Meme Coin',
    description:
      'Step-by-step guide to creating a meme coin on Solana using MemeMint.',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
    inLanguage: 'en-US',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'USD',
      value: '0.1',
    },
    totalTime: 'PT5M',
    step: [
      {
        '@type': 'HowToStep',
        name: 'Install and fund a Solana wallet',
        text: 'Use Phantom or Solflare and fund it with SOL.',
        url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
      },
      {
        '@type': 'HowToStep',
        name: 'Prepare token metadata',
        text: 'Define name, symbol, image, and description for your meme coin.',
        url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
      },
      {
        '@type': 'HowToStep',
        name: 'Upload to IPFS',
        text: 'Upload image and JSON metadata using Pinata.',
        url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
      },
      {
        '@type': 'HowToStep',
        name: 'Create and deploy token',
        text: 'Use MemeMint to create the token on Solana with Token-2022.',
        url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
      },
      {
        '@type': 'HowToStep',
        name: 'Add liquidity on a DEX',
        text: 'List your token on Raydium or Orca to enable trading.',
        url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/how-to-create-solana-meme-coin',
      },
    ],
  };

  return (
    <article className="blog-post-page" itemScope itemType="https://schema.org/Article">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </article>
  );
}

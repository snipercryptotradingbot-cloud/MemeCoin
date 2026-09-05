import { Metadata } from 'next';

export const metadata = {
  title: 'Solana Meme Coin SEO Guide | MemeMint',
  description:
    'How to market a Solana meme coin in 2026: SEO strategy, social signals, community building, and DEX visibility.',
  keywords: [
    'solana meme coin marketing',
    'meme coin seo',
    'crypto community growth',
    'dex visibility',
    'solana token marketing',
  ].join(', '),
  openGraph: {
    title: 'Solana Meme Coin SEO Guide',
    description: 'Practical marketing playbook for Solana meme coin creators.',
    type: 'article',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/blog/solana-meme-coin-seo-guide',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solana Meme Coin SEO Guide',
    description: 'Practical marketing playbook for Solana meme coin creators.',
  },
};

export default function MarketingTipsLayout({ children }) {
  return <>{children}</>;
}

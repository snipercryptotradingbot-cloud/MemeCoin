import { Metadata } from 'next';
import Link from 'next/link';

export const metadata = {
  title: 'Blog | MemeMint',
  description:
    'Guides and insights for launching Solana meme coins. Learn about Token-2022, DEX listing, marketing, and more.',
  openGraph: {
    title: 'Blog | MemeMint',
    description:
      'Guides and insights for launching Solana meme coins. Learn about Token-2022, DEX listing, marketing, and more.',
    type: 'website',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/blog',
  },
};

const POSTS = [
  {
    slug: 'how-to-create-solana-meme-coin',
    title: 'How to Create a Solana Meme Coin in 2026',
    excerpt:
      'A practical, step-by-step guide for creators who want to launch a meme coin on Solana this year.',
    tag: 'GUIDE',
  },
  {
    slug: 'solana-meme-coin-seo-guide',
    title: 'Solana Meme Coin SEO Guide',
    excerpt:
      'A practical marketing playbook for creators who want their token to be discovered, shared, and traded.',
    tag: 'MARKETING',
  },
];

export default function BlogIndex() {
  return (
    <div id="blog-page">
      <section className="page-hero">
        <div className="container container-sm">
          <div className="blog-header">
            <span className="section-label">BLOG</span>
            <h1 className="section-title">Latest posts</h1>
            <p className="section-desc">
              Guides and insights for launching Solana meme coins.
            </p>
          </div>
        </div>
      </section>

      <div className="blog-page container container-sm">
        <div className="blog-grid">
          {POSTS.map((post) => (
            <article key={post.slug} className="blog-card">
              <span className="blog-card-tag">{post.tag}</span>
              <h2 className="blog-card-title">
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <p className="blog-card-excerpt">{post.excerpt}</p>
              <Link className="blog-card-link" href={`/blog/${post.slug}`}>
                Read more
              </Link>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';

const FEATURES = [
  {
    title: 'Instant Launch',
    desc: 'Token-2022 with on-chain metadata. Your meme coin is live on Solana in seconds, not hours.',
    color: 'var(--brand-pink)',
    textColor: 'white',
  },
  {
    title: 'Fully Decentralized',
    desc: 'Images and metadata stored on IPFS. No central server controls your token. Ever.',
    color: 'var(--brand-teal)',
    textColor: 'white',
  },
  {
    title: '0.1 SOL All-In',
    desc: 'One flat fee covers everything — rent, transaction fees, and platform. No hidden charges.',
    color: 'var(--brand-ochre)',
    textColor: 'var(--ink)',
  },
];

const STEPS = [
  { num: '01', title: 'Connect Wallet', desc: 'Link your Phantom, Solflare, or any Solana wallet.', color: 'var(--brand-mint)' },
  { num: '02', title: 'Customize Token', desc: 'Set name, symbol, image, supply, and social links.', color: 'var(--brand-uv)' },
  { num: '03', title: 'Upload & Mint', desc: 'We handle IPFS upload and on-chain deployment.', color: 'var(--brand-lavender)' },
  { num: '04', title: 'Share & Trade', desc: 'Your token is live. Share it with the world.', color: 'var(--brand-peach)' },
];

export default function HomePage() {
  return (
    <div id="home-page">
      <section className="hero page-hero" id="hero-section">
        <div className="container hero-container">
          <div className="hero-content stagger-children">
            <h1 className="hero-title">
              Launch Your Meme Coin<br />
              <span className="hero-title-accent">in 60 Seconds</span>
            </h1>
            <p className="hero-desc section-desc">
              Create fully on-chain SPL tokens with metadata, custom supply, and social links.
              No coding required. Just connect your wallet and go.
            </p>
            <div className="hero-actions">
              <Link href="/create" className="btn btn-mint btn-lg" id="hero-cta">
                Launch Token
              </Link>
              <Link href="/faq" className="btn btn-secondary btn-lg" id="hero-docs">
                Learn More
              </Link>
            </div>
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-value">Token-2022</span>
                <span className="hero-stat-label">Latest Standard</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">~2s</span>
                <span className="hero-stat-label">Confirmation Time</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-value">0.1 SOL</span>
                <span className="hero-stat-label">Total Cost</span>
              </div>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-token animate-float">
              <div className="hero-token-inner">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="120" height="120" rx="32" fill="#0a0a0a"/>
                  <path d="M60 30L75 55H45L60 30Z" fill="#3cffd0"/>
                  <circle cx="60" cy="55" r="6" fill="#0a0a0a"/>
                  <rect x="45" y="65" width="30" height="4" rx="2" fill="#3cffd0" opacity="0.6"/>
                  <rect x="50" y="75" width="20" height="4" rx="2" fill="#3cffd0" opacity="0.4"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features-section" id="features-section">
        <div className="container">
          <div className="features-header">
            <span className="label-mint">WHY MEMEMINT?</span>
            <h2 className="section-title">Everything you need to launch</h2>
            <p className="section-desc">
              No smart contract knowledge required. We handle the complexity so you can focus on your vision.
            </p>
          </div>

          <div className="features-grid stagger-children">
            {FEATURES.map((f, i) => (
              <div
                key={i}
                className={`feature-card feature-card-${i === 0 ? 'pink' : i === 1 ? 'teal' : 'ochre'}`}
                id={`feature-card-${i}`}
                style={{ background: f.color, color: f.textColor }}
              >
                <div className="feature-icon">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    {i === 0 && (
                      <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></>
                    )}
                    {i === 1 && (
                      <><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>
                    )}
                    {i === 2 && (
                      <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>
                    )}
                  </svg>
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="how-section" id="how-section" style={{ background: 'var(--bg-surface-soft)' }}>
        <div className="container">
          <div className="features-header">
            <span className="label-mint">HOW IT WORKS</span>
            <h2 className="section-title">Four simple steps</h2>
          </div>

          <div className="steps-grid stagger-children">
            {STEPS.map((s, i) => (
              <div key={i} className="step-card" id={`step-card-${i}`}>
                <span className="step-num" style={{ color: s.color }}>{s.num}</span>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-section" id="cta-section">
        <div className="container">
          <div className="cta-card">
            <h2 className="cta-title"><span className="cta-title-white">Ready to </span><span className="cta-title-accent">Launch?</span></h2>
            <p className="cta-desc">
              Create your meme coin in under a minute. It&apos;s that simple.
            </p>
            <Link href="/create" className="btn btn-mint btn-lg" id="cta-button">
              Create Your Token
            </Link>
          </div>
        </div>
      </section>

      <style jsx>{`
        .hero {
          background: var(--bg-dark);
          color: var(--on-dark);
          position: relative;
          overflow: hidden;
          min-height: calc(100vh - 64px);
          display: flex;
          align-items: center;
          padding: var(--space-16) 0;
        }

        .hero::before {
          content: '';
          position: absolute;
          top: -20%;
          left: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(60, 255, 208, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero::after {
          content: '';
          position: absolute;
          bottom: -30%;
          right: -15%;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(147, 51, 234, 0.06) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-16);
          align-items: center;
        }

        .hero-title {
          font-size: var(--text-6xl);
          font-weight: 800;
          line-height: 1.1;
          margin: var(--space-4) 0;
          color: var(--on-dark);
          letter-spacing: -0.025em;
        }

        .hero-title-accent {
          color: var(--brand-mint);
        }

        .hero-desc {
          margin-bottom: var(--space-8);
          color: var(--on-dark-soft);
        }

        .hero-actions {
          display: flex;
          gap: var(--space-4);
          margin-bottom: var(--space-12);
        }

        :global(.hero .btn-secondary) {
          background: transparent !important;
          color: var(--on-dark) !important;
          border-color: rgba(255, 255, 255, 0.3) !important;
        }

        :global(.hero .btn-secondary:hover) {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.5) !important;
        }

        .hero-stats {
          display: flex;
          align-items: center;
          gap: var(--space-6);
          padding: var(--space-5) var(--space-6);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
        }

        .hero-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .hero-stat-value {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--ink);
        }

        .hero-stat-label {
          font-size: var(--text-xs);
          color: var(--muted);
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .hero-stat-divider {
          width: 1px;
          height: 36px;
          background: var(--hairline);
        }

        .hero-visual {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hero-token {
          position: relative;
          width: 280px;
          height: 280px;
        }

        .hero-token-inner {
          width: 100%;
          height: 100%;
          border-radius: var(--radius-full);
          background: var(--bg-dark);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid rgba(60, 255, 208, 0.2);
        }

        /* Features */
        .features-section {
          padding: var(--space-24) 0;
        }

        .features-header {
          text-align: center;
          margin-bottom: var(--space-12);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-6);
        }

        .feature-card {
          padding: var(--space-8);
        }

        .feature-icon {
          margin-bottom: var(--space-4);
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: var(--radius-lg);
          background: rgba(255, 255, 255, 0.15);
        }

        .feature-icon svg {
          width: 24px;
          height: 24px;
        }

        .feature-title {
          font-size: var(--text-xl);
          font-weight: 700;
          margin-bottom: var(--space-2);
          letter-spacing: -0.01em;
        }

        .feature-desc {
          font-size: var(--text-sm);
          line-height: 1.6;
          opacity: 0.9;
        }

        /* How It Works */
        .how-section {
          padding: var(--space-24) 0;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-6);
        }

        .step-card {
          padding: var(--space-6);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
        }

        .step-num {
          font-size: var(--text-3xl);
          font-weight: 800;
          display: block;
          margin-bottom: var(--space-4);
          letter-spacing: -0.02em;
          font-family: var(--font-mono);
        }

        .step-title {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }

        .step-desc {
          font-size: var(--text-sm);
          color: var(--body);
          line-height: 1.6;
        }

        /* CTA */
        .cta-section {
          padding: var(--space-24) 0;
        }

        .cta-card {
          text-align: center;
          padding: var(--space-16) var(--space-8);
          background: #0a0a0a;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-2xl);
        }

        .cta-title {
          font-size: var(--text-4xl);
          font-weight: 800;
          margin-bottom: var(--space-3);
          letter-spacing: -0.02em;
        }

        .cta-title-white {
          color: #fff;
        }

        .cta-title-accent {
          color: var(--brand-mint);
        }

        .cta-desc {
          font-size: var(--text-lg);
          color: #A0A0A0;
          margin-bottom: var(--space-8);
          max-width: 600px;
          margin-left: auto;
          margin-right: auto;
        }

        /* Responsive */
        @media (max-width: 1024px) {
          .hero-container {
            grid-template-columns: 1fr;
            text-align: center;
          }

          .hero-content {
            display: flex;
            flex-direction: column;
            align-items: center;
          }

          .hero-visual {
            display: none;
          }

          .hero-stats {
            justify-content: center;
          }

          .features-grid {
            grid-template-columns: 1fr;
          }

          .steps-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (max-width: 768px) {
          .hero {
            padding: var(--space-16) 0 var(--space-12);
          }

          .hero-title {
            font-size: var(--text-4xl);
          }

          .hero-actions {
            flex-direction: column;
            width: 100%;
          }

          .hero-stats {
            flex-direction: column;
            gap: var(--space-4);
          }

          .hero-stat-divider {
            width: 100%;
            height: 1px;
          }

          .steps-grid {
            grid-template-columns: 1fr;
          }

          .cta-card {
            padding: var(--space-10) var(--space-6);
          }

          .cta-title {
            font-size: var(--text-3xl);
          }
        }
      `}</style>
    </div>
  );
}

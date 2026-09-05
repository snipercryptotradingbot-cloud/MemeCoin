'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';


const SOCIAL_LINKS = [
  {
    href: 'https://twitter.com/mememint',
    label: 'Twitter / X',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
        <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
      </svg>
    ),
  },
  {
    href: 'https://github.com/mememint',
    label: 'GitHub',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
  },
  {
    href: 'https://t.me/mememint',
    label: 'Telegram',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
      </svg>
    ),
  },
  {
    href: 'https://discord.gg/mememint',
    label: 'Discord',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z"/>
      </svg>
    ),
  },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname === '/chat') return null;

  return (
    <footer className="footer" id="main-footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <Link href="/" className="footer-logo">
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="28" height="28" rx="8" fill="#0a0a0a"/>
                  <path d="M14 8L18.5 14H9.5L14 8Z" fill="#3cffd0"/>
                  <circle cx="14" cy="14" r="2.5" fill="#0a0a0a"/>
                </svg>
              </span>
              <span className="footer-logo-text">MemeMint</span>
            </Link>
            <p className="footer-tagline">
              The fastest way to launch your meme coin on Solana.
            </p>
            <div className="footer-social" style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.href}
                  href={social.href}
                  className="social-icon"
                  aria-label={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-heading">Product</h4>
            <Link href="/create" className="footer-link">Create Token</Link>
            <Link href="/explore" className="footer-link">Explore</Link>
            <Link href="/liquidity" className="footer-link">Liquidity</Link>
            <Link href="/dashboard" className="footer-link">Dashboard</Link>
            <Link href="/chat" className="footer-link">Chat</Link>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-heading">Account & Support</h4>
            <Link href="/login" className="footer-link">Sign In</Link>
            <Link href="/register" className="footer-link">Create Account</Link>
            <Link href="/contact" className="footer-link">Contact Us</Link>
            <Link href="/faq" className="footer-link">FAQ</Link>
            <Link href="/blog" className="footer-link">Blog</Link>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-heading">Resources</h4>
            <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="footer-link">Solana ↗</a>
            <a href="https://solscan.io" target="_blank" rel="noopener noreferrer" className="footer-link">Solscan ↗</a>
            <a href="https://pinata.cloud" target="_blank" rel="noopener noreferrer" className="footer-link">Pinata ↗</a>
          </div>

          <div className="footer-links-group">
            <h4 className="footer-heading">Legal</h4>
            <Link href="/terms" className="footer-link">Terms & Conditions</Link>
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="footer-copyright">
            © {new Date().getFullYear()} MemeMint. Built on Solana.
          </p>
          <p className="footer-disclaimer">
            Disclaimer: MemeMint is a tool for creating SPL tokens. We are not responsible for how tokens are used.
            Always do your own research. Cryptocurrency involves risk.
          </p>
        </div>
      </div>

      <style jsx>{`
        .footer {
          border-top: 1px solid var(--hairline);
          padding: var(--space-16) 0 var(--space-8);
          margin-top: var(--space-24);
          background: var(--bg-surface-soft);
        }

        .footer-inner {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: var(--space-12);
          margin-bottom: var(--space-12);
        }

        .footer-brand > a {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          text-decoration: none;
          color: var(--ink);
          font-size: var(--text-lg);
          font-weight: 700;
          line-height: 1;
        }

        .footer-brand > a svg {
          flex-shrink: 0;
        }

        .footer-brand > a span:last-child {
          line-height: 1;
        }

        .footer-tagline {
          font-size: var(--text-sm);
          color: var(--body);
          line-height: 1.6;
        }

        .footer-links-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .footer-heading {
          font-size: var(--text-xs);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          color: var(--muted);
          margin-bottom: var(--space-2);
          font-family: var(--font-mono);
        }

        .footer-link {
          font-size: var(--text-sm);
          color: var(--body);
          text-decoration: none;
          transition: color var(--transition-fast);
          font-weight: 400;
        }

        .footer-link:hover {
          color: var(--brand-mint);
        }

        .footer-bottom {
          border-top: 1px solid var(--hairline);
          padding-top: var(--space-6);
        }

        .footer-copyright {
          font-size: var(--text-sm);
          color: var(--muted);
          margin-bottom: var(--space-2);
        }

        .footer-disclaimer {
          font-size: var(--text-xs);
          color: var(--body);
          line-height: 1.6;
          max-width: 700px;
        }

        @media (max-width: 768px) {
          .footer-inner {
            grid-template-columns: 1fr 1fr;
            gap: var(--space-8);
          }
          .footer-brand {
            max-width: 100%;
            grid-column: 1 / -1;
          }
        }

        @media (max-width: 480px) {
          .footer-inner {
            grid-template-columns: 1fr;
            gap: var(--space-8);
          }
        }
      `}</style>
    </footer>
  );
}

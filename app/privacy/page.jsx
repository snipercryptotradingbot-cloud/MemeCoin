import { Metadata } from 'next';

export const metadata = {
  title: 'MemeMint — Privacy Policy',
  description:
    'Privacy policy for MemeMint. Learn how data is handled while creating Solana meme coins.',
  openGraph: {
    title: 'MemeMint — Privacy Policy',
    description:
      'Privacy policy for MemeMint. Learn how data is handled while creating Solana meme coins.',
    type: 'website',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/privacy',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function PrivacyPage() {
  return (
    <div className="legal-page container container-sm" id="privacy-page">
      <div className="legal-header">
        <span className="section-label">LEGAL</span>
        <h1 className="section-title">Privacy Policy</h1>
        <p className="section-desc">Last updated: June 2026</p>
      </div>

      <div className="legal-body">
        <h2>1. Information we collect</h2>
        <p>
          We collect minimal information necessary to provide the token creation
          service, including wallet addresses, mint addresses, and metadata
          references. We do not collect private keys or seed phrases.
        </p>

        <h2>2. Use of information</h2>
        <p>
          Data is used to operate the service, improve reliability, and publish
          token metadata when requested. We do not sell personal data.
        </p>

        <h2>3. Third-party services</h2>
        <p>
          MemeMint may rely on third-party services such as IPFS providers,
          RPC nodes, and wallet extensions. Each provider has its own privacy
          policy.
        </p>

        <h2>4. Security</h2>
        <p>
          We implement reasonable technical safeguards, but no system is fully
          immune from risk. Users remain responsible for protecting their own
          private keys and wallet access.
        </p>

        <h2>5. Contact</h2>
        <p>
          For privacy-related questions, use the Contact page on this site.
        </p>
      </div>
    </div>
  );
}

import { Metadata } from 'next';

export const metadata = {
  title: 'MemeMint — Terms & Conditions',
  description:
    'Terms and conditions for using MemeMint, a tool for creating Solana SPL tokens and related content.',
  openGraph: {
    title: 'MemeMint — Terms & Conditions',
    description:
      'Terms and conditions for using MemeMint, a tool for creating Solana SPL tokens and related content.',
    type: 'website',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/terms',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TermsPage() {
  return (
    <div className="legal-page container container-sm" id="terms-page">
      <div className="legal-header">
        <span className="section-label">LEGAL</span>
        <h1 className="section-title">Terms &amp; Conditions</h1>
        <p className="section-desc">
          Last updated: June 2026
        </p>
      </div>

      <div className="legal-body">
        <h2>1. Acceptance of terms</h2>
        <p>
          By accessing or using MemeMint, you agree to these Terms &amp;
          Conditions. If you do not agree, do not use the service.
        </p>

        <h2>2. Service description</h2>
        <p>
          MemeMint is a tool that helps users create Solana SPL tokens and
          related metadata. We do not offer financial advice, custody, or
          brokerage services.
        </p>

        <h2>3. User responsibilities</h2>
        <p>
          You are responsible for complying with applicable laws, tax
          obligations, and token regulations in your jurisdiction. You must not
          use MemeMint to create tokens that violate intellectual property,
          fraud, or securities laws.
        </p>

        <h2>4. Fees and network costs</h2>
        <p>
          MemeMint charges a platform fee. Additional fees may apply from the
          Solana network, wallet providers, or third-party storage services.
        </p>

        <h2>5. Limitation of liability</h2>
        <p>
          MemeMint is provided on an as-is basis. To the maximum extent
          permitted by law, we are not liable for indirect, incidental, or
          consequential damages arising from your use of the service.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of MemeMint
          after changes become effective constitutes acceptance of the updated
          terms.
        </p>
      </div>
    </div>
  );
}

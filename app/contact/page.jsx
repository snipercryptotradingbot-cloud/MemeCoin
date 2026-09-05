import { Metadata } from 'next';

export const metadata = {
  title: 'Contact Us | MemeMint',
  description:
    'Contact MemeMint for support, partnership inquiries, or questions about creating Solana meme coins.',
  openGraph: {
    title: 'Contact Us | MemeMint',
    description:
      'Contact MemeMint for support, partnership inquiries, or questions about creating Solana meme coins.',
    type: 'website',
    url: 'https://mememint.snipercryptotradingbot.workers.dev/contact',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ContactPage() {
  return (
    <div id="contact-page">
      <section className="page-hero">
        <div className="container container-sm">
          <div className="contact-header">
            <span className="section-label">CONTACT</span>
            <h1 className="section-title">Contact Us</h1>
            <p className="section-desc">
              Questions, support requests, or partnership ideas — reach out and the
              MemeMint team will respond as soon as possible.
            </p>
          </div>
        </div>
      </section>

      <div className="contact-page container container-sm">
        <div className="contact-body">
          <div className="contact-card">
            <h2 className="contact-card-title">General Support</h2>
            <p className="contact-card-body">
              For help with token creation, wallet issues, or account questions,
              contact support.
            </p>
            <a className="contact-email" href="mailto:support@mememint.io">
              support@mememint.io
            </a>
          </div>

          <div className="contact-card">
            <h2 className="contact-card-title">Partnerships</h2>
            <p className="contact-card-body">
              For integrations, launchpad partnerships, or brand collaborations,
              contact partnerships.
            </p>
            <a className="contact-email" href="mailto:partnerships@mememint.io">
              partnerships@mememint.io
            </a>
          </div>

          <div className="contact-card">
            <h2 className="contact-card-title">Security</h2>
            <p className="contact-card-body">
              To report vulnerabilities or suspicious behavior, contact the
              security team.
            </p>
            <a className="contact-email" href="mailto:security@mememint.io">
              security@mememint.io
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';

const FAQS = [
  {
    question: 'What is an SPL Token?',
    answer: 'SPL (Solana Program Library) tokens are the standard for tokens on the Solana blockchain. They are similar to ERC-20 tokens on Ethereum. The new standard, Token-2022, adds native support for metadata, transfer fees, and more.',
  },
  {
    question: 'How much does it cost to create a token?',
    answer: 'We charge a flat fee of 0.1 SOL. This includes the Solana network account rent (~0.01 SOL), transaction fees (~0.000005 SOL), and our platform fee (~0.09 SOL). There are no hidden costs or subscriptions.',
  },
  {
    question: 'What is Token-2022?',
    answer: 'Token-2022 is an extension of the original Solana SPL Token program. Its biggest advantage is the "Metadata Pointer" extension, which allows your token\'s name, symbol, and image to be stored directly on the mint account itself, rather than relying on a separate Metaplex account. MemeMint uses Token-2022 by default.',
  },
  {
    question: 'Where is my token image and metadata stored?',
    answer: 'Your image and the metadata JSON file are pinned to IPFS (InterPlanetary File System) using Pinata. This ensures your token data is fully decentralized and cannot be taken down or altered by a central server.',
  },
  {
    question: 'What does "Revoke Mint Authority" mean?',
    answer: 'When you create a token, your wallet is the "Mint Authority," meaning you can mint more tokens. Revoking this authority permanently locks the total supply. This is highly recommended for meme coins to build trust with your community, as it prevents hyperinflation or "rug pulls."',
  },
  {
    question: 'Can I list my token on decentralized exchanges (DEXs)?',
    answer: 'Yes! Once created, your token is a standard SPL token. You can create a liquidity pool on DEXs like Raydium or Orca to allow users to trade it. Note that creating a liquidity pool requires additional SOL to pair with your token.',
  },
  {
    question: 'Is MemeMint safe?',
    answer: 'Yes. MemeMint never has access to your private keys. When you create a token, the transaction is built in your browser and sent to your wallet (like Phantom or Solflare) for you to review and sign. The platform fee is processed in the same atomic transaction as the token creation.',
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div id="faq-page">
      <section className="page-hero">
        <div className="container container-sm">
          <div className="faq-header">
            <span className="section-label">LEARN</span>
            <h1 className="section-title">Frequently Asked Questions</h1>
            <p className="section-desc">
              Everything you need to know about launching your token on Solana.
            </p>
          </div>
        </div>
      </section>

      <div className="faq-page container container-sm">
        <div className="faq-accordion" id="faq-accordion">
          {FAQS.map((faq, index) => {
            const isActive = openIndex === index;
            return (
              <div
                key={index}
                className={`accordion-item ${isActive ? 'active' : ''}`}
                id={`faq-item-${index}`}
              >
                <button
                  className="accordion-trigger"
                  onClick={() => setOpenIndex(isActive ? -1 : index)}
                  aria-expanded={isActive}
                >
                  {faq.question}
                  <span className="accordion-trigger-icon">▾</span>
                </button>
                <div className="accordion-content">
                  <p>{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="faq-cta text-center">
          <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
            Still have questions? Ready to get started?
          </p>
          <Link href="/create" className="btn btn-primary btn-lg" id="btn-faq-cta">
            Launch Your Token
          </Link>
        </div>
      </div>

      <style jsx>{`
        .faq-page {
          padding: var(--space-12) 0 var(--space-24);
        }

        .faq-header {
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }

        .faq-accordion {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          margin-bottom: var(--space-16);
        }

        .faq-cta {
          padding-top: var(--space-12);
          border-top: 1px solid var(--hairline);
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .text-center {
          text-align: center;
        }
      `}</style>
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';

export default function CopyButton({ text, label = 'Copy', className = '' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [text]);

  return (
    <button
      className={`copy-btn ${copied ? 'copied' : ''} ${className}`}
      onClick={handleCopy}
      title={copied ? 'Copied!' : label}
      id="btn-copy"
    >
      {copied ? (
        <span className="copy-check">✓</span>
      ) : (
        <span className="copy-icon">📋</span>
      )}
      <span className="copy-label">{copied ? 'Copied!' : label}</span>

      <style jsx>{`
        .copy-btn {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          padding: var(--space-2) var(--space-3);
          background: var(--bg-card);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: var(--text-xs);
          font-family: var(--font-sans);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .copy-btn:hover {
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .copy-btn.copied {
          border-color: var(--success);
          color: var(--success);
        }

        .copy-check {
          font-weight: 700;
        }

        .copy-icon, .copy-check {
          font-size: var(--text-sm);
        }

        .copy-label {
          font-weight: 500;
        }
      `}</style>
    </button>
  );
}

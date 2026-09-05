'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';

export default function AuthGuard({ children }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || isLoading) {
    return (
      <div className="container container-sm" style={{ textAlign: 'center', padding: '120px 0' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="auth-guard-container">
        <div className="auth-guard-card animate-fade-in-up">
          <div className="auth-guard-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-pink)' }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h2 className="auth-guard-title">Sign in to access this section</h2>
          <p className="auth-guard-desc">
            Please log in with your MemeMint account or wallet to view this page.
          </p>
          <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn btn-primary btn-lg btn-full-width">
            Login
          </Link>
        </div>

        <style jsx>{`
          .auth-guard-container {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: calc(100vh - 200px);
            padding: var(--space-6);
            background: var(--bg-canvas);
          }
          .auth-guard-card {
            background: var(--bg-surface-card);
            border: 1px solid var(--hairline);
            border-radius: var(--radius-xl);
            padding: var(--space-10);
            max-width: 440px;
            width: 100%;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-4);
          }
          .auth-guard-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 80px;
            height: 80px;
            background: var(--bg-canvas);
            border: 1px solid var(--hairline);
            border-radius: var(--radius-full);
            margin-bottom: var(--space-2);
          }
          .auth-guard-title {
            font-size: var(--text-xl);
            font-weight: 700;
            color: var(--ink);
            line-height: 1.25;
            letter-spacing: -0.01em;
          }
          .auth-guard-desc {
            font-size: var(--text-sm);
            color: var(--body);
            line-height: 1.6;
            margin-bottom: var(--space-4);
          }
          .btn-full-width {
            width: 100%;
          }
        `}</style>
      </div>
    );
  }

  return children;
}

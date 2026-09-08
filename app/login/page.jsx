'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function LoginPage() {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Login failed. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="container container-sm">
        <div className="auth-card animate-fade-in-up">
          <div className="auth-header">
            <div className="auth-logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#0a0a0a"/>
                <path d="M10 22L16 10L22 22" stroke="#3cffd0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="10" r="2" fill="#3cffd0"/>
              </svg>
            </div>
            <h1 className="auth-title">Welcome back</h1>
            <p className="auth-subtitle">Sign in to manage your tokens and liquidity.</p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="input-group">
              <label className="input-label" htmlFor="login-email">Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="login-password">Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary btn-lg auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <button
            className="btn btn-google"
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || googleLoading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: 10 }}>
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading ? 'Signing in...' : 'Sign in with Google'}
          </button>

          <p className="auth-footer-text">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="auth-link">Create one</Link>
            <span className="auth-sep">·</span>
            <Link href="/" className="auth-link">Back to MemeMint</Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-12) var(--space-4) var(--space-24);
        }

        .auth-card {
          background: var(--bg-surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .auth-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
          text-align: center;
        }

        .auth-logo {
          margin-bottom: var(--space-1);
        }

        .auth-title {
          font-size: var(--text-2xl);
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.02em;
        }

        .auth-subtitle {
          font-size: var(--text-sm);
          color: var(--body);
          line-height: 1.6;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .auth-submit {
          margin-top: var(--space-1);
        }

        .auth-divider {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          color: var(--muted);
          font-size: var(--text-xs);
        }

        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--hairline);
        }

        .btn-google {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: var(--space-3) var(--space-5);
          background: var(--bg-canvas);
          color: var(--ink);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-base);
        }

        .btn-google:hover {
          border-color: #d4d4d4;
          background: var(--bg-surface-soft);
        }

        .btn-google:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-footer-text {
          text-align: center;
          font-size: var(--text-sm);
          color: var(--body);
          margin-top: var(--space-1);
        }

        .auth-link {
          color: var(--brand-mint);
          font-weight: 600;
          text-decoration: none;
        }

        .auth-link:hover {
          text-decoration: underline;
        }

        .auth-sep {
          margin: 0 6px;
          color: var(--muted);
        }

        .alert {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          line-height: 1.5;
        }

        .alert-error {
          background: rgba(255, 77, 139, 0.08);
          border: 1px solid rgba(255, 77, 139, 0.25);
          color: #c0275e;
        }
      `}</style>
    </div>
  );
}

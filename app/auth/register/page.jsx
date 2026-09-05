'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function RegisterPage() {
  const { register, registerWithGoogle, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!name || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    try {
      await register(name.trim(), email.trim(), password);
      setSuccess('Account created successfully.');
    } catch {
      setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-page" id="register-page">
      <div className="container container-sm">
        <div className="auth-card animate-fade-in-up">
          <div className="auth-header">
            <h1 className="auth-title">Create your account</h1>
            <p className="auth-subtitle">
              Join MemeMint to launch tokens, manage liquidity, and trade with the community.
            </p>
          </div>

          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success" role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <div className="input-group">
              <label className="input-label" htmlFor="register-name">
                Full Name
              </label>
              <input
                id="register-name"
                className="input"
                type="text"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-email">
                Email
              </label>
              <input
                id="register-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-password">
                Password
              </label>
              <input
                id="register-password"
                className="input"
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="register-confirm">
                Confirm Password
              </label>
              <input
                id="register-confirm"
                className="input"
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              className="btn btn-primary btn-lg auth-submit"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or continue with</span>
          </div>

          <button
            className="btn btn-secondary btn-lg auth-google"
            type="button"
            onClick={() => registerWithGoogle()}
            disabled={isLoading}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: 8 }}
            >
              <path d="M16 8v5h3M8 20H5v-5H2l9-12 9 12h-3v5h-3v-5z" />
            </svg>
            Google
          </button>

          <p className="auth-footer-text">
            Already have an account?{' '}
            <Link href="/login" className="auth-link">
              Sign in
            </Link>
            <span className="auth-sep">·</span>
            <Link href="/" className="auth-link">
              Back to MemeMint
            </Link>
          </p>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          padding: var(--space-12) 0 var(--space-24);
        }

        .auth-card {
          background: var(--bg-surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          padding: var(--space-8);
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .auth-header {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
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

        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .input-label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--muted);
          letter-spacing: 0.06em;
          text-transform: uppercase;
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

        .auth-footer-text {
          text-align: center;
          font-size: var(--text-sm);
          color: var(--body);
        }

        .auth-link {
          color: var(--brand-mint);
          font-weight: 600;
          text-decoration: none;
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

        .alert-success {
          background: rgba(60, 255, 208, 0.08);
          border: 1px solid rgba(60, 255, 208, 0.25);
          color: #0b7a66;
        }
      `}</style>
    </div>
  );
}

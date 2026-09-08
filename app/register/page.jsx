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
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

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
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      await registerWithGoogle();
    } catch (err) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-left">
        <div className="auth-brand">
          <Link href="/" className="brand-logo">
            <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
              <rect width="32" height="32" rx="8" fill="rgba(60,255,208,0.15)"/>
              <path d="M10 22L16 10L22 22" stroke="#3cffd0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="16" cy="10" r="2" fill="#3cffd0"/>
            </svg>
            <span>MemeMint</span>
          </Link>
        </div>
        <div className="auth-hero">
          <h2>Start your memecoin journey.</h2>
          <p>Create an account to launch tokens, provide liquidity, and connect with the community.</p>
          <div className="auth-features">
            <div className="feature">
              <div className="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1v14M1 8h14" stroke="#3cffd0" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span>Launch tokens in seconds</span>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 12l3-3 2 2 4-5 3 3" stroke="#3cffd0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span>Bonding curve price discovery</span>
            </div>
            <div className="feature">
              <div className="feature-icon">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="#3cffd0" strokeWidth="1.5"/>
                  <path d="M8 5v3l2 2" stroke="#3cffd0" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <span>Auto-migrate to DEX</span>
            </div>
          </div>
        </div>
        <div className="auth-hero-dots">
          <span className="dot dot-mint"></span>
          <span className="dot dot-pink"></span>
          <span className="dot dot-lavender"></span>
        </div>
      </div>

      <div className="auth-right">
        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Create your account</h1>
            <p>Join the community and start building</p>
          </div>

          {error && (
            <div className="auth-alert auth-alert-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 4.5v4M8 10.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          <button
            className="google-btn"
            type="button"
            onClick={handleGoogle}
            disabled={isLoading || googleLoading}
          >
            <svg width="18" height="18" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading ? 'Signing in...' : 'Continue with Google'}
          </button>

          <div className="auth-separator">
            <span>or sign up with email</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="field">
              <label htmlFor="register-name">Full name</label>
              <input
                id="register-name"
                type="text"
                placeholder="Your display name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
            <div className="field">
              <label htmlFor="register-email">Email address</label>
              <input
                id="register-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="register-password">Password</label>
                <input
                  id="register-password"
                  type="password"
                  placeholder="8+ characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div className="field">
                <label htmlFor="register-confirm">Confirm</label>
                <input
                  id="register-confirm"
                  type="password"
                  placeholder="Re-enter"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <button className="auth-submit" type="submit" disabled={isLoading}>
              {isLoading ? (
                <span className="btn-loading">
                  <span className="spinner"></span>
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="auth-terms">
            By creating an account you agree to our{' '}
            <Link href="/terms">Terms of Service</Link> and{' '}
            <Link href="/privacy">Privacy Policy</Link>.
          </p>

          <p className="auth-alt">
            Already have an account?{' '}
            <Link href="/login">Sign in</Link>
          </p>
        </div>

        <p className="auth-footer">
          <Link href="/">Back to MemeMint</Link>
        </p>
      </div>

      <style jsx>{`
        .auth-layout {
          min-height: 100vh;
          display: flex;
        }

        .auth-left {
          flex: 1;
          background: var(--bg-dark);
          color: var(--on-dark);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: var(--space-8);
          position: relative;
          overflow: hidden;
        }

        .auth-brand {
          display: flex;
          align-items: center;
        }

        .brand-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          text-decoration: none;
          color: var(--on-dark);
        }

        .brand-logo span {
          font-size: var(--text-lg);
          font-weight: 700;
          letter-spacing: -0.02em;
        }

        .auth-hero {
          max-width: 420px;
        }

        .auth-hero h2 {
          font-size: var(--text-4xl);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.03em;
          margin-bottom: var(--space-5);
        }

        .auth-hero > p {
          font-size: var(--text-base);
          color: var(--on-dark-soft);
          line-height: 1.7;
          margin-bottom: var(--space-8);
        }

        .auth-features {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .feature {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-size: var(--text-sm);
          color: var(--on-dark-soft);
        }

        .feature-icon {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(60, 255, 208, 0.08);
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }

        .auth-hero-dots {
          display: flex;
          gap: var(--space-2);
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .dot-mint { background: var(--brand-mint); }
        .dot-pink { background: var(--brand-pink); }
        .dot-lavender { background: var(--brand-lavender); }

        .auth-right {
          width: 480px;
          min-width: 480px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--space-8);
          background: var(--bg-surface-soft);
          position: relative;
        }

        .auth-card {
          width: 100%;
          max-width: 380px;
          display: flex;
          flex-direction: column;
          gap: var(--space-5);
        }

        .auth-card-header h1 {
          font-size: var(--text-2xl);
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.02em;
          margin-bottom: var(--space-1);
        }

        .auth-card-header p {
          font-size: var(--text-sm);
          color: var(--muted);
        }

        .auth-alert-error {
          display: flex;
          align-items: flex-start;
          gap: var(--space-2);
          padding: var(--space-3) var(--space-4);
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: #b91c1c;
          line-height: 1.5;
        }

        .auth-alert-error svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-3);
          width: 100%;
          padding: var(--space-3) var(--space-4);
          background: var(--bg-canvas);
          color: var(--ink);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .google-btn:hover {
          border-color: #d4d4d4;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }

        .google-btn:active {
          transform: scale(0.99);
        }

        .google-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .auth-separator {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .auth-separator::before,
        .auth-separator::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--hairline);
        }

        .auth-separator span {
          font-size: var(--text-xs);
          color: var(--muted-soft);
          white-space: nowrap;
        }

        .auth-form {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .field {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
          flex: 1;
        }

        .field-row {
          display: flex;
          gap: var(--space-3);
        }

        .field label {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--body-strong);
          letter-spacing: 0.01em;
        }

        .field input {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          color: var(--ink);
          transition: all var(--transition-fast);
          outline: none;
        }

        .field input::placeholder {
          color: var(--muted-soft);
        }

        .field input:hover {
          border-color: #d4d4d4;
        }

        .field input:focus {
          border-color: var(--ink);
          box-shadow: 0 0 0 3px rgba(10, 10, 10, 0.06);
        }

        .auth-submit {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          background: var(--bg-dark);
          color: var(--on-primary);
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-top: var(--space-1);
        }

        .auth-submit:hover {
          background: var(--bg-dark-elevated);
        }

        .auth-submit:active {
          transform: scale(0.99);
        }

        .auth-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-2);
        }

        .spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .auth-terms {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--muted-soft);
          line-height: 1.6;
        }

        .auth-terms a {
          color: var(--muted);
          text-decoration: underline;
        }

        .auth-alt {
          text-align: center;
          font-size: var(--text-sm);
          color: var(--muted);
          padding-top: var(--space-1);
          border-top: 1px solid var(--hairline);
        }

        .auth-alt a {
          color: var(--ink);
          font-weight: 600;
        }

        .auth-alt a:hover {
          color: var(--brand-mint);
        }

        .auth-footer {
          text-align: center;
          font-size: var(--text-xs);
          color: var(--muted-soft);
          margin-top: var(--space-8);
        }

        .auth-footer a {
          color: var(--muted);
        }

        .auth-footer a:hover {
          color: var(--ink);
        }

        @media (max-width: 860px) {
          .auth-layout {
            flex-direction: column;
          }

          .auth-left {
            display: none;
          }

          .auth-right {
            width: 100%;
            min-width: 0;
            min-height: 100vh;
          }
        }
      `}</style>
    </div>
  );
}

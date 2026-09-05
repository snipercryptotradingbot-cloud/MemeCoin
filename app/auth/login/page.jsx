'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';

export default function LoginPage() {
  const { login, loginWithGoogle, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }
    try {
      await login(email, password);
    } catch {
      setError('Login failed. Please try again.');
    }
  };

  return (
    <div className="auth-page" id="login-page">
      <div className="container container-sm">
        <div className="auth-card animate-fade-in-up">
          <div className="auth-header">
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
                placeholder="••••••••"
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
            className="btn btn-secondary btn-lg auth-google"
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isLoading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
              <path d="M16 8v5h3M8 20H5v-5H2l9-12 9 12h-3v5h-3v-5z" />
            </svg>
            Google
          </button>

          <p className="auth-footer-text">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="auth-link">Create one</Link>
            <span className="auth-sep">·</span>
            <Link href="/" className="auth-link">Back to MemeMint</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

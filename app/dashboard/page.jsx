'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';
import NetworkBadge from '@/app/components/NetworkBadge';
import CopyButton from '@/app/components/CopyButton';
import { shortenAddress } from '@/app/lib/solana';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="container container-sm" style={{ textAlign: 'center', padding: '120px 0' }}>
        <div className="spinner spinner-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container container-sm" style={{ textAlign: 'center', padding: '120px 0', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <h1 className="section-title">Sign in to view your dashboard</h1>
        <p className="section-desc">Manage your tokens, pools, chats, and activity in one place.</p>
        <Link href="/login" className="btn btn-primary btn-lg">Sign In</Link>
      </div>
    );
  }

  return (
    <div className="dashboard-page" id="dashboard-page">
      <div className="container">
        <header className="dashboard-header">
          <div>
            <span className="section-label">Your Space</span>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-desc">Tokens, liquidity, activity, and chats tied to your account.</p>
          </div>
          <button className="btn btn-secondary" onClick={logout}>Log Out</button>
        </header>

        <div className="dashboard-grid">
          <section className="card dashboard-card">
            <h2 className="dashboard-card-title">Quick Actions</h2>
            <div className="quick-actions">
              <Link href="/create" className="btn btn-primary">Launch New Token</Link>
              <Link href="/liquidity" className="btn btn-secondary">Manage Liquidity</Link>
              <Link href="/chat" className="btn btn-secondary">Open Chat</Link>
              <Link href="/explore" className="btn btn-ghost">Explore Tokens</Link>
            </div>
          </section>

          <section className="card dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Account</h2>
              <span className="badge badge-primary">{user.provider || 'email'}</span>
            </div>
            <div className="account-rows">
              <div className="account-row">
                <span className="account-label">Name</span>
                <span className="account-value">{user.name}</span>
              </div>
              <div className="account-row">
                <span className="account-label">Email</span>
                <span className="account-value">{user.email}</span>
              </div>
              <div className="account-row">
                <span className="account-label">Wallet</span>
                <span className="account-value">{user.connectedWallet ? shortenAddress(user.connectedWallet) : 'Not connected'}</span>
              </div>
            </div>
          </section>

          <section className="card dashboard-card">
            <h2 className="dashboard-card-title">My Tokens</h2>
            <p className="input-hint">Tokens you launch will appear here.</p>
            <Link href="/create" className="btn btn-secondary btn-sm">+ Create Token</Link>
          </section>

          <section className="card dashboard-card">
            <h2 className="dashboard-card-title">Liquidity</h2>
            <p className="input-hint">Track bonding curve progress and migration status.</p>
            <Link href="/liquidity" className="btn btn-secondary btn-sm">Open Liquidity</Link>
          </section>
        </div>
      </div>

      <style jsx>{`
        .dashboard-page { padding: var(--space-12) 0 var(--space-24); }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--space-4); margin-bottom: var(--space-10); flex-wrap: wrap; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-4); }
        .dashboard-card { display: flex; flex-direction: column; gap: var(--space-4); }
        .dashboard-card-header { display: flex; justify-content: space-between; align-items: center; }
        .dashboard-card-title { font-size: var(--text-lg); font-weight: 700; color: var(--ink); }
        .quick-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
        .account-rows { display: flex; flex-direction: column; gap: var(--space-3); }
        .account-row { display: flex; justify-content: space-between; gap: var(--space-4); }
        .account-label { color: var(--muted); font-size: var(--text-sm); }
        .account-value { font-weight: 600; color: var(--ink); font-size: var(--text-sm); }
      `}</style>
    </div>
  );
}

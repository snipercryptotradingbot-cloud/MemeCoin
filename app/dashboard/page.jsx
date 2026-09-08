'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';
import NetworkBadge from '@/app/components/NetworkBadge';
import AuthGuard from '@/app/components/AuthGuard';

export default function DashboardPage() {
  const { user, token, isLoading, logout, getAuthHeaders } = useAuth();
  const [stats, setStats] = useState({ tokenCount: 0, liquidityCount: 0, activityCount: 0 });
  const [myTokens, setMyTokens] = useState([]);
  const [activity, setActivity] = useState([]);
  const [follows, setFollows] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) return;
    const h = getAuthHeaders();

    fetch('/api/profile', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user?.stats) setStats(d.user.stats); })
      .catch(() => {});

    fetch('/api/tokens/mine', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.tokens) setMyTokens(d.tokens); })
      .catch(() => {});

    fetch('/api/activities?limit=15', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.data) setActivity(d.data); })
      .catch(() => {});

    fetch('/api/follows?type=token', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.follows) setFollows(d.follows); })
      .catch(() => {});

    fetch('/api/notifications', { headers: h })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setNotifs(d.notifications || []); setUnreadCount(d.unread_count || 0); } })
      .catch(() => {});
  }, [user, token]);

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
    <AuthGuard>
    <div className="dashboard-page" id="dashboard-page">
      <div className="container">
        <header className="dashboard-header">
          <div>
            <span className="section-label">Your Space</span>
            <h1 className="section-title">Dashboard</h1>
            <p className="section-desc">Tokens, liquidity, activity, and chats tied to your account.</p>
          </div>
          <div className="header-actions">
            <Link href="/settings" className="btn btn-secondary">Settings</Link>
            <button className="btn btn-ghost" onClick={logout}>Log Out</button>
          </div>
        </header>

        <div className="stats-bar">
          <div className="stat-pill"><span className="stat-num">{stats.tokenCount}</span> Tokens</div>
          <div className="stat-pill"><span className="stat-num">{stats.liquidityCount}</span> Pools</div>
          <div className="stat-pill"><span className="stat-num">{stats.activityCount}</span> Activities</div>
          <div className="stat-pill"><span className="stat-num">{follows.length}</span> Following</div>
          {unreadCount > 0 && <div className="stat-pill unread"><span className="stat-num">{unreadCount}</span> Unread</div>}
        </div>

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
              {user.username && (
                <div className="account-row">
                  <span className="account-label">Handle</span>
                  <span className="account-value">@{user.username}</span>
                </div>
              )}
              <div className="account-row">
                <span className="account-label">Email</span>
                <span className="account-value">{user.email}</span>
              </div>
              <div className="account-row">
                <span className="account-label">Wallet</span>
                <span className="account-value">{user.connected_wallet ? `${user.connected_wallet.slice(0, 6)}...${user.connected_wallet.slice(-4)}` : 'Not connected'}</span>
              </div>
              <div className="account-row">
                <span className="account-label">Credits</span>
                <span className="account-value">{user.credits_balance ? `${(user.credits_balance / 1e9).toFixed(4)} SOL` : '0 SOL'}</span>
              </div>
            </div>
          </section>

          <section className="card dashboard-card wide">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">My Tokens</h2>
              <Link href="/create" className="btn btn-secondary btn-sm">+ Create</Link>
            </div>
            {myTokens.length === 0 ? (
              <p className="input-hint">Tokens you launch will appear here.</p>
            ) : (
              <div className="token-list">
                {myTokens.map(t => (
                  <Link key={t.mint_address} href={`/token/${t.mint_address}`} className="token-row">
                    {t.image && <img className="token-thumb" src={t.image} alt="" />}
                    <div className="token-info">
                      <span className="token-name">{t.name}</span>
                      <span className="token-symbol">{t.symbol}</span>
                    </div>
                    <span className="token-mint">{t.mint_address.slice(0, 6)}...{t.mint_address.slice(-4)}</span>
                    <div className="token-status">
                      {t.is_migrated ? <span className="status-badge migrated">Migrated</span> : <span className="status-badge curve">Curve</span>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Favorites</h2>
            </div>
            {follows.length === 0 ? (
              <p className="input-hint">Follow tokens to track them here.</p>
            ) : (
              <div className="token-list">
                {follows.slice(0, 5).map(f => (
                  <Link key={f.target_id} href={`/token/${f.target_id}`} className="token-row">
                    <div className="token-info">
                      <span className="token-name">{f.target_name || f.target_id.slice(0, 8)}</span>
                    </div>
                    <span className="token-mint">{f.target_id.slice(0, 6)}...{f.target_id.slice(-4)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="card dashboard-card wide">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Recent Activity</h2>
              <Link href="/settings" className="btn btn-ghost btn-sm">View All</Link>
            </div>
            {activity.length === 0 ? (
              <p className="input-hint">Your recent activity will appear here.</p>
            ) : (
              <div className="activity-list">
                {activity.slice(0, 10).map(a => (
                  <div key={a.id} className="activity-row">
                    <span className="activity-action">{a.action}</span>
                    {a.target && <span className="activity-target">{a.target.slice(0, 8)}...</span>}
                    <span className="activity-time">{new Date(a.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card dashboard-card">
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">Notifications</h2>
              {unreadCount > 0 && <span className="badge badge-unread">{unreadCount}</span>}
            </div>
            {notifs.length === 0 ? (
              <p className="input-hint">No notifications yet.</p>
            ) : (
              <div className="notif-list">
                {notifs.slice(0, 5).map(n => (
                  <Link key={n.id} href={n.link || '#'} className={`notif-row ${n.is_read ? '' : 'unread'}`}>
                    <span className="notif-title">{n.title}</span>
                    <span className="notif-body">{n.body}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      <style jsx>{`
        .dashboard-page { padding: var(--space-12) 0 var(--space-24); }
        .dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--space-4); margin-bottom: var(--space-6); flex-wrap: wrap; }
        .header-actions { display: flex; gap: var(--space-3); }
        .stats-bar { display: flex; gap: var(--space-3); margin-bottom: var(--space-8); flex-wrap: wrap; }
        .stat-pill { background: var(--bg-surface-card); border: 1px solid var(--hairline); border-radius: var(--radius-pill); padding: var(--space-2) var(--space-4); font-size: var(--text-sm); color: var(--muted); }
        .stat-num { font-weight: 700; color: var(--ink); margin-right: 4px; }
        .stat-pill.unread { background: rgba(239, 68, 68, 0.06); border-color: rgba(239, 68, 68, 0.15); color: #b91c1c; }
        .dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: var(--space-4); }
        .dashboard-card { display: flex; flex-direction: column; gap: var(--space-4); }
        .dashboard-card.wide { grid-column: span 1; }
        .dashboard-card-header { display: flex; justify-content: space-between; align-items: center; }
        .dashboard-card-title { font-size: var(--text-lg); font-weight: 700; color: var(--ink); }
        .quick-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }
        .account-rows { display: flex; flex-direction: column; gap: var(--space-3); }
        .account-row { display: flex; justify-content: space-between; gap: var(--space-4); }
        .account-label { color: var(--muted); font-size: var(--text-sm); }
        .account-value { font-weight: 600; color: var(--ink); font-size: var(--text-sm); }
        .token-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .token-row { display: flex; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 1px solid var(--hairline); border-radius: var(--radius-md); text-decoration: none; transition: all var(--transition-fast); }
        .token-row:hover { border-color: var(--brand-mint); background: var(--bg-surface-card); }
        .token-thumb { width: 32px; height: 32px; border-radius: var(--radius-sm); object-fit: cover; }
        .token-info { display: flex; flex-direction: column; flex: 1; }
        .token-name { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
        .token-symbol { font-size: var(--text-xs); color: var(--brand-mint-deep); font-weight: 600; }
        .token-mint { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
        .status-badge { font-size: 10px; padding: 2px 8px; border-radius: var(--radius-pill); font-weight: 600; }
        .status-badge.migrated { background: rgba(34, 197, 94, 0.1); color: #15803d; }
        .status-badge.curve { background: rgba(99, 102, 241, 0.1); color: #4f46e5; }
        .activity-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .activity-row { display: flex; gap: var(--space-3); align-items: center; font-size: var(--text-sm); }
        .activity-action { color: var(--ink); font-weight: 500; }
        .activity-target { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--muted); }
        .activity-time { margin-left: auto; font-size: var(--text-xs); color: var(--muted); }
        .notif-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .notif-row { display: flex; flex-direction: column; gap: 2px; padding: var(--space-3); border-radius: var(--radius-md); text-decoration: none; transition: all var(--transition-fast); }
        .notif-row:hover { background: var(--bg-surface-card); }
        .notif-row.unread { background: rgba(99, 102, 241, 0.04); }
        .notif-title { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
        .notif-body { font-size: var(--text-xs); color: var(--muted); }
        .badge-unread { background: #ef4444; color: white; font-size: 10px; padding: 2px 6px; border-radius: 999px; }
        .input-hint { font-size: var(--text-sm); color: var(--muted); }
        @media (min-width: 768px) { .dashboard-card.wide { grid-column: span 2; } }
      `}</style>
    </div>
    </AuthGuard>
  );
}

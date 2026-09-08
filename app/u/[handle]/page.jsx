'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/providers/AuthProvider';

export default function UserProfilePage({ params }) {
  const handle = params?.handle;
  const { user: me, token, getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!handle) return;
    setLoading(true);
    fetch(`/api/users/${handle}`)
      .then(r => r.ok ? r.json() : r.json().then(d => { throw new Error(d.error); }))
      .then(d => { setProfile(d.user); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [handle]);

  useEffect(() => {
    if (!profile?.id || !token) return;
    fetch(`/api/follows/status?target_type=user&target_id=${profile.id}`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setFollowing(d.following); })
      .catch(() => {});
  }, [profile?.id, token]);

  const toggleFollow = async () => {
    if (!token) { window.location.href = '/login'; return; }
    setFollowLoading(true);
    try {
      const method = following ? 'DELETE' : 'POST';
      await fetch('/api/follows', {
        method,
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ target_type: 'user', target_id: profile.id, target_name: profile.name, target_image: profile.avatar }),
      });
      setFollowing(!following);
      setProfile(p => ({ ...p, follower_count: p.follower_count + (following ? -1 : 1) }));
    } catch {}
    setFollowLoading(false);
  };

  if (loading) return <div className="profile-page"><div className="loading">Loading...</div></div>;
  if (error) return <div className="profile-page"><div className="error-msg">{error}</div></div>;
  if (!profile) return null;

  const isMe = me?.id === profile.id;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{(profile.name || profile.username || 'U')[0].toUpperCase()}</span>}
        </div>
        <div className="profile-info">
          <h1>{profile.name || profile.username}</h1>
          {profile.username && <span className="profile-handle">@{profile.username}</span>}
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <div className="profile-meta">
            <span className="provider-badge">{profile.provider}</span>
            <span>Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span>
          </div>
        </div>
        <div className="profile-actions">
          {!isMe && (
            <button className={`btn-follow ${following ? 'following' : ''}`} onClick={toggleFollow} disabled={followLoading}>
              {followLoading ? '...' : (following ? 'Following' : 'Follow')}
            </button>
          )}
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat"><span className="stat-num">{profile.token_count}</span><span className="stat-label">Tokens</span></div>
        <div className="stat"><span className="stat-num">{profile.follower_count}</span><span className="stat-label">Followers</span></div>
        <div className="stat"><span className="stat-num">{profile.following_count}</span><span className="stat-label">Following</span></div>
      </div>

      {profile.tokens.length > 0 && (
        <section className="profile-section">
          <h2>Tokens Created</h2>
          <div className="tokens-grid">
            {profile.tokens.map(t => (
              <Link key={t.mint_address} href={`/token/${t.mint_address}`} className="token-card">
                {t.image && <img className="token-img" src={t.image} alt="" />}
                <div className="token-info">
                  <span className="token-name">{t.name}</span>
                  <span className="token-symbol">{t.symbol}</span>
                  <span className="token-mint">{t.mint_address.slice(0, 6)}...{t.mint_address.slice(-4)}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {profile.activity.length > 0 && (
        <section className="profile-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {profile.activity.map(a => (
              <div key={a.id} className="activity-item">
                <span className="activity-action">{a.action}</span>
                {a.target && <span className="activity-target">{a.target.slice(0, 8)}...</span>}
                <span className="activity-time">{new Date(a.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <style jsx>{`
        .profile-page { max-width: 800px; margin: 0 auto; padding: var(--space-12) var(--space-6) var(--space-24); }
        .loading, .error-msg { text-align: center; padding: var(--space-12); color: var(--muted); font-size: var(--text-sm); }
        .error-msg { color: #b91c1c; }
        .profile-header { display: flex; gap: var(--space-6); align-items: flex-start; margin-bottom: var(--space-8); }
        .profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--brand-mint-soft); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
        .profile-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .profile-avatar span { font-size: var(--text-3xl); font-weight: 800; color: var(--brand-mint-deep); }
        .profile-info { flex: 1; }
        .profile-info h1 { font-size: var(--text-2xl); font-weight: 800; color: var(--ink); margin-bottom: var(--space-1); }
        .profile-handle { font-size: var(--text-sm); color: var(--brand-mint-deep); font-weight: 600; }
        .profile-bio { font-size: var(--text-sm); color: var(--muted); margin-top: var(--space-2); line-height: 1.6; }
        .profile-meta { display: flex; gap: var(--space-3); align-items: center; margin-top: var(--space-3); font-size: var(--text-xs); color: var(--muted); }
        .provider-badge { background: var(--bg-surface-card); padding: 2px 8px; border-radius: var(--radius-sm); font-size: var(--text-xs); text-transform: uppercase; font-weight: 600; }
        .btn-follow { padding: var(--space-2) var(--space-5); border-radius: var(--radius-md); font-size: var(--text-sm); font-weight: 600; cursor: pointer; border: 1px solid var(--brand-mint); background: var(--brand-mint); color: var(--bg-dark); transition: all var(--transition-fast); }
        .btn-follow:hover { opacity: 0.9; }
        .btn-follow.following { background: transparent; color: var(--brand-mint); }
        .btn-follow:disabled { opacity: 0.5; cursor: not-allowed; }
        .profile-stats { display: flex; gap: var(--space-8); margin-bottom: var(--space-8); padding: var(--space-4) 0; border-top: 1px solid var(--hairline); border-bottom: 1px solid var(--hairline); }
        .stat { display: flex; flex-direction: column; gap: 2px; }
        .stat-num { font-size: var(--text-xl); font-weight: 800; color: var(--ink); }
        .stat-label { font-size: var(--text-xs); color: var(--muted); }
        .profile-section { margin-bottom: var(--space-8); }
        .profile-section h2 { font-size: var(--text-lg); font-weight: 700; color: var(--ink); margin-bottom: var(--space-4); }
        .tokens-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-4); }
        .token-card { border: 1px solid var(--hairline); border-radius: var(--radius-md); padding: var(--space-4); text-decoration: none; transition: all var(--transition-fast); display: flex; gap: var(--space-3); align-items: center; }
        .token-card:hover { border-color: var(--brand-mint); background: var(--bg-surface-card); }
        .token-img { width: 40px; height: 40px; border-radius: var(--radius-sm); object-fit: cover; }
        .token-info { display: flex; flex-direction: column; }
        .token-name { font-size: var(--text-sm); font-weight: 600; color: var(--ink); }
        .token-symbol { font-size: var(--text-xs); color: var(--brand-mint-deep); font-weight: 600; }
        .token-mint { font-family: var(--font-mono); font-size: 10px; color: var(--muted); }
        .activity-list { display: flex; flex-direction: column; gap: var(--space-2); }
        .activity-item { display: flex; gap: var(--space-3); align-items: center; padding: var(--space-2) 0; font-size: var(--text-sm); }
        .activity-action { color: var(--ink); font-weight: 500; }
        .activity-target { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--muted); }
        .activity-time { margin-left: auto; font-size: var(--text-xs); color: var(--muted); }
        @media (max-width: 600px) { .profile-header { flex-direction: column; } .profile-actions { align-self: flex-start; } }
      `}</style>
    </div>
  );
}

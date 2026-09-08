'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/app/providers/AuthProvider';
import AuthGuard from '@/app/components/AuthGuard';
import Link from 'next/link';

const TABS = [
  { id: 'profile', label: 'Profile & Handle' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'security', label: 'Security' },
  { id: 'wallet', label: 'Wallet' },
  { id: 'favorites', label: 'Favorites & Following' },
  { id: 'promote', label: 'Promote & Earn' },
];

function SettingsContent() {
  const { user, token, updateProfile, changePassword, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [username, setUsername] = useState('');
  const [usernameSet, setUsernameSet] = useState(false);

  const [emailNotifs, setEmailNotifs] = useState(true);
  const [chatNotifs, setChatNotifs] = useState(true);
  const [pingOnFollow, setPingOnFollow] = useState(true);
  const [pingOnPromote, setPingOnPromote] = useState(true);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [connectedWallet, setConnectedWallet] = useState('');
  const [myTokens, setMyTokens] = useState([]);
  const [myStats, setMyStats] = useState({ tokenCount: 0, liquidityCount: 0, activityCount: 0 });
  const [follows, setFollows] = useState([]);
  const [referrals, setReferrals] = useState([]);
  const [referralStats, setReferralStats] = useState({ total_earnings: 0, credits_balance: 0, promoter_cut_percent: 30 });

  useEffect(() => {
    if (!user) return;
    setName(user.name || '');
    setBio(user.bio || '');
    setUsername(user.username || '');
    setUsernameSet(!!user.username);
    setConnectedWallet(user.connected_wallet || user.wallet_address || '');

    try {
      const prefs = typeof user.preferences === 'string' ? JSON.parse(user.preferences || '{}') : (user.preferences || {});
      setEmailNotifs(prefs.email_notifs !== false);
      setChatNotifs(prefs.chat_notifs !== false);
      setPingOnFollow(prefs.ping_on_follow !== false);
      setPingOnPromote(prefs.ping_on_promote !== false);
    } catch {}

    fetch('/api/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.user) {
          setMyStats(d.user.stats || {});
          if (d.user.stats?.tokenCount > 0) {
            fetch('/api/tokens/mine', { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.ok ? r.json() : null)
              .then(d => { if (d?.tokens) setMyTokens(d.tokens); })
              .catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [user, token]);

  useEffect(() => {
    if (!user || !token || activeTab !== 'favorites') return;
    fetch('/api/follows?type=token', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.follows) setFollows(d.follows); })
      .catch(() => {});
  }, [user, token, activeTab]);

  useEffect(() => {
    if (!user || !token || activeTab !== 'promote') return;
    fetch('/api/referrals', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setReferrals(d.referrals || []); setReferralStats({ total_earnings: d.total_earnings || 0, credits_balance: d.credits_balance || 0, promoter_cut_percent: d.promoter_cut_percent || 30 }); } })
      .catch(() => {});
  }, [user, token, activeTab]);

  const handleSaveProfile = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const updates = { name, bio };
      if (!usernameSet && username) updates.username = username;
      await updateProfile(updates);
      if (!usernameSet && username) setUsernameSet(true);
      setMsg('Profile updated');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleSaveNotifs = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const prefs = { email_notifs: emailNotifs, chat_notifs: chatNotifs, ping_on_follow: pingOnFollow, ping_on_promote: pingOnPromote };
      await updateProfile({ preferences: prefs });
      setMsg('Notification preferences saved');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg(''); setErr('');
    try {
      if (newPassword !== confirmPassword) throw new Error('Passwords do not match');
      await changePassword(currentPassword, newPassword);
      setMsg('Password updated');
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  const handleConnectWallet = async () => {
    setSaving(true); setMsg(''); setErr('');
    try {
      const res = await fetch('/api/profile/connect-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ wallet_address: connectedWallet }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setMsg('Wallet connected');
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Account Settings</h1>
        <p>Manage your profile, preferences, and security.</p>
      </div>

      <div className="settings-layout">
        <aside className="settings-nav">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`settings-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setMsg(''); setErr(''); }}
            >
              {tab.label}
            </button>
          ))}
          <div className="settings-nav-divider" />
          <Link href={user?.username ? `/u/${user.username}` : '/dashboard'} className="settings-nav-link">
            My Profile
          </Link>
          <button className="settings-nav-btn logout" onClick={logout}>Log Out</button>
        </aside>

        <main className="settings-main">
          {msg && <div className="settings-alert success">{msg}</div>}
          {err && <div className="settings-alert error">{err}</div>}

          {activeTab === 'profile' && (
            <section className="settings-section">
              <h2>Profile & Handle</h2>
              <p className="section-desc">Your public identity on MemeMint.</p>

              <div className="field">
                <label>Display Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>

              <div className="field">
                <label>Handle (username)</label>
                {usernameSet ? (
                  <div className="field-static">
                    <span className="handle-badge">@{username}</span>
                    <span className="field-hint">Handle cannot be changed after setup.</span>
                  </div>
                ) : (
                  <input type="text" value={username} onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} placeholder="choose_a_handle" maxLength={20} />
                )}
              </div>

              <div className="field">
                <label>Bio</label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} maxLength={200} placeholder="Tell us about yourself..." />
                <span className="field-hint">{bio.length}/200</span>
              </div>

              <div className="field">
                <label>Email</label>
                <div className="field-static">
                  <span>{user?.email}</span>
                  <span className="provider-badge">{user?.provider}</span>
                </div>
              </div>

              <div className="field">
                <label>Member Since</label>
                <div className="field-static">
                  <span>{user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</span>
                </div>
              </div>

              <button className="btn-save" onClick={handleSaveProfile} disabled={saving || !name.trim()}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </section>
          )}

          {activeTab === 'notifications' && (
            <section className="settings-section">
              <h2>Notifications</h2>
              <p className="section-desc">Choose what you want to be notified about.</p>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Email notifications</span>
                  <span className="toggle-desc">Receive important updates via email.</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={emailNotifs} onChange={e => setEmailNotifs(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Chat notifications</span>
                  <span className="toggle-desc">Get notified about new messages in token rooms.</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={chatNotifs} onChange={e => setChatNotifs(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">New follower alerts</span>
                  <span className="toggle-desc">Know when someone follows your profile or tokens.</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={pingOnFollow} onChange={e => setPingOnFollow(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <div className="toggle-row">
                <div className="toggle-info">
                  <span className="toggle-label">Promote & Earn alerts</span>
                  <span className="toggle-desc">Get notified when you earn referral credits.</span>
                </div>
                <label className="toggle">
                  <input type="checkbox" checked={pingOnPromote} onChange={e => setPingOnPromote(e.target.checked)} />
                  <span className="toggle-slider" />
                </label>
              </div>

              <button className="btn-save" onClick={handleSaveNotifs} disabled={saving}>
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </section>
          )}

          {activeTab === 'security' && (
            <section className="settings-section">
              <h2>Security</h2>
              <p className="section-desc">Manage your password and account security.</p>

              {user?.provider === 'email' ? (
                <form onSubmit={handleChangePassword} className="settings-form">
                  <div className="field">
                    <label>Current Password</label>
                    <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                  <div className="field">
                    <label>New Password</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                    <span className="field-hint">At least 8 characters</span>
                  </div>
                  <div className="field">
                    <label>Confirm New Password</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                  </div>
                  <button className="btn-save" type="submit" disabled={saving || !currentPassword || !newPassword || newPassword !== confirmPassword}>
                    {saving ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              ) : (
                <div className="settings-info-box">
                  <p>Your account uses <strong>{user?.provider}</strong> sign-in. Password management is handled by your identity provider.</p>
                </div>
              )}
            </section>
          )}

          {activeTab === 'wallet' && (
            <section className="settings-section">
              <h2>Wallet</h2>
              <p className="section-desc">Connect your Solana wallet for trading and token creation.</p>

              <div className="field">
                <label>Connected Wallet</label>
                <div className="field-static">
                  <span className="wallet-addr">{connectedWallet || 'Not connected'}</span>
                </div>
              </div>

              <button className="btn-save" onClick={handleConnectWallet} disabled={saving || !connectedWallet}>
                {saving ? 'Saving...' : (connectedWallet ? 'Update Wallet Connection' : 'Connect Wallet')}
              </button>
              <span className="field-hint">Connect your wallet via the top-right wallet button first, then click above to link it to your account.</span>

              {myStats.tokenCount > 0 && (
                <div className="wallet-stats">
                  <h3>Account Stats</h3>
                  <div className="stats-grid">
                    <div className="stat-card"><span className="stat-num">{myStats.tokenCount}</span><span className="stat-label">Tokens Created</span></div>
                    <div className="stat-card"><span className="stat-num">{myStats.liquidityCount}</span><span className="stat-label">Liquidity Positions</span></div>
                    <div className="stat-card"><span className="stat-num">{myStats.activityCount}</span><span className="stat-label">Activities</span></div>
                  </div>
                </div>
              )}

              {myTokens.length > 0 && (
                <div className="my-tokens">
                  <h3>My Tokens</h3>
                  {myTokens.map(t => (
                    <Link key={t.mint_address} href={`/token/${t.mint_address}`} className="token-row">
                      <span className="token-name">{t.name}</span>
                      <span className="token-symbol">{t.symbol}</span>
                      <span className="token-mint">{t.mint_address.slice(0, 8)}...{t.mint_address.slice(-4)}</span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'favorites' && (
            <section className="settings-section">
              <h2>Favorites & Following</h2>
              <p className="section-desc">Tokens you follow to track their progress.</p>

              {follows.length === 0 ? (
                <p className="input-hint">You haven't followed any tokens yet. Visit a token page and click the heart to follow it.</p>
              ) : (
                <div className="token-list">
                  {follows.map(f => (
                    <div key={f.id} className="token-row">
                      <Link href={`/token/${f.target_id}`} className="token-info">
                        <span className="token-name">{f.target_name || f.target_id.slice(0, 12)}</span>
                        <span className="token-mint">{f.target_id.slice(0, 8)}...{f.target_id.slice(-4)}</span>
                      </Link>
                      <button className="btn-unfollow" onClick={async () => {
                        await fetch('/api/follows', {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ target_type: 'token', target_id: f.target_id }),
                        });
                        setFollows(prev => prev.filter(x => x.target_id !== f.target_id));
                      }}>Unfollow</button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {activeTab === 'promote' && (
            <section className="settings-section">
              <h2>Promote & Earn</h2>
              <p className="section-desc">Share your referral link and earn credits when referred users trade.</p>

              <div className="earn-summary">
                <div className="stat-card"><span className="stat-num">{(referralStats.credits_balance / 1e9).toFixed(4)} SOL</span><span className="stat-label">Available Credits</span></div>
                <div className="stat-card"><span className="stat-num">{(referralStats.total_earnings / 1e9).toFixed(4)} SOL</span><span className="stat-label">Total Earned</span></div>
                <div className="stat-card"><span className="stat-num">{referralStats.promoter_cut_percent}%</span><span className="stat-label">Your Cut</span></div>
              </div>

              {user?.username && (
                <div className="referral-link-box">
                  <label>Your Referral Link</label>
                  <div className="referral-link-row">
                    <input type="text" readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}/explore?ref=${user.username}`} onClick={e => e.target.select()} />
                    <button className="btn-copy" onClick={() => {
                      navigator.clipboard?.writeText(`${typeof window !== 'undefined' ? window.location.origin : ''}/explore?ref=${user.username}`);
                      setMsg('Referral link copied!');
                    }}>Copy</button>
                  </div>
                  <span className="field-hint">When someone signs up through this link and trades, you earn {referralStats.promoter_cut_percent}% of the platform fee in credits.</span>
                </div>
              )}

              {!user?.username && (
                <div className="settings-info-box">
                  <p>Set your <strong>handle</strong> in the Profile tab first to generate your referral link.</p>
                </div>
              )}

              {referralStats.credits_balance >= 100_000_000 && (
                <button className="btn-save" onClick={async () => {
                  setSaving(true); setMsg(''); setErr('');
                  try {
                    const res = await fetch('/api/payouts/fee-credit', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    });
                    const d = await res.json();
                    if (!res.ok) throw new Error(d.error);
                    setMsg('0.1 SOL credit applied to your next token creation!');
                    setReferralStats(s => ({ ...s, credits_balance: d.remaining_credits }));
                  } catch (e) { setErr(e.message); }
                  finally { setSaving(false); }
                }} disabled={saving}>
                  {saving ? 'Applying...' : 'Use 0.1 SOL Credits for Token Creation'}
                </button>
              )}

              {referrals.length > 0 && (
                <div className="referral-history">
                  <h3>Referral History</h3>
                  {referrals.map(r => (
                    <div key={r.id} className="referral-row">
                      <span className="referral-user">{r.referred_username || r.referred_id?.slice(0, 12) || 'User'}</span>
                      <span className="referral-amount">{r.promoter_cut ? `+${(r.promoter_cut).toFixed(6)} SOL` : '—'}</span>
                      <span className="referral-time">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      <style jsx>{`
        .settings-page {
          max-width: 960px;
          margin: 0 auto;
          padding: var(--space-12) var(--space-6) var(--space-24);
        }

        .settings-header {
          margin-bottom: var(--space-8);
        }

        .settings-header h1 {
          font-size: var(--text-3xl);
          font-weight: 800;
          color: var(--ink);
          letter-spacing: -0.02em;
          margin-bottom: var(--space-2);
        }

        .settings-header p {
          color: var(--muted);
          font-size: var(--text-sm);
        }

        .settings-layout {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: var(--space-8);
        }

        .settings-nav {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .settings-nav-btn {
          text-align: left;
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          border: none;
          background: none;
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .settings-nav-btn:hover {
          background: var(--bg-surface-card);
          color: var(--ink);
        }

        .settings-nav-btn.active {
          background: var(--brand-mint-soft);
          color: var(--brand-mint-deep);
          font-weight: 600;
        }

        .settings-nav-btn.logout {
          color: #b91c1c;
          margin-top: var(--space-2);
        }

        .settings-nav-btn.logout:hover {
          background: rgba(239, 68, 68, 0.06);
        }

        .settings-nav-divider {
          height: 1px;
          background: var(--hairline);
          margin: var(--space-2) 0;
        }

        .settings-nav-link {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--muted);
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .settings-nav-link:hover {
          background: var(--bg-surface-card);
          color: var(--ink);
        }

        .settings-main {
          min-height: 400px;
        }

        .settings-alert {
          padding: var(--space-3) var(--space-4);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          margin-bottom: var(--space-6);
        }

        .settings-alert.success {
          background: rgba(34, 197, 94, 0.06);
          border: 1px solid rgba(34, 197, 94, 0.15);
          color: #15803d;
        }

        .settings-alert.error {
          background: rgba(239, 68, 68, 0.06);
          border: 1px solid rgba(239, 68, 68, 0.15);
          color: #b91c1c;
        }

        .settings-section h2 {
          font-size: var(--text-xl);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-1);
        }

        .section-desc {
          color: var(--muted);
          font-size: var(--text-sm);
          margin-bottom: var(--space-6);
        }

        .field {
          margin-bottom: var(--space-5);
        }

        .field label {
          display: block;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }

        .field input, .field textarea, .field select {
          width: 100%;
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          color: var(--ink);
          background: var(--bg-canvas);
          transition: border-color var(--transition-fast);
        }

        .field input:focus, .field textarea:focus {
          outline: none;
          border-color: var(--brand-mint);
        }

        .field-static {
          padding: var(--space-3) var(--space-4);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--ink);
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .handle-badge {
          background: var(--brand-mint-soft);
          color: var(--brand-mint-deep);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-weight: 600;
          font-size: var(--text-sm);
        }

        .provider-badge {
          background: var(--bg-surface-card);
          padding: 2px 8px;
          border-radius: var(--radius-sm);
          font-size: var(--text-xs);
          color: var(--muted);
          text-transform: uppercase;
          font-weight: 600;
        }

        .wallet-addr {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          word-break: break-all;
        }

        .field-hint {
          display: block;
          font-size: var(--text-xs);
          color: var(--muted);
          margin-top: var(--space-1);
        }

        .toggle-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-4) 0;
          border-bottom: 1px solid var(--hairline);
        }

        .toggle-row:last-of-type {
          border-bottom: none;
        }

        .toggle-info {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .toggle-label {
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink);
        }

        .toggle-desc {
          font-size: var(--text-xs);
          color: var(--muted);
        }

        .toggle {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
          flex-shrink: 0;
        }

        .toggle input { opacity: 0; width: 0; height: 0; }

        .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background: var(--hairline);
          border-radius: 12px;
          transition: 0.2s;
        }

        .toggle-slider::before {
          content: '';
          position: absolute;
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.2s;
        }

        .toggle input:checked + .toggle-slider {
          background: var(--brand-mint);
        }

        .toggle input:checked + .toggle-slider::before {
          transform: translateX(20px);
        }

        .settings-form {
          display: flex;
          flex-direction: column;
        }

        .btn-save {
          padding: var(--space-3) var(--space-6);
          background: var(--brand-mint);
          color: var(--bg-dark);
          border: none;
          border-radius: var(--radius-md);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          margin-top: var(--space-4);
          align-self: flex-start;
        }

        .btn-save:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .settings-info-box {
          padding: var(--space-4) var(--space-5);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          color: var(--muted);
          line-height: 1.6;
        }

        .settings-info-box strong {
          color: var(--ink);
        }

        .wallet-stats {
          margin-top: var(--space-8);
        }

        .wallet-stats h3, .my-tokens h3 {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-4);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
        }

        .stat-card {
          background: var(--bg-surface-card);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .stat-num {
          font-size: var(--text-2xl);
          font-weight: 800;
          color: var(--brand-mint-deep);
        }

        .stat-label {
          font-size: var(--text-xs);
          color: var(--muted);
        }

        .my-tokens {
          margin-top: var(--space-6);
        }

        .token-row {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-2);
          text-decoration: none;
          transition: all var(--transition-fast);
        }

        .token-row:hover {
          border-color: var(--brand-mint);
          background: var(--bg-surface-card);
        }

        .token-name {
          font-weight: 600;
          color: var(--ink);
          font-size: var(--text-sm);
        }

        .token-symbol {
          color: var(--brand-mint-deep);
          font-weight: 600;
          font-size: var(--text-xs);
        }

        .token-mint {
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--muted);
          margin-left: auto;
        }

        .token-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .token-row {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .token-row:hover {
          border-color: var(--brand-mint);
          background: var(--bg-surface-card);
        }

        .token-row .token-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          text-decoration: none;
        }

        .btn-unfollow {
          padding: var(--space-1) var(--space-3);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          background: transparent;
          font-size: var(--text-xs);
          color: var(--muted);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-unfollow:hover {
          border-color: #ef4444;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.06);
        }

        .earn-summary {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }

        .referral-link-box {
          margin-bottom: var(--space-6);
        }

        .referral-link-box label {
          display: block;
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }

        .referral-link-row {
          display: flex;
          gap: var(--space-2);
        }

        .referral-link-row input {
          flex: 1;
          padding: var(--space-3) var(--space-4);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          font-family: var(--font-mono);
          font-size: var(--text-xs);
          color: var(--ink);
          background: var(--bg-canvas);
        }

        .btn-copy {
          padding: var(--space-3) var(--space-4);
          background: var(--brand-mint);
          color: var(--bg-dark);
          border: none;
          border-radius: var(--radius-md);
          font-size: var(--text-sm);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-copy:hover { opacity: 0.9; }

        .referral-history {
          margin-top: var(--space-6);
        }

        .referral-history h3 {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-4);
        }

        .referral-row {
          display: flex;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-3) 0;
          border-bottom: 1px solid var(--hairline);
          font-size: var(--text-sm);
        }

        .referral-user { color: var(--ink); font-weight: 500; flex: 1; }
        .referral-amount { color: var(--brand-mint-deep); font-weight: 600; font-family: var(--font-mono); font-size: var(--text-xs); }
        .referral-time { color: var(--muted); font-size: var(--text-xs); }
        .input-hint { font-size: var(--text-sm); color: var(--muted); }

        @media (max-width: 768px) {
          .settings-layout {
            grid-template-columns: 1fr;
          }

          .settings-nav {
            flex-direction: row;
            overflow-x: auto;
            gap: var(--space-1);
            padding-bottom: var(--space-2);
          }

          .settings-nav-btn {
            white-space: nowrap;
          }

          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <AuthGuard>
      <SettingsContent />
    </AuthGuard>
  );
}

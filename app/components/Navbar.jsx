'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';

const NAV_ICONS = {
  home: (
    <>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </>
  ),
  explore: (
    <>
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </>
  ),
  liquidity: <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
  create: (
    <>
      <path d="M12 3l1.9 5.7L19.5 10l-5.6 1.3L12 17l-1.9-5.7L4.5 10l5.6-1.3L12 3z" />
      <line x1="19" y1="15" x2="19" y2="20" />
      <line x1="16.5" y1="17.5" x2="21.5" y2="17.5" />
    </>
  ),
  chat: (
    <>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </>
  ),
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </>
  ),
  blog: (
    <>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </>
  ),
  faq: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </>
  ),
  mail: (
    <>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </>
  ),
  activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  barChart: (
    <>
      <line x1="12" y1="20" x2="12" y2="10" />
      <line x1="18" y1="20" x2="18" y2="4" />
      <line x1="6" y1="20" x2="6" y2="16" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </>
  ),
  logOut: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </>
  ),
};

function NavIcon({ name, size = 16 }) {
  return (
    <svg
      className="nav-icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {NAV_ICONS[name]}
    </svg>
  );
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifsRef = useRef(null);
  const pathname = usePathname();
  const { user, logout, loginWithGoogle, getAuthHeaders } = useAuth();

  const isAdmin = user && user.role === 'admin';

  // Close notifications dropdown on outside click
  useEffect(() => {
    if (!notifsOpen) return;
    const handleClick = (e) => { if (notifsRef.current && !notifsRef.current.contains(e.target)) setNotifsOpen(false); };
    const handleKey = (e) => { if (e.key === 'Escape') setNotifsOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey); };
  }, [notifsOpen]);

  const fetchNotifs = async () => {
    try {
      const h = getAuthHeaders();
      const r = await fetch('/api/notifications?limit=10', { headers: h });
      const d = await r.json();
      if (d?.success) { setNotifications(d.notifications || []); setUnreadCount(d.unread_count || 0); }
    } catch {}
  };

  const toggleNotifs = async () => {
    if (!notifsOpen) await fetchNotifs();
    setNotifsOpen(prev => !prev);
  };

  const markAllRead = async () => {
    try {
      await fetch('/api/notifications/read', { method: 'POST', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() }, body: JSON.stringify({ mark_all: true }) });
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch {}
  };

  const PRIMARY_LINKS = [
    { href: '/', label: 'Home', icon: 'home' },
    { href: '/explore', label: 'Explore', icon: 'explore' },
    { href: '/liquidity', label: 'Liquidity', icon: 'liquidity' },
  ];

  const SECONDARY_LINKS = [
    { href: '/create', label: 'Create Token', icon: 'create' },
    { href: '/chat', label: 'Community Chat', icon: 'chat' },
    { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  ];

  const TERTIARY_LINKS = [
    { href: '/blog', label: 'Blog', icon: 'blog' },
    { href: '/faq', label: 'FAQ', icon: 'faq' },
    { href: '/contact', label: 'Contact Us', icon: 'mail' },
  ];

  const handleToggleMobile = () => {
    setMobileOpen((prev) => !prev);
  };

  return (
    <nav className="navbar" id="main-nav">
      <div className="navbar-inner container">
        <Link href="/" className="navbar-logo" id="nav-logo" onClick={() => setMobileOpen(false)}>
          <span className="navbar-logo-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="28" height="28" rx="8" fill="#0a0a0a"/>
              <path d="M14 8L18.5 14H9.5L14 8Z" fill="#3cffd0"/>
              <circle cx="14" cy="14" r="2.5" fill="#0a0a0a"/>
            </svg>
          </span>
          <span className="navbar-logo-text">MemeMint</span>
        </Link>

        <div className="navbar-links" id="nav-links">
          {PRIMARY_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`navbar-link ${pathname === link.href ? 'active' : ''}`}
              id={`nav-link-${link.label.toLowerCase()}`}
            >
              <span className="nav-link-icon">
                <NavIcon name={link.icon} />
              </span>
              <span className="nav-link-label">{link.label}</span>
              {pathname === link.href && <span className="nav-dot" />}
            </Link>
          ))}

          <div
            className="nav-item-dropdown"
            onMouseEnter={() => setActiveDropdown('apps')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={activeDropdown === 'apps'}
              aria-controls="menu-apps"
              className={`dropdown-trigger ${SECONDARY_LINKS.some((l) => pathname === l.href) ? 'active' : ''}`}
            >
              <span className="nav-link-icon">
                <NavIcon name="dashboard" />
              </span>
              Apps
              <svg className={`chevron ${activeDropdown === 'apps' ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div className="dropdown-menu" id="menu-apps">
              {SECONDARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`dropdown-link ${pathname === link.href ? 'active' : ''}`}
                >
                  <span className="dropdown-link-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span className="dropdown-link-label">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div
            className="nav-item-dropdown"
            onMouseEnter={() => setActiveDropdown('resources')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={activeDropdown === 'resources'}
              aria-controls="menu-resources"
              className={`dropdown-trigger ${TERTIARY_LINKS.some((l) => pathname === l.href) ? 'active' : ''}`}
            >
              <span className="nav-link-icon">
                <NavIcon name="blog" />
              </span>
              Resources
              <svg className={`chevron ${activeDropdown === 'resources' ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div className="dropdown-menu" id="menu-resources">
              {TERTIARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`dropdown-link ${pathname === link.href ? 'active' : ''}`}
                >
                  <span className="dropdown-link-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span className="dropdown-link-label">{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="navbar-actions">
          {user ? (
            <>
              <div ref={notifsRef} className="nav-item-dropdown notifs-dropdown">
                <button className="nav-bell" aria-label="Notifications" onClick={toggleNotifs}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  {unreadCount > 0 && <span className="nav-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
                </button>
                <div className={`dropdown-menu notifs-panel ${notifsOpen ? 'open' : ''}`}>
                  <div className="dropdown-header">
                    <p style={{ fontWeight: 700, color: 'var(--ink)', fontSize: 14, margin: 0 }}>Notifications</p>
                  </div>
                  <div className="divider" style={{ margin: '4px 0' }} />
                  {notifications.length === 0 ? (
                    <p className="notifs-empty">No notifications yet.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`notif-item ${n.is_read ? '' : 'unread'}`}>
                        <span className="notif-body">{n.body || n.type || 'Notification'}</span>
                        <span className="notif-time">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}</span>
                      </div>
                    ))
                  )}
                  {unreadCount > 0 && (
                    <button className="notif-mark-read" onClick={markAllRead}>Mark all read</button>
                  )}
                  <Link href="/dashboard" className="notif-view-all" onClick={() => setNotifsOpen(false)}>View all</Link>
                </div>
              </div>
              <div
                className="nav-item-dropdown user-menu-dropdown"
                onMouseEnter={() => setActiveDropdown('user')}
                onMouseLeave={() => setActiveDropdown(null)}
              >
              <div className="navbar-user-chip cursor-pointer">
                <div className="avatar-placeholder">
                  {user.avatar ? (
                    <img className="avatar-img" src={user.avatar} alt="" />
                  ) : (
                    user.name ? user.name[0].toUpperCase() : 'U'
                  )}
                </div>
                <span className="navbar-user-name">{user.name || (user.email ? user.email.split('@')[0] : 'User')}</span>
                {isAdmin && <span className="navbar-user-badge">Admin</span>}
              </div>

              <div className="dropdown-menu dropdown-menu-right">
                <div className="dropdown-header">
                  <p className="dropdown-user-email">{user.email || user.username || 'No email'}</p>
                  {user.username && <p className="dropdown-user-handle">@{user.username}</p>}
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <Link href="/dashboard" className={`dropdown-link ${pathname === '/dashboard' ? 'active' : ''}`}>
                  <span className="dropdown-link-icon">
                    <NavIcon name="dashboard" />
                  </span>
                  <span className="dropdown-link-label">My Dashboard</span>
                </Link>
                <Link href="/settings" className={`dropdown-link ${pathname === '/settings' ? 'active' : ''}`}>
                  <span className="dropdown-link-icon">
                    <NavIcon name="settings" />
                  </span>
                  <span className="dropdown-link-label">Account Settings</span>
                </Link>

                {isAdmin && (
                  <>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <div className="dropdown-section-title">Admin Console</div>
                    <Link href="/admin" className={`dropdown-link admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                      <span className="dropdown-link-icon">
                        <NavIcon name="activity" />
                      </span>
                      <span className="dropdown-link-label">System Status</span>
                    </Link>
                    <Link href="/analytics" className={`dropdown-link admin-nav-link ${pathname === '/analytics' ? 'active' : ''}`}>
                      <span className="dropdown-link-icon">
                        <NavIcon name="barChart" />
                      </span>
                      <span className="dropdown-link-label">Platform Analytics</span>
                    </Link>
                  </>
                )}

                <div className="divider" style={{ margin: '4px 0' }} />
                <button className="dropdown-link logout-btn" onClick={logout}>
                  <span className="dropdown-link-icon">
                    <NavIcon name="logOut" />
                  </span>
                  <span className="dropdown-link-label">Log Out</span>
                </button>
              </div>
            </div>
            </>
          ) : (
            <div className="navbar-auth guest">
              <Link href="/login" className="btn btn-ghost btn-sm">Sign In</Link>
              <Link href="/register" className="btn btn-mint btn-sm">Create Account</Link>
            </div>
          )}

          <button
            className="navbar-hamburger"
            onClick={handleToggleMobile}
            aria-label="Toggle menu"
            id="nav-hamburger"
          >
            <span className={`hamburger-line ${mobileOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileOpen ? 'open' : ''}`} />
            <span className={`hamburger-line ${mobileOpen ? 'open' : ''}`} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="navbar-mobile-drawer animate-fade-in" id="mobile-drawer">
          <div className="mobile-drawer-inner">
            <div className="mobile-section">
              <span className="mobile-section-label">Explore</span>
              {PRIMARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`navbar-mobile-link ${pathname === link.href ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="mobile-link-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="mobile-section">
              <span className="mobile-section-label">Apps</span>
              {SECONDARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`navbar-mobile-link ${pathname === link.href ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="mobile-link-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="mobile-section">
              <span className="mobile-section-label">Resources</span>
              {TERTIARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`navbar-mobile-link ${pathname === link.href ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="mobile-link-icon">
                    <NavIcon name={link.icon} />
                  </span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            {isAdmin && (
              <div className="mobile-section admin-section">
                <span className="mobile-section-label text-warning">Admin Console</span>
                <Link
                  href="/admin"
                  className={`navbar-mobile-link admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="mobile-link-icon">
                    <NavIcon name="activity" />
                  </span>
                  <span>System Status</span>
                </Link>
                <Link
                  href="/analytics"
                  className={`navbar-mobile-link admin-nav-link ${pathname === '/analytics' ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className="mobile-link-icon">
                    <NavIcon name="barChart" />
                  </span>
                  <span>Platform Analytics</span>
                </Link>
              </div>
            )}

            <div className="mobile-auth-row">
              {user ? (
                <div className="mobile-user-actions">
                  <div className="mobile-user-header">
                    <span className="mobile-user-name">{user.name || user.username || 'User'}</span>
                    <span className="mobile-user-badge">{user.role}</span>
                  </div>
                  <button className="btn btn-secondary btn-full-width" onClick={() => { logout(); setMobileOpen(false); }}>
                    Log Out
                  </button>
                </div>
              ) : (
                <div className="mobile-guest-actions">
                  <Link href="/login" className="btn btn-secondary" onClick={() => setMobileOpen(false)}>Sign In</Link>
                  <Link href="/register" className="btn btn-mint" onClick={() => setMobileOpen(false)}>Create Account</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .navbar {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 64px;
          background: rgba(255, 255, 255, 0.92);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--hairline);
          z-index: var(--z-nav);
          display: flex;
          align-items: center;
        }

        .navbar-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 var(--space-6);
          width: 100%;
          box-sizing: border-box;
        }

        .navbar-logo {
          display: flex;
          align-items: center;
          gap: var(--space-3);
          font-weight: 800;
          font-size: var(--text-lg);
          color: var(--ink);
          text-decoration: none;
          flex-shrink: 0;
        }

        .navbar-logo-icon {
          display: inline-flex;
          align-items: center;
        }

        .navbar-logo-text {
          letter-spacing: -0.02em;
          line-height: 1;
          display: inline-flex;
          align-items: center;
        }

        .navbar-links {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-5);
          flex: 1;
        }

        .navbar-link {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          border-radius: var(--radius-pill);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--body-strong);
          transition: color var(--transition-fast), background var(--transition-fast);
          white-space: nowrap;
          text-decoration: none;
        }

        .navbar-link:hover,
        .navbar-link.active {
          color: var(--ink);
          background: var(--bg-surface-soft);
        }

        .nav-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .nav-link-label {
          line-height: 1;
        }

        .nav-dot {
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: var(--brand-mint);
          border-radius: var(--radius-full);
        }

        .nav-item-dropdown {
          position: relative;
          display: inline-flex;
          align-items: center;
        }

        .dropdown-trigger {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          border: none;
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 600;
          color: var(--body-strong);
          cursor: pointer;
          padding: 8px 10px;
          border-radius: var(--radius-pill);
          transition: color var(--transition-fast), background var(--transition-fast);
          white-space: nowrap;
          text-decoration: none;
        }

        .dropdown-trigger:hover,
        .dropdown-trigger.active {
          color: var(--ink);
          background: var(--bg-surface-soft);
        }

        .chevron {
          transition: transform var(--transition-base);
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 10px);
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: 8px;
          min-width: 230px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.12);
          opacity: 0;
          pointer-events: none;
          transition: all var(--transition-base);
          z-index: var(--z-modal);
        }

        .dropdown-menu-right {
          left: auto;
          right: -6px;
          transform: translateY(8px);
        }

        .nav-item-dropdown:hover .dropdown-menu {
          opacity: 1;
          pointer-events: auto;
          transform: translateX(-50%) translateY(0);
        }

        .user-menu-dropdown:hover .dropdown-menu-right {
          transform: translateY(0);
        }

        .dropdown-link {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 10px;
          font-size: var(--text-sm);
          text-align: left;
          background: transparent;
          border: none;
          color: var(--body-strong);
          cursor: pointer;
          text-decoration: none;
          transition: background var(--transition-fast), color var(--transition-fast);
        }

        .dropdown-link:hover {
          background: var(--bg-surface-soft);
          color: var(--ink);
        }

        .dropdown-link.active {
          background: var(--bg-surface-strong);
          color: var(--ink);
          font-weight: 600;
        }

        .dropdown-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          flex-shrink: 0;
          color: var(--muted);
          transition: color var(--transition-fast);
        }

        .dropdown-link:hover .dropdown-link-icon,
        .dropdown-link.active .dropdown-link-icon {
          color: var(--brand-pink);
        }

        .dropdown-link-label {
          line-height: 1.2;
        }

        .dropdown-header {
          padding: 8px 12px 6px;
        }

        .dropdown-user-email {
          font-size: var(--text-xs);
          color: var(--muted);
          word-break: break-all;
        }

        .dropdown-user-handle {
          font-size: var(--text-xs);
          color: var(--brand-mint-deep);
          font-weight: 600;
        }

        .dropdown-section-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brand-pink);
          padding: 6px 12px 4px;
        }

        .admin-nav-link:hover {
          color: var(--brand-pink);
        }

        .logout-btn {
          color: var(--error);
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.06);
          color: var(--error);
        }

        .logout-btn:hover .dropdown-link-icon {
          color: var(--error);
        }

        .navbar-user-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 5px 12px 5px 5px;
          border-radius: 999px;
          border: 1px solid var(--hairline);
          background: var(--bg-surface-soft);
          color: var(--ink);
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          white-space: nowrap;
        }

        .navbar-user-chip:hover {
          border-color: #d4d4d4;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
        }

        .navbar-user-name {
          font-weight: 600;
          font-size: var(--text-sm);
          line-height: 1;
        }

        .navbar-user-badge {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--muted);
          background: var(--bg-surface-strong);
          padding: 2px 7px;
          border-radius: 999px;
          line-height: 1.4;
        }

        .navbar-actions {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          min-width: 0;
          justify-content: flex-end;
        }

        .navbar-hamburger {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 20px;
          height: 14px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
          z-index: 250;
        }

        .hamburger-line {
          width: 100%;
          height: 2px;
          background-color: var(--ink);
          border-radius: var(--radius-pill);
          transition: all var(--transition-base);
        }

        .hamburger-line.open:nth-child(1) {
          transform: translateY(6px) rotate(45deg);
        }

        .hamburger-line.open:nth-child(2) {
          opacity: 0;
        }

        .hamburger-line.open:nth-child(3) {
          transform: translateY(-6px) rotate(-45deg);
        }

        .navbar-mobile-drawer {
          position: fixed;
          top: 64px;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--bg-canvas);
          z-index: var(--z-nav);
          overflow-y: auto;
          padding: var(--space-6) var(--space-6) var(--space-12);
        }

        .mobile-drawer-inner {
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .mobile-section {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .mobile-section-label {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: var(--muted);
          margin-bottom: var(--space-1);
        }

        .navbar-mobile-link {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--body-strong);
          padding: var(--space-3) 4px;
          border-bottom: 1px solid var(--hairline-soft);
          text-decoration: none;
        }

        .navbar-mobile-link.active {
          color: var(--brand-pink);
          border-color: var(--brand-pink);
        }

        .mobile-link-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: var(--muted);
          transition: color var(--transition-fast);
        }

        .navbar-mobile-link:hover .mobile-link-icon,
        .navbar-mobile-link.active .mobile-link-icon {
          color: var(--brand-pink);
        }

        .mobile-auth-row {
          margin-top: var(--space-4);
          padding-top: var(--space-6);
          border-top: 1px solid var(--hairline);
        }

        .mobile-guest-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .mobile-user-actions {
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }

        .mobile-user-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .mobile-user-name {
          font-weight: 700;
          color: var(--ink);
        }

        .mobile-user-badge {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          color: var(--muted);
          background: var(--bg-surface-soft);
          padding: 2px 8px;
          border-radius: var(--radius-pill);
        }

        .btn-full-width {
          width: 100%;
        }

        .text-warning {
          color: var(--brand-pink) !important;
        }

        .admin-section {
          background: rgba(255, 77, 139, 0.03);
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: 1px dashed rgba(255, 77, 139, 0.2);
        }

        /* ---- Hover gap bridge ---- */
        .nav-item-dropdown::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          height: 14px;
        }

        /* ---- Avatar ---- */
        .avatar-img {
          width: 100%;
          height: 100%;
          border-radius: var(--radius-full);
          object-fit: cover;
        }

        /* ---- Notifications bell badge ---- */
        .nav-bell {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          color: var(--muted);
          transition: all var(--transition-fast);
          position: relative;
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .nav-bell:hover {
          background: var(--bg-surface-card);
          color: var(--ink);
        }

        .nav-bell-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 16px;
          height: 16px;
          border-radius: var(--radius-full);
          background: #ef4444;
          color: white;
          font-size: 10px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          line-height: 1;
          border: 2px solid var(--bg-canvas);
        }

        .notifs-dropdown {
          position: static;
        }

        .notifs-panel {
          left: auto;
          right: 0;
          transform: translateY(8px);
          min-width: 300px;
          max-height: 420px;
          overflow-y: auto;
          opacity: 0;
          pointer-events: none;
        }

        .notifs-panel.open {
          opacity: 1;
          pointer-events: auto;
          transform: translateY(0);
        }

        .notifs-empty {
          padding: 16px;
          text-align: center;
          font-size: var(--text-sm);
          color: var(--muted);
        }

        .notif-item {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 12px 14px;
          border-radius: 12px;
          cursor: default;
        }

        .notif-item.unread {
          background: var(--bg-surface-soft);
        }

        .notif-body {
          font-size: 14px;
          color: var(--ink);
          line-height: 1.4;
        }

        .notif-time {
          font-size: var(--text-xs);
          color: var(--muted);
        }

        .notif-mark-read {
          display: block;
          width: 100%;
          padding: 10px 14px;
          background: none;
          border: none;
          border-top: 1px solid var(--hairline);
          color: var(--brand-mint);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
          transition: color var(--transition-fast);
        }

        .notif-mark-read:hover {
          color: var(--brand-mint-deep);
        }

        .notif-view-all {
          display: block;
          width: 100%;
          padding: 10px 14px;
          text-align: center;
          font-size: 13px;
          font-weight: 600;
          color: var(--muted);
          border-top: 1px solid var(--hairline);
          text-decoration: none;
          transition: color var(--transition-fast);
        }

        .notif-view-all:hover {
          color: var(--ink);
        }

        /* ---- Dropdown sizing fixes ---- */
        .dropdown-menu {
          padding: 10px;
          gap: 4px;
          min-width: 240px;
        }

        .dropdown-link {
          padding: 11px 14px;
          gap: 12px;
          font-size: 14px;
          border-radius: 10px;
        }

        .dropdown-header {
          padding: 10px 14px 8px;
        }

        @media (max-width: 940px) {
          .navbar-links {
            display: none;
          }
          .navbar-hamburger {
            display: flex;
          }
          .navbar-auth.guest {
            display: none;
          }
          .notifs-dropdown {
            display: none;
          }
          .user-menu-dropdown {
            display: inline-flex !important;
          }
          .user-menu-dropdown .navbar-user-name,
          .user-menu-dropdown .navbar-user-badge,
          .user-menu-dropdown .dropdown-menu {
            display: none;
          }
          .user-menu-dropdown .navbar-user-chip {
            padding: 3px;
            border-radius: var(--radius-full);
          }
        }
      `}</style>
    </nav>
  );
}
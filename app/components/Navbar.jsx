'use client';

import Link from 'next/link';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/app/providers/AuthProvider';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isAdmin = user && user.role === 'admin';
  const isHome = pathname === '/';

  const PRIMARY_LINKS = [
    { href: '/', label: 'Home' },
    { href: '/explore', label: 'Explore' },
    { href: '/liquidity', label: 'Liquidity' },
  ];

  const SECONDARY_LINKS = [
    { href: '/create', label: 'Create Token' },
    { href: '/chat', label: 'Community Chat' },
    { href: '/dashboard', label: 'Dashboard' },
  ];

  const TERTIARY_LINKS = [
    { href: '/blog', label: 'Blog' },
    { href: '/faq', label: 'FAQ' },
    { href: '/contact', label: 'Contact Us' },
  ];

  const handleToggleMobile = () => {
    setMobileOpen(!mobileOpen);
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
              {link.label}
              {pathname === link.href && <span className="nav-dot" />}
            </Link>
          ))}

          <div
            className="nav-item-dropdown"
            onMouseEnter={() => setActiveDropdown('apps')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className={`dropdown-trigger ${SECONDARY_LINKS.some(l => pathname === l.href) ? 'active' : ''}`}>
              Apps
              <svg className={`chevron ${activeDropdown === 'apps' ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div className="dropdown-menu">
              {SECONDARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`dropdown-link ${pathname === link.href ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div
            className="nav-item-dropdown"
            onMouseEnter={() => setActiveDropdown('resources')}
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className={`dropdown-trigger ${TERTIARY_LINKS.some(l => pathname === l.href) ? 'active' : ''}`}>
              Resources
              <svg className={`chevron ${activeDropdown === 'resources' ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            <div className="dropdown-menu">
              {TERTIARY_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`dropdown-link ${pathname === link.href ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="navbar-actions">
          {user ? (
            <div
              className="nav-item-dropdown user-menu-dropdown"
              onMouseEnter={() => setActiveDropdown('user')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <div className="navbar-user-chip cursor-pointer">
                <div className="avatar-placeholder">
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <span className="navbar-user-name">{user.name || user.email.split('@')[0]}</span>
                <span className="navbar-user-badge">{user.role === 'admin' ? 'Admin' : 'User'}</span>
              </div>
              
              <div className="dropdown-menu dropdown-menu-right">
                <div className="dropdown-header">
                  <p className="dropdown-user-email">{user.email}</p>
                </div>
                <div className="divider" style={{ margin: '4px 0' }} />
                <Link href="/dashboard" className={`dropdown-link ${pathname === '/dashboard' ? 'active' : ''}`}>
                  My Dashboard
                </Link>
                
                {isAdmin && (
                  <>
                    <div className="divider" style={{ margin: '4px 0' }} />
                    <div className="dropdown-section-title">Admin Console</div>
                    <Link href="/admin" className={`dropdown-link admin-nav-link ${pathname === '/admin' ? 'active' : ''}`}>
                      System Status
                    </Link>
                    <Link href="/analytics" className={`dropdown-link admin-nav-link ${pathname === '/analytics' ? 'active' : ''}`}>
                      Platform Analytics
                    </Link>
                  </>
                )}
                
                <div className="divider" style={{ margin: '4px 0' }} />
                <button className="dropdown-link logout-btn" onClick={logout}>
                  Log Out
                </button>
              </div>
            </div>
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
                  {link.label}
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
                  {link.label}
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
                  {link.label}
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
                  System Status
                </Link>
                <Link
                  href="/analytics"
                  className={`navbar-mobile-link admin-nav-link ${pathname === '/analytics' ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  Platform Analytics
                </Link>
              </div>
            )}

            <div className="mobile-auth-row">
              {user ? (
                <div className="mobile-user-actions">
                  <div className="mobile-user-header">
                    <span className="mobile-user-name">{user.name || user.email}</span>
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

        .navbar-logo-text {
          letter-spacing: -0.02em;
        }

        .nav-center {
          display: flex;
          align-items: center;
          gap: var(--space-6);
          flex: 1;
          justify-content: center;
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
          font-size: var(--text-sm);
          font-weight: 500;
          color: var(--body);
          padding: var(--space-2) 0;
          transition: color var(--transition-fast);
          display: flex;
          flex-direction: column;
          align-items: center;
          white-space: nowrap;
        }

        .navbar-link:hover,
        .navbar-link.active {
          color: var(--ink);
        }

        .nav-dot {
          position: absolute;
          bottom: -4px;
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
          gap: 6px;
          background: transparent;
          border: none;
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          font-weight: 500;
          color: ${isHome ? 'rgba(255,255,255,0.85)' : 'var(--body)'};
          cursor: pointer;
          padding: var(--space-2) var(--space-1);
          transition: color var(--transition-fast);
          white-space: nowrap;
        }

        .dropdown-trigger:hover,
        .dropdown-trigger.active {
          color: ${isHome ? '#ffffff' : 'var(--ink)'};
        }

        .chevron {
          transition: transform var(--transition-base);
        }

        .chevron.open {
          transform: rotate(180deg);
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%) translateY(8px);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-lg);
          padding: var(--space-2) 0;
          min-width: 200px;
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
          display: block;
          width: 100%;
          padding: 10px 18px;
          font-size: var(--text-sm);
          text-align: left;
          background: transparent;
          border: none;
          color: var(--body);
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

        .dropdown-header {
          padding: 8px 18px 4px;
        }

        .dropdown-user-email {
          font-size: var(--text-xs);
          color: var(--muted);
          word-break: break-all;
        }

        .dropdown-section-title {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--brand-pink);
          padding: 6px 18px 2px;
        }

        .admin-nav-link {
          color: var(--body);
        }

        .admin-nav-link:hover {
          color: var(--brand-pink);
        }

        .logout-btn {
          color: var(--error);
        }

        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.05);
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
          min-width: 180px;
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
          background-color: ${isHome ? '#ffffff' : 'var(--ink)'};
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
          gap: var(--space-2);
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
          font-size: var(--text-base);
          font-weight: 600;
          color: var(--body);
          padding: var(--space-2) 0;
          border-bottom: 1px solid var(--hairline-soft);
        }

        .navbar-mobile-link.active {
          color: var(--brand-pink);
          border-color: var(--brand-pink);
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

        @media (max-width: 940px) {
          .navbar-links {
            display: none;
          }
          .navbar-hamburger {
            display: flex;
          }
          .navbar-auth.guest .btn-ghost {
            display: none;
          }
          .navbar-auth.guest .btn-mint {
            padding: var(--space-1) var(--space-3);
            font-size: var(--text-xs);
            border-radius: var(--radius-pill);
            white-space: nowrap;
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

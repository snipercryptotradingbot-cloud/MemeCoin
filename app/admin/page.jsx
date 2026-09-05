'use client';

import AuthGuard from '@/app/components/AuthGuard';

export default function AdminPageWrapper() {
  return (
    <AuthGuard>
      <div className="admin-page">
        <div className="container">
          <header className="admin-header">
            <div>
              <span className="section-label">Platform</span>
              <h1 className="section-title">Admin Dashboard</h1>
              <p className="section-desc">System status, users, and audit logs.</p>
            </div>
          </header>

          <div className="admin-grid">
            <section className="card">
              <div className="admin-status-row">
                <span className="admin-status-label">Database</span>
                <span className="badge badge-mint">Connected</span>
              </div>
              <div className="admin-status-row">
                <span className="admin-status-label">Chat Servers</span>
                <span className="badge badge-mint">Online</span>
              </div>
              <div className="admin-status-row">
                <span className="admin-status-label">Solana RPC</span>
                <span className="badge badge-mint">Healthy</span>
              </div>
            </section>

            <section className="card">
              <h2 className="dashboard-card-title">Quick Actions</h2>
              <div className="quick-actions">
                <button className="btn btn-mint">Migrate Liquidity</button>
                <button className="btn btn-secondary">View Audit Logs</button>
              </div>
            </section>

            <section className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Wallet</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Joined</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="stat-mono">7xVy...9zQb</td>
                      <td><span className="badge">user</span></td>
                      <td><span className="badge badge-mint">active</span></td>
                      <td>2 mins ago</td>
                    </tr>
                    <tr>
                      <td className="stat-mono">3kLm...4wPn</td>
                      <td><span className="badge badge-uv">admin</span></td>
                      <td><span className="badge badge-mint">active</span></td>
                      <td>1 hr ago</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .admin-page { padding: var(--space-12) 0 var(--space-24); }
        .admin-header { margin-bottom: var(--space-10); }
        .admin-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: var(--space-4); }
        .admin-status-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--hairline); }
        .admin-status-row:last-child { border-bottom: none; }
        .admin-status-label { font-size: var(--text-sm); color: var(--body); }
        .quick-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); margin-top: 4px; }
        .table-wrap { overflow-x: auto; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 12px 10px; border-bottom: 1px solid var(--hairline); font-size: var(--text-sm); }
        .data-table th { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--text-xs); }
      `}</style>
    </AuthGuard>
  );
}

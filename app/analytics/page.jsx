'use client';

import AuthGuard from '@/app/components/AuthGuard';

export default function AnalyticsPageWrapper() {
  return (
    <AuthGuard>
      <div className="analytics-page">
        <div className="container">
          <header className="analytics-header">
            <div>
              <span className="section-label">Platform</span>
              <h1 className="section-title">Analytics</h1>
              <p className="section-desc">Activity, volume, and retention.</p>
            </div>
            <div className="analytics-pills">
              <span className="badge badge-mint">24h</span>
              <span className="badge">7d</span>
              <span className="badge">30d</span>
            </div>
          </header>

          <div className="analytics-grid">
            <section className="card analytics-stat">
              <span className="stat-label">Total Tokens Minted</span>
              <p className="stat-value">1,204</p>
              <span className="input-hint">+12% this week</span>
            </section>
            <section className="card analytics-stat">
              <span className="stat-label">Total Volume (SOL)</span>
              <p className="stat-value">45,892</p>
              <span className="input-hint">+5.4% this week</span>
            </section>
            <section className="card analytics-stat">
              <span className="stat-label">Active Traders</span>
              <p className="stat-value">8,341</p>
              <span className="input-hint">Steady</span>
            </section>

            <section className="card" style={{ gridColumn: '1 / -1' }}>
              <h2 className="dashboard-card-title">Top Performing Tokens</h2>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Token</th>
                      <th>Volume</th>
                      <th>Change</th>
                      <th>Network</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>MoonPup ($MPUP)</td>
                      <td>12.4K</td>
                      <td className="text-positive">+34%</td>
                      <td><span className="badge badge-mint">devnet</span></td>
                    </tr>
                    <tr>
                      <td>Rocket Cat ($RCAT)</td>
                      <td>21.1K</td>
                      <td className="text-positive">+54%</td>
                      <td><span className="badge badge-mint">devnet</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>

      <style jsx>{`
        .analytics-page { padding: var(--space-12) 0 var(--space-24); }
        .analytics-header { display: flex; justify-content: space-between; align-items: flex-end; gap: var(--space-4); margin-bottom: var(--space-10); flex-wrap: wrap; }
        .analytics-pills { display: flex; gap: var(--space-2); }
        .analytics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); }
        .analytics-stat { display: flex; flex-direction: column; gap: var(--space-2); }
        .text-positive { color: var(--success); font-weight: 600; }
        .table-wrap { overflow-x: auto; margin-top: 12px; }
        .data-table { width: 100%; border-collapse: collapse; text-align: left; }
        .data-table th, .data-table td { padding: 12px 10px; border-bottom: 1px solid var(--hairline); font-size: var(--text-sm); }
        .data-table th { color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--text-xs); }
      `}</style>
    </AuthGuard>
  );
}

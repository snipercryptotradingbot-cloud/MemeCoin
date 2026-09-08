'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CopyButton from '@/app/components/CopyButton';
import NetworkBadge from '@/app/components/NetworkBadge';
import { shortenAddress, getExplorerUrl, formatNumber } from '@/app/lib/solana';

// Seed realistic trending/mock tokens for discovery
const TRENDING_TOKENS = [
  {
    name: 'MoonPup',
    symbol: 'MPUP',
    mint: '7xVy8e9zQbK3dLm4wPnA2sDtFjGkH1i2o3p4q5r6s7t8',
    price: '$0.00241',
    change24h: '+34.2%',
    isPositive: true,
    volume: '$42,500',
    marketCap: '$2.4M',
    network: 'devnet',
    description: 'The first dog to build a spacecraft on Solana. Highly unhinged, fully fueled.',
    category: 'Meme'
  },
  {
    name: 'Rocket Cat',
    symbol: 'RCAT',
    mint: '3kLm4wPnA2sDtFjGkH1i2o3p4q5r6s7t87xVy8e9zQb',
    price: '$0.01085',
    change24h: '+54.8%',
    isPositive: true,
    volume: '$124,200',
    marketCap: '$10.8M',
    network: 'devnet',
    description: 'Cat-powered propulsion system for meme assets. Fast, purring, highly volatile.',
    category: 'Meme'
  },
  {
    name: 'Solana Doge',
    symbol: 'SDOGE',
    mint: 'GkH1i2o3p4q5r6s7t87xVy8e9zQb3kLm4wPnA2sDtFj',
    price: '$0.00076',
    change24h: '-8.3%',
    isPositive: false,
    volume: '$18,900',
    marketCap: '$760K',
    network: 'devnet',
    description: 'Traditional Doge but riding the high-speed Solana throughput. Very fast, much wow.',
    category: 'Meme'
  },
  {
    name: 'MemeMint Token',
    symbol: 'MINT',
    mint: 'DtFjGkH1i2o3p4q5r6s7t87xVy8e9zQb3kLm4wPnA2s',
    price: '$0.04520',
    change24h: '+12.4%',
    isPositive: true,
    volume: '$310,000',
    marketCap: '$45.2M',
    network: 'mainnet',
    description: 'The official platform utility token for MemeMint launchpad and AMM liquidity fees.',
    category: 'Utility'
  },
  {
    name: 'PepeSol',
    symbol: 'PEPES',
    mint: 'q5r6s7t87xVy8e9zQb3kLm4wPnA2sDtFjGkH1i2o3p4',
    price: '$0.000014',
    change24h: '+118.2%',
    isPositive: true,
    volume: '$89,300',
    marketCap: '$1.4M',
    network: 'devnet',
    description: 'Frog energy combined with Solana processing speeds. Completely decentralized.',
    category: 'Meme'
  },
  {
    name: 'Chill Toad',
    symbol: 'TOAD',
    mint: 'wPnA2sDtFjGkH1i2o3p4q5r6s7t87xVy8e9zQb3kLm4',
    price: '$0.00195',
    change24h: '-2.1%',
    isPositive: false,
    volume: '$7,800',
    marketCap: '$1.9M',
    network: 'devnet',
    description: 'Just a toad vibing on the blockchain. No roadmap, no utility, just pure chill.',
    category: 'Meme'
  }
];

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const refParam = searchParams.get('ref');

  useEffect(() => {
    if (refParam) {
      try { localStorage.setItem('mememint_ref', refParam); } catch {}
    }
  }, [refParam]);
  
  const [mintInput, setMintInput] = useState(searchParams.get('mint') || '');
  const [network, setNetwork] = useState(searchParams.get('network') || 'devnet');
  const [tokenInfo, setTokenInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentTokens, setRecentTokens] = useState([]);
  
  // Filtering & Sorting State
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [networkFilter, setNetworkFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('trending'); // trending, price_high, price_low, volume

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem('mememint_tokens') || '[]');
      setRecentTokens(stored);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const queryMint = searchParams.get('mint');
    if (queryMint) {
      handleSearch(queryMint);
    }
  }, [searchParams]);

  const handleSearch = async (mint) => {
    const address = mint || mintInput.trim();
    if (!address) return;

    // Check if it is a symbol from the mock list first to speed it up
    const matchedMock = TRENDING_TOKENS.find(t => t.symbol.toLowerCase() === address.toLowerCase() || t.mint.toLowerCase() === address.toLowerCase());
    
    setLoading(true);
    setError(null);
    setTokenInfo(null);

    try {
      // Fetch details from the API
      const res = await fetch(`/api/token-info?mint=${address}&network=${network}`);
      const data = await res.json();

      if (res.ok && data.token) {
        setTokenInfo(data.token);
      } else if (matchedMock) {
        // Fallback to mock data if token metadata fetch fails
        setTokenInfo({
          mint: matchedMock.mint,
          name: matchedMock.name,
          symbol: matchedMock.symbol,
          description: matchedMock.description,
          decimals: 9,
          supply: 1000000000,
          image: null,
          price: matchedMock.price,
          change24h: matchedMock.change24h,
          isPositive: matchedMock.isPositive
        });
      } else {
        throw new Error(data.error || 'Failed to fetch token info');
      }
    } catch (err) {
      if (matchedMock) {
        setTokenInfo({
          mint: matchedMock.mint,
          name: matchedMock.name,
          symbol: matchedMock.symbol,
          description: matchedMock.description,
          decimals: 9,
          supply: 1000000000,
          image: null,
          price: matchedMock.price,
          change24h: matchedMock.change24h,
          isPositive: matchedMock.isPositive
        });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  // Quick Card Trigger
  const handleSelectMockToken = (t) => {
    setMintInput(t.mint);
    setNetwork(t.network || 'devnet');
    // Update Router params for clean deep links
    router.push(`/explore?mint=${t.mint}&network=${t.network || 'devnet'}`);
  };

  const handleClearSearch = () => {
    setTokenInfo(null);
    setMintInput('');
    setError(null);
    router.push('/explore');
  };

  // Filter and Sort Mock Tokens
  const filteredTokens = TRENDING_TOKENS.filter(t => {
    const matchCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchNetwork = networkFilter === 'All' || t.network === networkFilter;
    return matchCategory && matchNetwork;
  }).sort((a, b) => {
    if (sortOrder === 'price_high') {
      return parseFloat(b.price.replace('$', '')) - parseFloat(a.price.replace('$', ''));
    }
    if (sortOrder === 'price_low') {
      return parseFloat(a.price.replace('$', '')) - parseFloat(b.price.replace('$', ''));
    }
    if (sortOrder === 'volume') {
      return parseFloat(b.volume.replace('$', '').replace(',', '')) - parseFloat(a.volume.replace('$', '').replace(',', ''));
    }
    return 0; // Default sorting (trending / alphabetical)
  });

  return (
    <div className="explore-page" id="explore-page">
      <div className="container">
        
        {/* Explore Header */}
        <header className="explore-header animate-fade-in">
          <div>
            <span className="section-label">DISCOVERY NETWORK</span>
            <h1 className="section-title">Explore Tokens</h1>
            <p className="section-desc">
              Discover newly launched meme coins, audit bonding curves, or look up specific mints.
            </p>
          </div>

          {/* Stats Chips */}
          <div className="explore-stats-chips">
            <div className="stats-chip">
              <span className="chip-indicator active" />
              <span className="chip-label">Total Coins: <strong>1,204</strong></span>
            </div>
            <div className="stats-chip">
              <span className="chip-indicator volume-indicator" />
              <span className="chip-label">24h Volume: <strong>45.8K SOL</strong></span>
            </div>
            <div className="stats-chip">
              <span className="chip-label">SOL Price: <strong>$138.42</strong></span>
            </div>
          </div>
        </header>

        {/* Search Bar */}
        <div className="search-container animate-fade-in-up">
          <div className="search-bar" id="search-bar">
            <div className="search-input-wrap">
              <span className="search-icon">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </span>
              <input
                className="input search-input"
                type="text"
                placeholder="Lookup token by mint address or symbol (e.g. MPUP)..."
                value={mintInput}
                onChange={(e) => setMintInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                id="input-search-mint"
              />
              <select
                className="search-network"
                value={network}
                onChange={(e) => setNetwork(e.target.value)}
                id="select-network"
              >
                <option value="devnet">Devnet</option>
                <option value="mainnet">Mainnet</option>
              </select>
            </div>
            
            <div className="search-actions">
              <button
                className="btn btn-primary"
                onClick={() => handleSearch()}
                disabled={loading}
                id="btn-search"
              >
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Search'}
              </button>
              {tokenInfo && (
                <button className="btn btn-secondary" onClick={handleClearSearch}>Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="explore-error animate-fade-in" id="search-error">
            <span className="explore-error-icon">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </span>
            {error}
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="explore-loading">
            <div className="spinner spinner-lg" />
            <p>Fetching token data from Solana RPC...</p>
          </div>
        )}

        {/* SEARCH RESULT DETAILS */}
        {tokenInfo && !loading && (
          <div className="token-result card animate-fade-in-up" id="token-result">
            <div className="token-result-header">
              {tokenInfo.image ? (
                <img src={tokenInfo.image} alt={tokenInfo.name} className="token-result-image" />
              ) : (
                <div className="token-result-avatar">
                  {tokenInfo.symbol[0]}
                </div>
              )}
              <div className="token-result-meta-top">
                <div className="token-result-title-row">
                  <h2 className="token-result-name">{tokenInfo.name}</h2>
                  <span className="badge badge-mint">${tokenInfo.symbol}</span>
                </div>
                <div className="token-badge-row">
                  <NetworkBadge network={network} />
                  {tokenInfo.price && (
                    <span className="result-price-tag">
                      {tokenInfo.price} <span className={tokenInfo.isPositive ? 'positive' : 'negative'}>{tokenInfo.change24h}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {tokenInfo.description && (
              <p className="token-result-desc">{tokenInfo.description}</p>
            )}

            <div className="token-result-stats">
              <div className="token-result-stat">
                <span className="stat-label">Total Supply</span>
                <span className="stat-value stat-mono">{formatNumber(tokenInfo.supply)}</span>
              </div>
              <div className="token-result-stat">
                <span className="stat-label">Decimals</span>
                <span className="stat-value stat-mono">{tokenInfo.decimals}</span>
              </div>
              <div className="token-result-stat">
                <span className="stat-label">Status</span>
                <span className="badge badge-primary">Bonding Curve Active</span>
              </div>
            </div>

            <div className="token-result-address">
              <span className="stat-label">Mint Address</span>
              <div className="mint-row">
                <span className="stat-mono address-string">
                  {tokenInfo.mint}
                </span>
                <CopyButton text={tokenInfo.mint} />
              </div>
            </div>

            <div className="token-result-actions">
              <a
                href={getExplorerUrl(tokenInfo.mint, 'token', network)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
              >
                View on Solscan ↗
              </a>
              <a href={`/liquidity?mint=${tokenInfo.mint}`} className="btn btn-mint">
                Provide Liquidity
              </a>
            </div>
          </div>
        )}

        {/* DISCOVERY GRID (Visible when no search token is active) */}
        {!tokenInfo && !loading && (
          <div className="discovery-surface animate-fade-in-up">
            
            {/* Filter Bar */}
            <div className="filter-bar">
              <h3 className="filter-bar-title">Trending Solana Tokens</h3>
              
              <div className="filter-controls">
                <div className="filter-control-group">
                  <span className="filter-label">Category:</span>
                  <select className="filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                    <option value="All">All Categories</option>
                    <option value="Meme">Meme Coins</option>
                    <option value="Utility">Utility Tokens</option>
                  </select>
                </div>

                <div className="filter-control-group">
                  <span className="filter-label">Sort:</span>
                  <select className="filter-select" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                    <option value="trending">Trending Hot</option>
                    <option value="price_high">Price: High to Low</option>
                    <option value="price_low">Price: Low to High</option>
                    <option value="volume">24h Vol</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Grid of Tokens */}
            <div className="token-grid">
              {filteredTokens.map((token, index) => (
                <div key={index} className="token-card card-interactive card">
                  <div className="token-card-header">
                    <div className="token-card-avatar" style={{ backgroundColor: `var(--bg-surface-strong)` }}>
                      {token.symbol[0]}
                    </div>
                    <div className="token-card-titles">
                      <div className="token-card-name-row">
                        <h4 className="token-card-name">{token.name}</h4>
                        <span className="token-card-symbol">${token.symbol}</span>
                      </div>
                      <span className="token-card-mint-short stat-mono">{shortenAddress(token.mint)}</span>
                    </div>
                  </div>

                  <p className="token-card-description">{token.description}</p>
                  
                  <div className="divider" style={{ margin: '12px 0' }} />

                  <div className="token-card-metrics">
                    <div className="metric">
                      <span className="metric-label">Price</span>
                      <span className="metric-val stat-mono">{token.price}</span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">24h Change</span>
                      <span className={`metric-val stat-mono ${token.isPositive ? 'positive' : 'negative'}`}>
                        {token.change24h}
                      </span>
                    </div>
                    <div className="metric">
                      <span className="metric-label">24h Volume</span>
                      <span className="metric-val stat-mono">{token.volume}</span>
                    </div>
                  </div>

                  <div className="token-card-actions">
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleSelectMockToken(token)}
                    >
                      Audit token
                    </button>
                    <a href={`/liquidity?mint=${token.mint}`} className="btn btn-mint btn-sm">
                      Liquidity
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* Client-side Recent Lookup Tokens */}
            {recentTokens.length > 0 && (
              <div className="recent-section" id="recent-tokens">
                <h3 className="recent-title">Recently Created</h3>
                <div className="recent-list">
                  {recentTokens.map((t, i) => (
                    <button
                      key={i}
                      className="recent-item card-interactive"
                      onClick={() => {
                        setMintInput(t.mint);
                        setNetwork(t.network || 'devnet');
                        handleSearch(t.mint);
                      }}
                    >
                      <div className="recent-item-left">
                        <div className="recent-img-placeholder">
                          {t.symbol[0]}
                        </div>
                        <div>
                          <span className="recent-name">{t.name}</span>
                          <span className="recent-symbol">${t.symbol}</span>
                        </div>
                      </div>
                      <div className="recent-item-right">
                        <span className="recent-address stat-mono">{shortenAddress(t.mint)}</span>
                        <NetworkBadge network={t.network || 'devnet'} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      <style jsx>{`
        .explore-page {
          padding: var(--space-12) 0 var(--space-24);
          background: var(--bg-canvas);
        }

        .explore-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: var(--space-6);
          margin-bottom: var(--space-10);
          flex-wrap: wrap;
        }

        .explore-stats-chips {
          display: flex;
          gap: var(--space-2);
          flex-wrap: wrap;
        }

        .stats-chip {
          display: inline-flex;
          align-items: center;
          gap: var(--space-2);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-pill);
          padding: 6px 14px;
          font-size: var(--text-xs);
          color: var(--body);
        }

        .chip-indicator {
          width: 6px;
          height: 6px;
          border-radius: var(--radius-full);
        }

        .chip-indicator.active { background: var(--success); }
        .chip-indicator.volume-indicator { background: var(--brand-pink); }

        .search-container {
          margin-bottom: var(--space-8);
        }

        .search-bar {
          display: flex;
          gap: var(--space-3);
        }

        .search-input-wrap {
          flex: 1;
          display: flex;
          align-items: center;
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          overflow: hidden;
          transition: all var(--transition-fast);
          padding-left: var(--space-3);
        }

        .search-icon {
          color: var(--muted);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .search-input-wrap:focus-within {
          border-color: var(--brand-mint);
          box-shadow: 0 0 0 3px rgba(60, 255, 208, 0.15);
        }

        .search-input {
          border: none !important;
          background: transparent !important;
          box-shadow: none !important;
          flex: 1;
          padding: var(--space-3) var(--space-3);
        }

        .search-network {
          background: var(--bg-surface-soft);
          border: none;
          border-left: 1px solid var(--hairline);
          color: var(--body);
          font-family: var(--font-sans);
          font-size: var(--text-sm);
          padding: 0 var(--space-4);
          cursor: pointer;
          outline: none;
          height: 100%;
        }

        .search-actions {
          display: flex;
          gap: var(--space-2);
        }

        .explore-error {
          padding: var(--space-4);
          background: rgba(239, 68, 68, 0.05);
          border: 1px solid rgba(239, 68, 68, 0.15);
          border-radius: var(--radius-md);
          color: var(--error);
          font-size: var(--text-sm);
          margin-bottom: var(--space-6);
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .explore-error-icon {
          display: flex;
        }

        .explore-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-4);
          padding: var(--space-16) 0;
          color: var(--muted);
          font-size: var(--text-sm);
        }

        /* TOKEN RESULT VIEW */
        .token-result {
          padding: var(--space-8);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .token-result-header {
          display: flex;
          align-items: center;
          gap: var(--space-4);
        }

        .token-result-image {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          object-fit: cover;
          border: 1px solid var(--hairline);
        }

        .token-result-avatar {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-lg);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-2xl);
          font-weight: 700;
          color: var(--brand-pink);
        }

        .token-result-meta-top {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .token-result-title-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .token-result-name {
          font-size: var(--text-xl);
          font-weight: 800;
          color: var(--ink);
        }

        .token-badge-row {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }

        .result-price-tag {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--ink);
        }

        .result-price-tag span {
          margin-left: var(--space-1);
          font-size: var(--text-xs);
        }

        .token-result-desc {
          font-size: var(--text-sm);
          color: var(--body);
          line-height: 1.6;
        }

        .token-result-stats {
          display: flex;
          gap: var(--space-8);
          padding-bottom: var(--space-6);
          border-bottom: 1px solid var(--hairline);
        }

        .token-result-stat {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stat-label {
          font-size: 10px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 600;
          font-family: var(--font-mono);
        }

        .stat-value {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--ink);
        }

        .stat-mono {
          font-family: var(--font-mono);
        }

        .token-result-address {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }

        .mint-row {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .address-string {
          font-size: var(--text-sm);
          word-break: break-all;
          color: var(--body);
        }

        .token-result-actions {
          display: flex;
          gap: var(--space-3);
        }

        /* DISCOVERY SURFACE & FILTER BAR */
        .discovery-surface {
          margin-top: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-6);
        }

        .filter-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--hairline);
          padding-bottom: var(--space-3);
          flex-wrap: wrap;
          gap: var(--space-3);
        }

        .filter-bar-title {
          font-size: var(--text-lg);
          font-weight: 700;
          color: var(--ink);
        }

        .filter-controls {
          display: flex;
          gap: var(--space-4);
        }

        .filter-control-group {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .filter-label {
          font-size: var(--text-xs);
          color: var(--muted);
          font-weight: 500;
        }

        .filter-select {
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-sm);
          color: var(--ink);
          font-size: var(--text-xs);
          font-weight: 600;
          padding: 4px 8px;
          cursor: pointer;
          outline: none;
        }

        /* TOKEN DISCOVERY CARDS */
        .token-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: var(--space-4);
        }

        .token-card {
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-xl);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .token-card-header {
          display: flex;
          gap: var(--space-3);
          align-items: center;
        }

        .token-card-avatar {
          width: 42px;
          height: 42px;
          border-radius: var(--radius-md);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: var(--brand-pink);
          flex-shrink: 0;
          border: 1px solid var(--hairline);
        }

        .token-card-titles {
          display: flex;
          flex-direction: column;
          min-width: 0;
        }

        .token-card-name-row {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }

        .token-card-name {
          font-size: var(--text-sm);
          font-weight: 700;
          color: var(--ink);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .token-card-symbol {
          font-size: var(--text-xs);
          color: var(--muted);
          font-weight: 500;
        }

        .token-card-mint-short {
          font-size: 10px;
          color: var(--muted);
        }

        .token-card-description {
          font-size: var(--text-xs);
          color: var(--body);
          line-height: 1.5;
          margin-top: var(--space-3);
          margin-bottom: var(--space-2);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          min-height: 36px;
        }

        .token-card-metrics {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-2);
          margin-bottom: var(--space-4);
        }

        .metric {
          display: flex;
          flex-direction: column;
        }

        .metric-label {
          font-size: 9px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .metric-val {
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--ink);
        }

        .positive { color: var(--success) !important; }
        .negative { color: var(--error) !important; }

        .token-card-actions {
          display: flex;
          gap: var(--space-2);
        }

        .token-card-actions .btn {
          flex: 1;
        }

        /* RECENT ITEMS */
        .recent-section {
          margin-top: var(--space-8);
        }

        .recent-title {
          font-size: var(--text-base);
          font-weight: 700;
          color: var(--ink);
          margin-bottom: var(--space-3);
        }

        .recent-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .recent-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-3) var(--space-4);
          background: var(--bg-canvas);
          border: 1px solid var(--hairline);
          border-radius: var(--radius-md);
          cursor: pointer;
          width: 100%;
          font-family: var(--font-sans);
          transition: all var(--transition-base);
        }

        .recent-item:hover {
          border-color: var(--brand-mint);
          background: var(--bg-surface-soft);
        }

        .recent-item-left {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .recent-img-placeholder {
          width: 28px;
          height: 28px;
          border-radius: var(--radius-sm);
          background: var(--bg-surface-soft);
          border: 1px solid var(--hairline);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: var(--text-xs);
          font-weight: 700;
          color: var(--brand-pink);
        }

        .recent-name {
          font-size: var(--text-xs);
          font-weight: 600;
          color: var(--ink);
          display: block;
        }

        .recent-symbol {
          font-size: 10px;
          color: var(--muted);
        }

        .recent-item-right {
          display: flex;
          align-items: center;
          gap: var(--space-3);
        }

        .recent-address {
          font-size: 10px;
          color: var(--muted);
        }

        @media (max-width: 768px) {
          .explore-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .search-bar {
            flex-direction: column;
          }

          .search-actions {
            width: 100%;
          }

          .search-actions .btn {
            flex: 1;
          }

          .token-result-stats {
            flex-direction: column;
            gap: var(--space-4);
          }

          .recent-item-right {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div style={{ display: 'flex', justifyContent: 'center', padding: '120px 0' }}>
        <div className="spinner spinner-lg" />
      </div>
    }>
      <ExploreContent />
    </Suspense>
  );
}

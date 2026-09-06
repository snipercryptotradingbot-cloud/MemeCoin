-- Migration: 0005_liquidity_enhancements
-- Adds on-chain curve tracking, user positions, and activity log

-- Expand liquidity_pools with on-chain curve data
ALTER TABLE liquidity_pools ADD COLUMN curve_address TEXT;
ALTER TABLE liquidity_pools ADD COLUMN token_vault TEXT;
ALTER TABLE liquidity_pools ADD COLUMN sol_vault TEXT;
ALTER TABLE liquidity_pools ADD COLUMN token_reserves REAL DEFAULT 0;
ALTER TABLE liquidity_pools ADD COLUMN fee_tier TEXT DEFAULT '1.0%';
ALTER TABLE liquidity_pools ADD COLUMN creator_wallet TEXT;
ALTER TABLE liquidity_pools ADD COLUMN status TEXT DEFAULT 'active';
ALTER TABLE liquidity_pools ADD COLUMN total_swaps INTEGER DEFAULT 0;
ALTER TABLE liquidity_pools ADD COLUMN initial_sol_target REAL DEFAULT 85;

-- Per-user liquidity positions (wallet-based)
CREATE TABLE IF NOT EXISTS user_liquidity_positions (
    id TEXT PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    pool_id TEXT NOT NULL,
    sol_deposited REAL DEFAULT 0,
    tokens_deposited REAL DEFAULT 0,
    lp_tokens REAL DEFAULT 0,
    action TEXT NOT NULL,
    tx_signature TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (pool_id) REFERENCES liquidity_pools(id)
);

-- Activity log (wallet-based, no auth required)
CREATE TABLE IF NOT EXISTS liquidity_activity_log (
    id TEXT PRIMARY KEY,
    user_wallet TEXT NOT NULL,
    pool_id TEXT NOT NULL,
    action TEXT NOT NULL,
    sol_amount REAL,
    token_amount REAL,
    tx_signature TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_positions_wallet ON user_liquidity_positions(user_wallet);
CREATE INDEX IF NOT EXISTS idx_positions_pool ON user_liquidity_positions(pool_id);
CREATE INDEX IF NOT EXISTS idx_activity_wallet ON liquidity_activity_log(user_wallet);
CREATE INDEX IF NOT EXISTS idx_activity_pool ON liquidity_activity_log(pool_id);
CREATE INDEX IF NOT EXISTS idx_pool_creator ON liquidity_pools(creator_wallet);
CREATE INDEX IF NOT EXISTS idx_pool_status ON liquidity_pools(status);

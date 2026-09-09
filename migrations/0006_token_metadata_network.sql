-- Migration 0006: Extend tokens with rich metadata + add network to liquidity_pools

-- Tokens table: richer metadata
ALTER TABLE tokens ADD COLUMN decimals INTEGER DEFAULT 9;
ALTER TABLE tokens ADD COLUMN total_supply TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN description TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN website TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN twitter TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN telegram TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN status TEXT DEFAULT 'curve';
ALTER TABLE tokens ADD COLUMN updated_at DATETIME;

-- Liquidity pools: add network for filtering
ALTER TABLE liquidity_pools ADD COLUMN network TEXT DEFAULT 'devnet';

-- Unique index: one pool per token
CREATE UNIQUE INDEX IF NOT EXISTS idx_liquidity_pools_token ON liquidity_pools(token_id);

-- Index for network-filtered token queries
CREATE INDEX IF NOT EXISTS idx_tokens_network ON tokens(network);

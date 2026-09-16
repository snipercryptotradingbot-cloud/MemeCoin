-- Migration 0009: Fix broken foreign keys on all tables referencing users
-- Migration 0004 renamed users -> users_old which corrupted all FK references.
-- SQLite updated FK metadata to point to users_old, then users_old was dropped.

-- ===== Fix analytics_events =====
CREATE TABLE IF NOT EXISTS analytics_events_new (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    token_id TEXT,
    user_id TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT INTO analytics_events_new SELECT * FROM analytics_events;
DROP TABLE analytics_events;
ALTER TABLE analytics_events_new RENAME TO analytics_events;
CREATE INDEX IF NOT EXISTS idx_analytics_token ON analytics_events(token_id);
CREATE INDEX IF NOT EXISTS idx_analytics_type ON analytics_events(event_type);

-- ===== Fix admin_audit_logs =====
CREATE TABLE IF NOT EXISTS admin_audit_logs_new (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT NOT NULL,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
);
INSERT INTO admin_audit_logs_new SELECT * FROM admin_audit_logs;
DROP TABLE admin_audit_logs;
ALTER TABLE admin_audit_logs_new RENAME TO admin_audit_logs;

-- ===== Fix user_activities =====
CREATE TABLE IF NOT EXISTS user_activities_new (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target TEXT,
    metadata TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
INSERT INTO user_activities_new SELECT * FROM user_activities;
DROP TABLE user_activities;
ALTER TABLE user_activities_new RENAME TO user_activities;

-- ===== Fix tokens =====
CREATE TABLE IF NOT EXISTS tokens_new (
    id TEXT PRIMARY KEY,
    mint_address TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    bonding_curve_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    image TEXT DEFAULT '',
    metadata_uri TEXT DEFAULT '',
    network TEXT DEFAULT 'devnet',
    decimals INTEGER DEFAULT 9,
    total_supply TEXT DEFAULT '',
    description TEXT DEFAULT '',
    website TEXT DEFAULT '',
    twitter TEXT DEFAULT '',
    telegram TEXT DEFAULT '',
    status TEXT DEFAULT 'curve',
    updated_at DATETIME,
    FOREIGN KEY (creator_id) REFERENCES users(id)
);
INSERT INTO tokens_new (id, mint_address, name, symbol, creator_id, bonding_curve_address, created_at,
    image, metadata_uri, network, decimals, total_supply, description, website, twitter, telegram, status, updated_at)
SELECT id, mint_address, name, symbol, creator_id, bonding_curve_address, created_at,
    COALESCE(image, ''), COALESCE(metadata_uri, ''), COALESCE(network, 'devnet'),
    COALESCE(decimals, 9), COALESCE(total_supply, ''), COALESCE(description, ''),
    COALESCE(website, ''), COALESCE(twitter, ''), COALESCE(telegram, ''),
    COALESCE(status, 'curve'), updated_at
FROM tokens;
DROP TABLE tokens;
ALTER TABLE tokens_new RENAME TO tokens;
CREATE INDEX IF NOT EXISTS idx_tokens_creator ON tokens(creator_id);
CREATE INDEX IF NOT EXISTS idx_tokens_network ON tokens(network);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tokens_mint ON tokens(mint_address);

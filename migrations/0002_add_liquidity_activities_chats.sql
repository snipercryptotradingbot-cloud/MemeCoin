-- Migration: 0002_add_liquidity_activities_chats
-- Adds liquidity, user activity, and chat-related tables

CREATE TABLE IF NOT EXISTS liquidity_pools (
    id TEXT PRIMARY KEY,
    token_id TEXT NOT NULL,
    pool_address TEXT,
    bonding_curve_progress REAL DEFAULT 0,
    sol_accumulated REAL DEFAULT 0,
    sol_target REAL DEFAULT 85,
    is_migrated INTEGER DEFAULT 0,
    amm TEXT,
    lp_burned INTEGER DEFAULT 0,
    transaction_signature TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (token_id) REFERENCES tokens(id)
);

CREATE TABLE IF NOT EXISTS user_activities (
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

CREATE TABLE IF NOT EXISTS chats (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_wallet TEXT NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_rooms (
    id TEXT PRIMARY KEY,
    room_name TEXT,
    room_type TEXT DEFAULT 'public',
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_liquidity_token ON liquidity_pools(token_id);
CREATE INDEX IF NOT EXISTS idx_activities_user ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_action ON user_activities(action);
CREATE INDEX IF NOT EXISTS idx_chats_room ON chats(room_id);

-- Migration: 0005_social
-- Social platform: profiles, follows, notifications, referrals, payouts

-- Extend users table
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN connected_wallet TEXT;
ALTER TABLE users ADD COLUMN preferences TEXT DEFAULT '{}';
ALTER TABLE users ADD COLUMN credits_balance INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN last_login_at DATETIME;
ALTER TABLE users ADD COLUMN updated_at DATETIME;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Follows (users follow users + tokens)
CREATE TABLE IF NOT EXISTS follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK(target_type IN ('user', 'token')),
    target_id TEXT NOT NULL,
    target_name TEXT DEFAULT '',
    target_image TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(follower_id, target_type, target_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_target ON follows(target_type, target_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL,
    actor_id TEXT DEFAULT '',
    title TEXT NOT NULL,
    body TEXT DEFAULT '',
    link TEXT DEFAULT '',
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- Referrals (Promote & Earn)
CREATE TABLE IF NOT EXISTS referrals (
    id TEXT PRIMARY KEY,
    promoter_id TEXT NOT NULL,
    referred_id TEXT DEFAULT '',
    token_mint TEXT DEFAULT '',
    buyer_id TEXT DEFAULT '',
    sol_amount REAL DEFAULT 0,
    platform_fee REAL DEFAULT 0,
    promoter_cut REAL DEFAULT 0,
    tx_signature TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_referrals_promoter ON referrals(promoter_id);

-- Payout requests (credits → creation fee)
CREATE TABLE IF NOT EXISTS payout_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount_lamports INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processed')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payouts_user ON payout_requests(user_id);

-- Extend tokens table with image and metadata for My Tokens display
ALTER TABLE tokens ADD COLUMN image TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN metadata_uri TEXT DEFAULT '';
ALTER TABLE tokens ADD COLUMN network TEXT DEFAULT 'devnet';

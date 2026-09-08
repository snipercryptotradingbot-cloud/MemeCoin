-- Migration: 0004_email_password_auth
-- Add email/password authentication support

-- Make wallet_address nullable for email/password users
ALTER TABLE users RENAME TO users_old;
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    password_hash TEXT,
    avatar TEXT,
    wallet_address TEXT,
    provider TEXT DEFAULT 'email' CHECK(provider IN ('email', 'google', 'wallet')),
    role TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO users (id, wallet_address, role, created_at) SELECT id, wallet_address, role, created_at FROM users_old;
DROP TABLE users_old;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Migration: 0003_chat_enhancements
-- Adds reactions, read receipts, and room metadata for pro chat UX

ALTER TABLE chat_rooms ADD COLUMN last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE chat_rooms ADD COLUMN member_count INTEGER DEFAULT 0;
ALTER TABLE chat_rooms ADD COLUMN topic TEXT DEFAULT '';
ALTER TABLE chat_rooms ADD COLUMN is_pinned INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS chat_reactions (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reaction TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (message_id) REFERENCES chats(id),
    UNIQUE(message_id, user_id, reaction)
);

CREATE TABLE IF NOT EXISTS chat_read_receipts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    last_read_message_id TEXT,
    last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, room_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_read_receipts_room ON chat_read_receipts(room_id);
CREATE INDEX IF NOT EXISTS idx_chats_room_created ON chats(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(last_active_at);
-- Migration: 0004_fix_chat_indexes
-- Fixes the broken index from 0003 and creates the remaining ones

CREATE INDEX IF NOT EXISTS idx_read_receipts_room ON chat_read_receipts(room_id);
CREATE INDEX IF NOT EXISTS idx_chats_room_created ON chats(room_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_active ON chat_rooms(last_active_at);

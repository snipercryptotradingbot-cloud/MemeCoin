-- Migration 0007: One reaction per user per message
-- Deduplicate existing rows keeping the earliest reaction per (message_id, user_id),
-- then enforce UNIQUE(message_id, user_id) via table rebuild.

-- Step 1: Find and delete duplicate rows, keeping the earliest by created_at
DELETE FROM chat_reactions
WHERE rowid NOT IN (
  SELECT MIN(rowid)
  FROM chat_reactions
  GROUP BY message_id, user_id
);

-- Step 2: Recreate table with UNIQUE(message_id, user_id)
CREATE TABLE chat_reactions_new (
  id TEXT PRIMARY KEY,
  message_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  reaction TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES chats(id),
  UNIQUE(message_id, user_id)
);

INSERT INTO chat_reactions_new (id, message_id, user_id, reaction, created_at)
  SELECT id, message_id, user_id, reaction, created_at
  FROM chat_reactions;

DROP TABLE chat_reactions;
ALTER TABLE chat_reactions_new RENAME TO chat_reactions;

CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON chat_reactions(user_id);

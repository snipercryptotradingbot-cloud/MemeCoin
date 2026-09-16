-- Migration 0007: One reaction per user per message
-- Rebuild chat_reactions with UNIQUE(message_id, user_id), keeping earliest row per group.

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
  SELECT cr.id, cr.message_id, cr.user_id, cr.reaction, cr.created_at
  FROM chat_reactions cr
  INNER JOIN (
    SELECT message_id, user_id, MIN(rowid) AS min_rowid
    FROM chat_reactions
    GROUP BY message_id, user_id
  ) dup ON cr.rowid = dup.min_rowid;

DROP TABLE chat_reactions;
ALTER TABLE chat_reactions_new RENAME TO chat_reactions;

CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON chat_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON chat_reactions(user_id);

-- Smart Inbox Sources Table
-- Stores external tasks from different sources before they are converted to actual tasks

CREATE TABLE IF NOT EXISTS smart_inbox_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK(source_type IN ('calendar', 'email', 'slack', 'github', 'manual', 'integration')),
  external_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  priority TEXT DEFAULT 'medium' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
  confidence INTEGER DEFAULT 50 CHECK(confidence BETWEEN 0 AND 100),
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'converted', 'dismissed')),
  priority_score INTEGER DEFAULT 50,
  metadata TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, source_type, external_id)
);

-- Index for faster lookups by source type
CREATE INDEX IF NOT EXISTS idx_smart_inbox_source_type ON smart_inbox_sources(source_type);

-- Index for pending items
CREATE INDEX IF NOT EXISTS idx_smart_inbox_pending ON smart_inbox_sources(status) WHERE status = 'pending';

-- Index for priority score ordering
CREATE INDEX IF NOT EXISTS idx_smart_inbox_priority ON smart_inbox_sources(priority_score DESC);

-- Index for user's inbox items
CREATE INDEX IF NOT EXISTS idx_smart_inbox_user ON smart_inbox_sources(user_id, status);
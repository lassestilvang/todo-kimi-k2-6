-- Migration 013: Task marketplace tables

-- Create task marketplace table
CREATE TABLE IF NOT EXISTS task_marketplace (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  seller_id INTEGER NOT NULL,
  price_xp INTEGER DEFAULT 0,
  estimated_hours INTEGER DEFAULT 1,
  required_skills TEXT,
  status TEXT DEFAULT 'available',
  claimed_by INTEGER,
  category TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id),
  FOREIGN KEY (seller_id) REFERENCES users(id),
  FOREIGN KEY (claimed_by) REFERENCES users(id)
);

-- Create XP transfers table
CREATE TABLE IF NOT EXISTS xp_transfers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER,
  to_user_id INTEGER NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT,
  related_task_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id),
  FOREIGN KEY (related_task_id) REFERENCES tasks(id)
);

-- Create skill requirements table
CREATE TABLE IF NOT EXISTS skill_marketplace_listings (
  listing_id INTEGER NOT NULL,
  skill_name TEXT NOT NULL,
  PRIMARY KEY (listing_id, skill_name),
  FOREIGN KEY (listing_id) REFERENCES task_marketplace(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_marketplace_status ON task_marketplace(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON task_marketplace(seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_claimed_by ON task_marketplace(claimed_by);
CREATE INDEX IF NOT EXISTS idx_marketplace_category ON task_marketplace(category);
CREATE INDEX IF NOT EXISTS idx_xp_transfers_to ON xp_transfers(to_user_id);
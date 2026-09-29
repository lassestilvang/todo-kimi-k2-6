-- Migration 012: Gamification tables

-- Create achievements table
CREATE TABLE IF NOT EXISTS achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  achievement_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  badge_icon TEXT,
  badge_color TEXT,
  xp_reward INTEGER DEFAULT 0,
  unlocked_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, achievement_type),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create user XP table
CREATE TABLE IF NOT EXISTS user_xp (
  user_id INTEGER PRIMARY KEY,
  total_xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  rank TEXT DEFAULT 'Bronze',
  last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create XP activity log
CREATE TABLE IF NOT EXISTS xp_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  xp_amount INTEGER NOT NULL,
  reason TEXT,
  source_type TEXT,
  source_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create daily challenges
CREATE TABLE IF NOT EXISTS daily_challenges (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  challenge_type TEXT NOT NULL,
  description TEXT,
  target_value INTEGER,
  current_value INTEGER DEFAULT 0,
  xp_reward INTEGER DEFAULT 50,
  completed INTEGER DEFAULT 0,
  expires_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_achievements_user ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_xp_activity_user ON xp_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_user ON daily_challenges(user_id);
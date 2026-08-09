-- Enhanced Productivity Features Migration
-- Adds support for cognitive load tracking, energy budgets, cross-app sync, and decision analysis

-- Cognitive Load Log: Track user's cognitive state throughout the day
CREATE TABLE IF NOT EXISTS cognitive_load_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  task_count INTEGER DEFAULT 0,
  completed_count INTEGER DEFAULT 0,
  avg_time_to_complete REAL,
  energy_level INTEGER CHECK (energy_level BETWEEN 1 AND 10),
  distraction_score REAL CHECK (distraction_score BETWEEN 0 AND 1),
  focus_blocks INTEGER DEFAULT 0,
  interruption_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- User Energy Profiles: Store user's energy patterns and preferences
CREATE TABLE IF NOT EXISTS user_energy_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  wake_hour INTEGER DEFAULT 7,
  sleep_hour INTEGER DEFAULT 23,
  work_start_hour INTEGER DEFAULT 9,
  work_end_hour INTEGER DEFAULT 17,
  peak_energy_times TEXT, -- JSON array of {start: "HH:MM", end: "HH:MM"}
  energy_levels TEXT, -- JSON array of {time: "HH:MM", level: 1-5, type: "morning_energy"|...}
  fatigue_sensitivity INTEGER DEFAULT 5, -- 1-10 scale
  recovery_time_minutes INTEGER DEFAULT 15,
  preferred_break_duration INTEGER DEFAULT 5,
  energy_budget_daily INTEGER DEFAULT 100, -- Daily energy points budget
  recovery_activities TEXT, -- JSON array of activity names that restore energy
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Energy Budget Log: Track energy spent and recovered throughout the day
CREATE TABLE IF NOT EXISTS energy_budget_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  energy_spent INTEGER DEFAULT 0,
  energy_recovered INTEGER DEFAULT 0,
  current_balance INTEGER DEFAULT 100,
  activities TEXT, -- JSON array of {task_id: number, energy_cost: number, timestamp: string}
  recovery_activities TEXT, -- JSON array of {activity: string, energy_restored: number, timestamp: string}
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Cross-App Sync Connections: Track external task sources
CREATE TABLE IF NOT EXISTS cross_app_sync_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_type TEXT NOT NULL, -- "trello", "notion", "asana", "clickup", etc.
  app_name TEXT NOT NULL, -- User-friendly name
  api_key_encrypted TEXT, -- Encrypted API key or token
  auth_config TEXT, -- JSON config for OAuth, etc.
  sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('import', 'export', 'bidirectional')),
  sync_frequency_minutes INTEGER DEFAULT 60,
  enabled INTEGER DEFAULT 1,
  last_sync_at TEXT,
  error_count INTEGER DEFAULT 0,
  last_error TEXT,
  field_mappings TEXT, -- JSON mapping of field names between apps
  conflict_resolution_strategy TEXT DEFAULT 'prefer_latest' CHECK (conflict_resolution_strategy IN ('prefer_latest', 'prefer_local', 'prefer_remote', 'prompt_user')),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, app_type, app_name)
);

-- Cross-App External Tasks: Cache external tasks before conversion
CREATE TABLE IF NOT EXISTS external_tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sync_connection_id INTEGER REFERENCES cross_app_sync_connections(id),
  external_id TEXT NOT NULL, -- ID from the external app
  external_app_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low', 'none')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'converted', 'dismissed', 'synced', 'conflict')),
  energy_cost_estimate INTEGER DEFAULT 5, -- Estimated cognitive energy cost
  confidence INTEGER DEFAULT 50 CHECK (confidence BETWEEN 0 AND 100),
  source_url TEXT, -- Link back to external task
  external_metadata TEXT, -- JSON with additional external data
  sync_metadata TEXT, -- JSON with sync-specific data like version, hash
  local_task_id INTEGER REFERENCES tasks(id),
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, external_app_type, external_id)
);

-- External Task Sync History: Track sync operations
CREATE TABLE IF NOT EXISTS external_task_sync_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sync_connection_id INTEGER REFERENCES cross_app_sync_connections(id),
  operation TEXT NOT NULL CHECK (operation IN ('import', 'update', 'conflict', 'error')),
  external_id TEXT NOT NULL,
  title TEXT,
  status TEXT,
  energy_cost INTEGER DEFAULT 0,
  error_message TEXT,
  resolution TEXT, -- How conflict was resolved
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Decision Shadows: Track alternatives and opportunity costs
CREATE TABLE IF NOT society_decision_shadows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_task_id INTEGER REFERENCES tasks(id), -- Optional: link to related task
  decision_type TEXT NOT NULL, -- "priority", "approach", "tool", "timeline", "allocation", "cancellation", "feature"
  question TEXT NOT NULL,
  chosen_option_id INTEGER, -- References to decision_options
  chosen_option_text TEXT,
  rationale TEXT,
  opportunity_cost TEXT, -- What was given up
  outcome TEXT,
  outcome_rating INTEGER CHECK (outcome_rating BETWEEN -1 AND 1), -- -1 = terrible, 1 = excellent
  alternative_options TEXT, -- JSON array of all considered options
  time_spent_minutes INTEGER DEFAULT 0,
  context_tags TEXT, -- JSON array of context tags
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Decision Options: All options considered for decisions
CREATE TABLE IF NOT EXISTS decision_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  decision_shadow_id INTEGER NOT NULL REFERENCES decision_shadows(id) ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  pros TEXT, -- JSON array of pro strings
  cons TEXT, -- JSON array of con strings
  estimated_impact INTEGER CHECK (estimated_impact BETWEEN 1 AND 10),
  estimated_effort INTEGER CHECK (estimated_effort BETWEEN 1 AND 10),
  was_chosen INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Mood Context: Track user's mood state
CREATE TABLE IF NOT EXISTS mood_contexts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  mood INTEGER CHECK (mood BETWEEN 1 AND 5), -- 1 = very negative, 5 = very positive
  energy INTEGER CHECK (energy BETWEEN 1 AND 5), -- 1 = low, 5 = high
  stress INTEGER CHECK (stress BETWEEN 1 AND 5), -- 1 = low, 5 = high
  focus INTEGER CHECK (focus BETWEEN 1 AND 5), -- 1 = scattered, 5 = deep focus
  notes TEXT,
  tasks_filtered TEXT, -- JSON array of task IDs that were highlighted
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, date)
);

-- Mood-Task Associations: Track which tasks were done in what mood
CREATE TABLE IF NOT EXISTS mood_task_associations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  mood_id INTEGER REFERENCES mood_contexts(id),
  mood_rating_at_completion INTEGER CHECK (mood_rating_at_completion BETWEEN 1 AND 5),
  context_notes TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cognitive_load_user_date ON cognitive_load_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_energy_profile_user ON user_energy_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_energy_budget_user_date ON energy_budget_logs(user_id, date);
CREATE INDEX IF NOT EXISTS idx_external_sync_user_app ON cross_app_sync_connections(user_id, app_type);
CREATE INDEX IF NOT EXISTS idx_external_tasks_user_status ON external_tasks(user_id, status);
CREATE INDEX IF NOT EXISTS idx_external_tasks_local_task ON external_tasks(local_task_id);
CREATE INDEX IF NOT EXISTS idx_external_sync_history_user_date ON external_task_sync_history(user_id, date);
CREATE INDEX IF NOT EXISTS idx_decision_shadows_user_type ON decision_shadows(user_id, decision_type);
CREATE INDEX IF NOT EXISTS idx_mood_contexts_user_date ON mood_contexts(user_id, date);
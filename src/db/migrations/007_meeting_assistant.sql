-- Migration 007: Meeting Assistant feature
-- Adds tables for storing meeting notes and action items

-- Create meeting notes table
CREATE TABLE IF NOT EXISTS meeting_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  date TEXT,
  participants TEXT,
  action_items TEXT,
  decisions TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create action items table
CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_notes_id INTEGER NOT NULL,
  description TEXT NOT NULL,
  assigned_to INTEGER,
  due_date TEXT,
  priority TEXT DEFAULT 'medium',
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (meeting_notes_id) REFERENCES meeting_notes(id),
  FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Create index for faster action item queries
CREATE INDEX IF NOT EXISTS idx_action_items_meeting ON action_items(meeting_notes_id);
CREATE INDEX IF NOT EXISTS idx_action_items_due ON action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_meeting_notes_user ON meeting_notes(user_id);

-- Migration 008: Risk assessment tables
-- Adds tables for predictive risk analysis

-- Create risk assessments table
CREATE TABLE IF NOT EXISTS risk_assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  task_id INTEGER,
  risk_type TEXT NOT NULL,
  risk_score REAL NOT NULL,
  risk_level TEXT NOT NULL,
  probability INTEGER NOT NULL,
  impact INTEGER NOT NULL,
  factors TEXT,
  mitigation TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Create risk alerts table
CREATE TABLE IF NOT EXISTS risk_alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  risk_assessment_id INTEGER,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  triggered_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(id)
);

-- Create confidence scores table for AI tasks
CREATE TABLE IF NOT EXISTS ai_confidence_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id INTEGER NOT NULL,
  ai_provider TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  improvement_score REAL DEFAULT 0,
  reviewed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Create index for risk queries
CREATE INDEX IF NOT EXISTS idx_risk_assessments_user ON risk_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_risk_assessments_task ON risk_assessments(task_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_user ON risk_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_confidence_task ON ai_confidence_scores(task_id);
-- Workflow Builder Migration
-- Adds support for no-code automation workflows

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config TEXT,
  action_type TEXT NOT NULL,
  action_config TEXT,
  condition_json TEXT,
  enabled INTEGER DEFAULT 1,
  run_count INTEGER DEFAULT 0,
  last_run_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Workflow executions table - tracks each run
CREATE TABLE IF NOT EXISTS workflow_executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
  triggered_at TEXT NOT NULL,
  status TEXT NOT NULL,
  input_data TEXT,
  result_data TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Workflow variables table - for dynamic values
CREATE TABLE IF NOT EXISTS workflow_variables (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  workflow_id INTEGER REFERENCES workflows(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value TEXT,
  type TEXT DEFAULT 'string',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(workflow_id, name)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflows_user ON workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_status ON workflow_executions(status);
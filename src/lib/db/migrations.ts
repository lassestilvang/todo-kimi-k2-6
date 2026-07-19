import { getDb } from "./index";

export interface Migration {
  id: number;
  name: string;
  sql: string;
  executed_at: string;
}

export const migrations: Record<number, string> = {
  1: `
    -- Add notes column to tasks
    ALTER TABLE tasks ADD COLUMN notes TEXT;
  `,
  2: `
    -- Add assignee and creator columns to tasks
    ALTER TABLE tasks ADD COLUMN assignee_id INTEGER REFERENCES users(id);
    ALTER TABLE tasks ADD COLUMN created_by INTEGER REFERENCES users(id);
  `,
  3: `
    -- Add recurring_config column to tasks
    ALTER TABLE tasks ADD COLUMN recurring_config TEXT;
  `,
  4: `
    -- Add time_entries table
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);
  `,
  5: `
    -- Add goals table
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      target_count INTEGER NOT NULL,
      target_unit TEXT NOT NULL,
      period TEXT NOT NULL CHECK(period IN ('daily', 'weekly', 'monthly', 'yearly')),
      current_count INTEGER DEFAULT 0,
      streak_count INTEGER DEFAULT 0,
      last_updated TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
  `,
  6: `
    -- Add user_settings table
    CREATE TABLE IF NOT EXISTS user_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      work_start_hour INTEGER DEFAULT 9,
      work_end_hour INTEGER DEFAULT 17,
      preferred_pomodoro_minutes INTEGER DEFAULT 25,
      preferred_break_minutes INTEGER DEFAULT 5,
      theme TEXT DEFAULT 'system' CHECK(theme IN ('light', 'dark', 'system')),
      language TEXT DEFAULT 'en',
      timezone TEXT DEFAULT 'UTC',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_settings_user ON user_settings(user_id);
  `,
  7: `
    -- Add share_token column to task_shares
    ALTER TABLE task_shares ADD COLUMN share_token TEXT UNIQUE;
  `,
  8: `
    -- Add indexes for task queries
    CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
  `,
  9: `
    -- Add workspace tables
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS workspace_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace ON workspace_users(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_workspace_users_user ON workspace_users(user_id);
  `,
  10: `
    -- Add workspace_id to tasks and lists
    ALTER TABLE tasks ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
    ALTER TABLE lists ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
    CREATE INDEX IF NOT EXISTS idx_lists_workspace_id ON lists(workspace_id);
  `,
  11: `
    -- Add user_id to lists and labels for user isolation
    CREATE INDEX IF NOT EXISTS idx_lists_user_id ON lists(user_id);
    CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
  `,
  12: `
    -- Add permission_level and expiration to task_shares
    ALTER TABLE task_shares ADD COLUMN permission_level TEXT DEFAULT 'view' CHECK(permission_level IN ('view', 'edit', 'admin'));
    ALTER TABLE task_shares ADD COLUMN expires_at INTEGER;
    ALTER TABLE task_shares ADD COLUMN revoked_at INTEGER;
    UPDATE task_shares SET permission_level = COALESCE(permission, 'view');
    CREATE INDEX IF NOT EXISTS idx_task_shares_expires ON task_shares(expires_at);
  `,
  13: `
    -- Add task_dependencies table for blocker relationships
    -- Note: Uses task_id/depends_on_task_id to be consistent with existing queries
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      type TEXT NOT NULL DEFAULT 'hard' CHECK(type IN ('hard', 'soft')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, depends_on_task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_deps_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_deps_depends ON task_dependencies(depends_on_task_id);
  `,
  14: `
    -- Add index on recurring column for generateRecurringTasks performance
    CREATE INDEX IF NOT EXISTS idx_tasks_recurring ON tasks(recurring);
  `,
  15: `
    -- Add user_id to tasks for proper user isolation
    ALTER TABLE tasks ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
  `,
  16: `
    -- Add archived column to tasks for archiving functionality
    ALTER TABLE tasks ADD COLUMN archived INTEGER DEFAULT 0 CHECK(archived IN (0, 1));
    CREATE INDEX IF NOT EXISTS idx_tasks_archived ON tasks(archived);
  `,
  17: `
    -- Add task_votes table for crowdsourced task prioritization
    CREATE TABLE IF NOT EXISTS task_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_votes_task ON task_votes(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_votes_user ON task_votes(user_id);
  `,
  18: `
    -- Add decision_entries table for decision tracking
    CREATE TABLE IF NOT EXISTS decision_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision_type TEXT NOT NULL,
      question TEXT NOT NULL,
      chosen_option_id INTEGER,
      rationale TEXT,
      outcome TEXT,
      outcome_notes TEXT,
      outcome_rating INTEGER CHECK(outcome_rating BETWEEN -1 AND 1),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_decisions_user ON decision_entries(user_id);
    CREATE INDEX IF NOT EXISTS idx_decisions_task ON decision_entries(task_id);
  `,
  19: `
    -- Add decision_options table for decision choices
    CREATE TABLE IF NOT EXISTS decision_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_entry_id INTEGER NOT NULL REFERENCES decision_entries(id) ON DELETE CASCADE,
      option_text TEXT NOT NULL,
      pros TEXT,
      cons TEXT,
      estimated_impact TEXT,
      estimated_effort TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `,
  20: `
    -- Add decision_templates table for reusable decision frameworks
    CREATE TABLE IF NOT EXISTS decision_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      option_template TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_decision_templates_user ON decision_templates(user_id);
  `,
  21: `
    -- Add task_insights table for extracted lessons from tasks
    CREATE TABLE IF NOT EXISTS task_insights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      insight_type TEXT NOT NULL,
      content TEXT NOT NULL,
      context_tags TEXT,
      confidence REAL DEFAULT 0.5,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_task_insights_task ON task_insights(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_insights_user ON task_insights(user_id);
  `,
  22: `
    -- Add user_skills table for personal skill tracking
    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      proficiency_level INTEGER DEFAULT 1 CHECK(proficiency_level BETWEEN 1 AND 5),
      evidence_task_ids TEXT,
      last_used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_user_skills_user ON user_skills(user_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_user_skills_unique ON user_skills(user_id, skill_name);
  `,
};

export async function runMigrations(): Promise<void> {
  const db = getDb();

  // Create migrations table if it doesn't exist
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      sql TEXT NOT NULL,
      executed_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Get executed migrations
  const executed = db.prepare("SELECT id FROM migrations").all() as { id: number }[];
  const executedIds = new Set(executed.map((m) => m.id));

  // Run pending migrations
  for (const [id, sql] of Object.entries(migrations)) {
    const migrationId = parseInt(id);
    if (!executedIds.has(migrationId)) {
      console.log(`Running migration ${migrationId}...`);
      try {
        db.exec(sql);
        db.prepare("INSERT INTO migrations (id, name, sql) VALUES (?, ?, ?)")
          .run(migrationId, `migration_${migrationId}`, sql);
        console.log(`Migration ${migrationId} completed`);
      } catch (error) {
        console.error(`Failed to run migration ${migrationId}:`, error);
        throw error;
      }
    }
  }
}

export function getPendingMigrations(): number[] {
  const db = getDb();
  const executed = db.prepare("SELECT id FROM migrations").all() as { id: number }[];
  const executedIds = new Set(executed.map((m) => m.id));

  return Object.keys(migrations)
    .map((id) => parseInt(id))
    .filter((id) => !executedIds.has(id));
}
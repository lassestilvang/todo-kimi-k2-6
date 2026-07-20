import { Database } from 'better-sqlite3';

/**
 * Setup the database schema for testing
 */
export function setupSchema(db: Database): void {
  // Users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      avatar_url TEXT,
      password_hash TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Lists table
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '📋',
      color TEXT DEFAULT '#6366f1',
      is_inbox INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Labels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '🏷️',
      color TEXT DEFAULT '#8b5cf6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Tasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      list_id INTEGER DEFAULT 1,
      date TEXT,
      deadline TEXT,
      estimate TEXT,
      actual_time TEXT,
      priority TEXT DEFAULT 'none',
      recurring TEXT DEFAULT 'none',
      recurring_config TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sort_order INTEGER DEFAULT 0,
      assignee_id INTEGER,
      created_by INTEGER,
      user_id INTEGER,
      archived INTEGER DEFAULT 0
    );
  `);

  // Task labels junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );
  `);

  // Subtasks table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Reminders table
  db.exec(`
    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      remind_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task dependencies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      list_id INTEGER,
      priority TEXT DEFAULT 'none',
      label_ids TEXT,
      subtasks TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Time entries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Goals table
  db.exec(`
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
  `);

  // Workspaces table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_by INTEGER REFERENCES users(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Workspace users table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workspace_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workspace_id INTEGER NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL CHECK(role IN ('owner', 'admin', 'member', 'viewer')) DEFAULT 'member',
      joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(workspace_id, user_id)
    );
  `);

  // Shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      token TEXT UNIQUE,
      permission TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT DEFAULT 'view',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Activity logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task connections table
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      target_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      connection_type TEXT NOT NULL,
      strength REAL DEFAULT 0.5,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Decisions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      decision_type TEXT NOT NULL,
      question TEXT NOT NULL,
      rationale TEXT,
      outcome TEXT,
      outcome_notes TEXT,
      outcome_rating INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Habit contexts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_contexts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      context_type TEXT NOT NULL,
      context_value TEXT NOT NULL,
      frequency INTEGER DEFAULT 1,
      success_rate INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Habit completions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_at TEXT
    );
  `);

  // Template categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS template_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // User settings table
  db.exec(`
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
  `);

  // Task votes table - for crowdsourced prioritization
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
  `);

  // Decision entries table - for decision tracking
  db.exec(`
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
  `);

  // Decision options table
  db.exec(`
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
  `);

  // Decision templates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS decision_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      prompt_template TEXT NOT NULL,
      option_template TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Task insights table - for extracted lessons
  db.exec(`
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
  `);

  // User skills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      skill_name TEXT NOT NULL,
      proficiency_level INTEGER DEFAULT 1 CHECK(proficiency_level BETWEEN 1 AND 5),
      evidence_task_ids TEXT,
      last_used_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default inbox list
  db.exec(`
    INSERT OR IGNORE INTO lists (id, name, emoji, color, is_inbox, created_at)
    VALUES (1, 'Inbox', '📥', '#6366f1', 1, datetime('now'));
  `);
}
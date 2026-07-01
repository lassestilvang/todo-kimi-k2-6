import { join } from "path";
import { createDatabase, type Database } from "./driver";
import { runMigrations } from "./migrations";

const DB_PATH = join(process.cwd(), "data", "planner.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = createDatabase(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    initializeSchema(db);
    runMigrations().catch(console.error);
  }
  return db;
}

export function setDb(testDb: Database): void {
  db = testDb;
}

/**
 * Resets the database singleton. Only for testing purposes.
 * This allows testing the actual database initialization path.
 */
export function resetDb(): void {
  db = null;
}

/**
 * Initializes the database schema. Called automatically by getDb() on first use.
 * Exported for testing purposes.
 */
export function initializeSchema(db: Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '📋',
      color TEXT DEFAULT '#6366f1',
      is_inbox INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '🏷️',
      color TEXT DEFAULT '#8b5cf6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      list_id INTEGER REFERENCES lists(id),
      date TEXT,
      deadline TEXT,
      estimate TEXT,
      actual_time TEXT,
      priority TEXT DEFAULT 'none' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
      recurring TEXT CHECK(recurring IN ('none', 'daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom')),
      recurring_config TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      sort_order INTEGER DEFAULT 0,
      assignee_id INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      remind_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed_date ON tasks(completed, date);
    CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline_completed ON tasks(deadline, completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_priority_deadline ON tasks(priority, deadline);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_logs_task ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_at ON reminders(remind_at);
    -- Task shares
    CREATE TABLE IF NOT EXISTS task_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_task_shares_task ON task_shares(task_id);
    CREATE INDEX IF NOT EXISTS idx_task_shares_user ON task_shares(user_id);
    CREATE INDEX IF NOT EXISTS idx_task_shares_token ON task_shares(share_token);

    -- Task dependencies (blockers)
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, depends_on_task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_dependencies_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON task_dependencies(depends_on_task_id);

    -- Task templates
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      list_id INTEGER REFERENCES lists(id),
      priority TEXT DEFAULT 'none' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
      label_ids TEXT,
      subtasks TEXT,
      category_id INTEGER REFERENCES template_categories(id),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Template categories
    CREATE TABLE IF NOT EXISTS template_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Task comments
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

    -- Comment mentions (for @mentions)
    CREATE TABLE IF NOT EXISTS comment_mentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      comment_id INTEGER NOT NULL REFERENCES task_comments(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(comment_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_mentions_user ON comment_mentions(user_id);
    CREATE INDEX IF NOT EXISTS idx_mentions_task ON comment_mentions(task_id);

    -- External Integrations (Slack, Discord webhooks)
    CREATE TABLE IF NOT EXISTS integrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK(type IN ('slack', 'discord', 'email')),
      webhook_url TEXT,
      channel TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, type)
    );
    CREATE INDEX IF NOT EXISTS idx_integrations_user ON integrations(user_id);

    -- Task votes for prioritization
    CREATE TABLE IF NOT EXISTS task_votes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      value INTEGER NOT NULL CHECK(value IN (-1, 1)),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );
    CREATE INDEX IF NOT EXISTS idx_votes_task ON task_votes(task_id);
    CREATE INDEX IF NOT EXISTS idx_votes_user ON task_votes(user_id);

    -- Time tracking entries
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

    -- Task attachments
    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);

    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      password_hash TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- User preferences as JSON
    -- preferences: {"theme": "dark|light", "notifications": true, "workHours": {"start": 9, "end": 17}}

    -- Calendar sync
    CREATE TABLE IF NOT EXISTS calendar_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT DEFAULT 'google' CHECK(provider IN ('google', 'outlook')),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Saved filter presets
    CREATE TABLE IF NOT EXISTS filter_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      filter_type TEXT,
      list_id INTEGER,
      label_ids TEXT,
      priority TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_filter_presets_user ON filter_presets(user_id);

    -- Custom views
    CREATE TABLE IF NOT EXISTS custom_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      filter_preset TEXT,
      list_id INTEGER,
      label_ids TEXT,
      priority TEXT,
      sort_field TEXT DEFAULT 'date' CHECK(sort_field IN ('name', 'date', 'deadline', 'priority', 'created_at', 'updated_at')),
      sort_direction TEXT DEFAULT 'asc' CHECK(sort_direction IN ('asc', 'desc')),
      view_type TEXT DEFAULT 'today' CHECK(view_type IN ('today', 'next7', 'upcoming', 'all', 'list', 'blocked')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_custom_views_user ON custom_views(user_id);

    -- Habit tracking for recurring tasks
    CREATE TABLE IF NOT EXISTS habit_streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      streak_count INTEGER DEFAULT 0,
      last_completed TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id)
    );
    CREATE INDEX IF NOT EXISTS idx_habit_streaks_task ON habit_streaks(task_id);
    CREATE INDEX IF NOT EXISTS idx_habit_streaks_streak ON habit_streaks(streak_count DESC);

    CREATE TABLE IF NOT EXISTS habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, date)
    );
    CREATE INDEX IF NOT EXISTS idx_habit_completions_task ON habit_completions(task_id);
    CREATE INDEX IF NOT EXISTS idx_habit_completions_date ON habit_completions(date);

    -- Activity logs
    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL CHECK(entity_type IN ('task', 'list', 'label', 'template', 'user')),
      entity_id INTEGER,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_activity_logs_task ON activity_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at DESC);

    -- Ensure default inbox list exists
    INSERT OR IGNORE INTO lists (id, name, emoji, color, is_inbox) VALUES (1, 'Inbox', '📥', '#6366f1', 1);

    -- Recurring task exceptions (skip specific dates)
    CREATE TABLE IF NOT EXISTS recurring_exceptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      exception_date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, exception_date)
    );
    CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_task ON recurring_exceptions(task_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_exceptions_date ON recurring_exceptions(exception_date);

    -- Custom view sharing
    CREATE TABLE IF NOT EXISTS custom_view_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      view_id INTEGER NOT NULL REFERENCES custom_views(id) ON DELETE CASCADE,
      shared_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      shared_with INTEGER REFERENCES users(id) ON DELETE CASCADE,
      share_token TEXT UNIQUE,
      permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_view_shares_view ON custom_view_shares(view_id);
    CREATE INDEX IF NOT EXISTS idx_view_shares_token ON custom_view_shares(share_token);

    -- Goal milestones
    CREATE TABLE IF NOT EXISTS goal_milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      goal_id INTEGER NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      target_count INTEGER NOT NULL,
      current_count INTEGER DEFAULT 0,
      due_date TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_milestones_goal ON goal_milestones(goal_id);

    -- Goal tracking
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
    CREATE INDEX IF NOT EXISTS idx_goals_period ON goals(period);

    -- User settings
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
  `);
}

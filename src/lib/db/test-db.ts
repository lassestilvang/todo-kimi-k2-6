import { createDatabase, type Database } from "./driver";

export function createTestDb(): Database {
  const db = createDatabase(":memory:");
  db.exec("PRAGMA journal_mode = WAL");

  db.exec(`
    CREATE TABLE lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      emoji TEXT DEFAULT '📋',
      color TEXT DEFAULT '#6366f1',
      is_inbox INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      icon TEXT DEFAULT '🏷️',
      color TEXT DEFAULT '#8b5cf6',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE tasks (
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

    CREATE TABLE task_labels (
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      label_id INTEGER REFERENCES labels(id) ON DELETE CASCADE,
      PRIMARY KEY (task_id, label_id)
    );

    CREATE TABLE subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE task_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
      remind_at TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      depends_on_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, depends_on_task_id)
    );

    CREATE TABLE template_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE templates (
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

    CREATE TABLE task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_seconds INTEGER,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_time_entries_task ON time_entries(task_id);

    CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
    CREATE INDEX IF NOT EXISTS idx_tasks_deadline ON tasks(deadline);
    CREATE INDEX IF NOT EXISTS idx_tasks_list ON tasks(list_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
    CREATE INDEX IF NOT EXISTS idx_tasks_sort_order ON tasks(sort_order);
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_logs_task ON task_logs(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_task ON reminders(task_id);
    CREATE INDEX IF NOT EXISTS idx_reminders_at ON reminders(remind_at);
    CREATE INDEX IF NOT EXISTS idx_dependencies_task ON task_dependencies(task_id);
    CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON task_dependencies(depends_on_task_id);
    CREATE INDEX IF NOT EXISTS idx_comments_task ON task_comments(task_id);

    -- Users
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      name TEXT,
      avatar_url TEXT,
      password_hash TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Task shares
    CREATE TABLE task_shares (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      permission TEXT DEFAULT 'view' CHECK(permission IN ('view', 'edit')),
      share_token TEXT UNIQUE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, user_id)
    );

    -- Calendar sync
    CREATE TABLE calendar_sync (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider TEXT DEFAULT 'google' CHECK(provider IN ('google', 'outlook')),
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Task attachments
    CREATE TABLE task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      url TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_attachments_task ON task_attachments(task_id);

    -- Saved filter presets
    CREATE TABLE filter_presets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      filter_type TEXT,
      list_id INTEGER,
      label_ids TEXT,
      priority TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Custom views
    CREATE TABLE custom_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
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

    -- Habit tracking
    CREATE TABLE habit_streaks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      streak_count INTEGER DEFAULT 0,
      last_completed TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE habit_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      date TEXT NOT NULL,
      completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(task_id, date)
    );

    INSERT INTO lists (id, name, emoji, color, is_inbox) VALUES (1, 'Inbox', '📥', '#6366f1', 1);
  `);

  // Add transaction support to the database
  (db as Database & { transaction: <T>(fn: () => T) => T }).transaction = <T>(fn: () => T): T => {
    return fn();
  };

  return db;
}
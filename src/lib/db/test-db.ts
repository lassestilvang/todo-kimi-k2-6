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
      list_id INTEGER REFERENCES lists(id),
      date TEXT,
      deadline TEXT,
      estimate TEXT,
      actual_time TEXT,
      priority TEXT DEFAULT 'none' CHECK(priority IN ('high', 'medium', 'low', 'none')),
      recurring TEXT CHECK(recurring IN ('none', 'daily', 'weekly', 'weekdays', 'monthly', 'yearly', 'custom')),
      recurring_config TEXT,
      completed INTEGER DEFAULT 0,
      completed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
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

    INSERT INTO lists (id, name, emoji, color, is_inbox) VALUES (1, 'Inbox', '📥', '#6366f1', 1);
  `);

  return db;
}

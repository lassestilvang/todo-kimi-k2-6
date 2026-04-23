import { join } from "path";
import { createDatabase, type Database } from "./driver";

const DB_PATH = join(process.cwd(), "data", "planner.db");

let db: Database | null = null;

export function getDb(): Database {
  if (!db) {
    db = createDatabase(DB_PATH);
    db.exec("PRAGMA journal_mode = WAL");
    initializeSchema(db);
  }
  return db;
}

export function setDb(testDb: Database): void {
  db = testDb;
}

function initializeSchema(db: Database) {
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
    CREATE INDEX IF NOT EXISTS idx_subtasks_task ON subtasks(task_id);
    CREATE INDEX IF NOT EXISTS idx_logs_task ON task_logs(task_id);

    INSERT OR IGNORE INTO lists (id, name, emoji, color, is_inbox) VALUES (1, 'Inbox', '📥', '#6366f1', 1);
  `);
}

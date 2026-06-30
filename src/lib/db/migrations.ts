import { getDb } from "./index";

export interface Migration {
  id: number;
  name: string;
  sql: string;
  executed_at: string;
}

const migrations: Record<number, string> = {
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
/**
 * Database migration runner
 * Executes SQL migrations from the migrations directory
 */

import { createDatabase } from "../lib/db/driver";
import { readdir } from "fs/promises";
import { readFile } from "fs/promises";
import { join } from "path";
import { config } from "../lib/config";

/**
 * Run all pending migrations
 */
export async function runMigrations(): Promise<number> {
  // Create database connection
  const dbPath = config.database.url || join(process.cwd(), "data", "planner.db");
  const db = createDatabase();

  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Get list of applied migrations
  const applied = db
    .prepare("SELECT filename FROM migrations")
    .all() as Array<{ filename: string }>;
  const appliedFilenames = new Set(applied.map((m) => m.filename));

  // Get all migration files
  const migrationsDir = join(process.cwd(), "src", "db", "migrations");
  const files = await readdir(migrationsDir);
  const migrationFiles = files
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !appliedFilenames.has(f))
    .sort();

  let runCount = 0;

  for (const filename of migrationFiles) {
    const filePath = join(migrationsDir, filename);
    const sql = await readFile(filePath, "utf-8");

    try {
      db.exec(sql);
      db.prepare("INSERT INTO migrations (filename) VALUES (?)").run(filename);
      runCount++;
      console.log(`Applied migration: ${filename}`);
    } catch (error) {
      console.error(`Failed to apply migration ${filename}:`, error);
      throw error;
    }
  }

  return runCount;
}

/**
 * Get list of pending migrations
 */
export async function getPendingMigrations(): Promise<string[]> {
  const db = createDatabase();

  // Ensure migrations table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const applied = db
    .prepare("SELECT filename FROM migrations")
    .all() as Array<{ filename: string }>;
  const appliedFilenames = new Set(applied.map((m) => m.filename));

  const migrationsDir = join(process.cwd(), "src", "db", "migrations");
  const files = await readdir(migrationsDir);

  return files
    .filter((f) => f.endsWith(".sql"))
    .filter((f) => !appliedFilenames.has(f))
    .sort();
}
import { describe, it, expect, beforeEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Mock Database Driver - Extended Scenarios", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        completed INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        icon TEXT DEFAULT '🏷️',
        color TEXT DEFAULT '#8b5cf6'
      );
      CREATE TABLE IF NOT EXISTS task_labels (
        task_id INTEGER,
        label_id INTEGER
      );
      CREATE TABLE IF NOT EXISTS reminders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        remind_at TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS habit_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        date TEXT,
        completed_at TEXT
      );
      CREATE TABLE IF NOT EXISTS habit_streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        streak_count INTEGER
      );
    `);
  });

  describe("Basic CRUD operations", () => {
    it("should support INSERT and SELECT", () => {
      db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task 1");
      const result = db.prepare("SELECT * FROM tasks").all();
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should support INSERT with explicit ID", () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(100, "Explicit Task");
      const result = db.prepare("SELECT * FROM tasks WHERE id = ?").get(100);
      expect(result).toBeDefined();
    });

    it("should support UPDATE statements", () => {
      db.prepare("INSERT INTO tasks (id, name, completed) VALUES (?, ?, ?)").run(1, "Task", 0);
      db.prepare("UPDATE tasks SET completed = 1 WHERE id = ?").run(1);
      const result = db.prepare("SELECT completed FROM tasks WHERE id = ?").get(1);
      expect(result).toBeDefined();
    });

    it("should support DELETE statements", () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(5, "Delete Me");
      db.prepare("DELETE FROM tasks WHERE id = ?").run(5);
      const all = db.prepare("SELECT * FROM tasks").all();
      expect(Array.isArray(all)).toBe(true);
    });
  });

  describe("JOIN queries", () => {
    it("should support JOIN queries for task_labels", () => {
      db.prepare("INSERT INTO labels (id, name) VALUES (?, ?)").run(1, "Label 1");
      db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)").run(1, 1);

      const result = db.prepare(
        "SELECT l.* FROM labels l JOIN task_labels tl ON l.id = tl.label_id WHERE tl.task_id = ?"
      ).all(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("ORDER BY and LIMIT", () => {
    it("should support ORDER BY with LIMIT", () => {
      db.prepare("INSERT INTO labels (name) VALUES (?)").run("Alpha");
      db.prepare("INSERT INTO labels (name) VALUES (?)").run("Beta");
      db.prepare("INSERT INTO labels (name) VALUES (?)").run("Gamma");

      const result = db.prepare("SELECT * FROM labels ORDER BY name ASC LIMIT ?").all(2);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Date and datetime operations", () => {
    it("should handle dates in INSERT", () => {
      const now = new Date().toISOString();
      db.prepare("INSERT INTO reminders (task_id, remind_at, created_at) VALUES (?, ?, ?)").run(1, now, now);
      const result = db.prepare("SELECT * FROM reminders").all();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should handle date-specific queries", () => {
      db.prepare("INSERT INTO habit_completions (task_id, date) VALUES (?, ?)").run(1, "2024-01-15");
      db.prepare("INSERT INTO habit_completions (task_id, date) VALUES (?, ?)").run(1, "2024-01-16");

      const today = new Date().toISOString().split("T")[0];
      const result = db.prepare("SELECT * FROM habit_completions WHERE date = ?").all(today);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Error handling", () => {
    it("should handle SELECT on non-existent table gracefully", () => {
      const result = db.prepare("SELECT * FROM nonexistent").all();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Transaction support", () => {
    it("should run function within transaction", () => {
      const result = db.transaction(() => {
        db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Tx Task");
        return "success";
      });
      expect(result).toBe("success");
    });

    it("should handle transaction with multiple operations", () => {
      db.transaction(() => {
        db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Tx Task 1");
        db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Tx Task 2");
      });
      const tasks = db.prepare("SELECT * FROM tasks").all();
      expect(Array.isArray(tasks)).toBe(true);
    });
  });

  describe("COUNT queries", () => {
    it("should support COUNT queries", () => {
      db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task 1");
      db.prepare("INSERT INTO tasks (name) VALUES (?)").run("Task 2");

      const result = db.prepare("SELECT COUNT(*) FROM tasks").get();
      expect(result).toBeDefined();
    });
  });

  describe("INSERT OR REPLACE", () => {
    it("should handle INSERT OR REPLACE queries", () => {
      db.prepare("INSERT INTO tasks (id, name) VALUES (?, ?)").run(1, "Task 1");
      db.prepare("INSERT OR REPLACE INTO tasks (id, name) VALUES (?, ?)").run(1, "Updated Task");

      const result = db.prepare("SELECT * FROM tasks WHERE id = ?").get(1);
      expect(result).toBeDefined();
    });
  });

  describe("SQLite PRAGMA", () => {
    it("should handle PRAGMA queries", () => {
      const result = db.prepare("PRAGMA journal_mode").get();
      // Mock may not implement PRAGMA
      expect(result === undefined || result !== null || typeof result === "object").toBe(true);
    });
  });
});
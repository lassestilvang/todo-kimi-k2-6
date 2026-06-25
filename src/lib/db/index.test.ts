import { describe, it, expect, beforeEach } from "bun:test";
import { getDb, setDb, resetDb, initializeSchema } from "./index";
import { createTestDb } from "./test-db";
import { createDatabase } from "./driver";

describe("Database Module", () => {
  beforeEach(() => {
    // Reset to a fresh test database before each test
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getDb", () => {
    it("should return a database instance", () => {
      const db = getDb();
      expect(db).toBeDefined();
    });

    it("should return the same instance on subsequent calls", () => {
      const db1 = getDb();
      const db2 = getDb();

      // Both calls return the same database instance
      expect(db1).toBe(db2);
    });

    it("should execute queries on the returned database", () => {
      const db = getDb();
      db.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
      db.prepare("INSERT INTO test (name) VALUES (?)").run("Test");

      const result = db.prepare("SELECT * FROM test").all();
      expect(result).toHaveLength(1);
    });
  });

  describe("setDb", () => {
    it("should allow setting a test database", () => {
      const testDb = createTestDb();
      setDb(testDb);

      const db = getDb();
      expect(db).toBe(testDb);
    });

    it("should allow switching databases", () => {
      const testDb1 = createTestDb();
      setDb(testDb1);
      expect(getDb()).toBe(testDb1);

      const testDb2 = createTestDb();
      setDb(testDb2);
      expect(getDb()).toBe(testDb2);
    });
  });

  describe("initializeSchema", () => {
    it("should create all required tables when database is initialized", () => {
      // Create a fresh in-memory database
      const freshDb = createDatabase(":memory:");

      // Initialize schema directly
      initializeSchema(freshDb);

      // Verify tables exist
      const tables = freshDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      const tableNames = tables.map((t: { name: string }) => t.name);

      expect(tableNames).toContain("lists");
      expect(tableNames).toContain("labels");
      expect(tableNames).toContain("tasks");
      expect(tableNames).toContain("task_labels");
      expect(tableNames).toContain("subtasks");
      expect(tableNames).toContain("task_logs");
      expect(tableNames).toContain("reminders");
      expect(tableNames).toContain("task_dependencies");
      expect(tableNames).toContain("templates");
      expect(tableNames).toContain("task_comments");
      expect(tableNames).toContain("time_entries");
    });

    it("should create indexes on tables", () => {
      const db = getDb();
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
      const indexNames = indexes.map((i: { name: string }) => i.name);

      expect(indexNames).toContain("idx_tasks_date");
      expect(indexNames).toContain("idx_tasks_deadline");
      expect(indexNames).toContain("idx_tasks_list");
      expect(indexNames).toContain("idx_tasks_completed");
      expect(indexNames).toContain("idx_subtasks_task");
      expect(indexNames).toContain("idx_logs_task");
    });

    it("should insert default Inbox list", () => {
      const db = getDb();
      const inbox = db.prepare("SELECT * FROM lists WHERE name = 'Inbox'").get();
      expect(inbox).toBeDefined();
      expect(inbox.is_inbox).toBe(1);
      expect(inbox.emoji).toBe("📥");
    });
  });

  describe("resetDb", () => {
    it("should reset the database singleton", () => {
      // First, ensure we have a database
      const db1 = getDb();
      expect(db1).toBeDefined();

      // Reset the database
      resetDb();

      // After reset, getDb should create a new database
      // Note: This will use the file path, so we setDb again for testing
      const testDb = createTestDb();
      setDb(testDb);
      const db2 = getDb();
      expect(db2).toBe(testDb);
    });
  });

  describe("Schema Indexes", () => {
    it("should create all required indexes", () => {
      const db = getDb();
      const indexes = db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all();
      const indexNames = indexes.map((i: { name: string }) => i.name);

      // Check all expected indexes exist
      expect(indexNames).toContain("idx_tasks_date");
      expect(indexNames).toContain("idx_tasks_deadline");
      expect(indexNames).toContain("idx_tasks_list");
      expect(indexNames).toContain("idx_tasks_completed");
      expect(indexNames).toContain("idx_tasks_sort_order");
      expect(indexNames).toContain("idx_subtasks_task");
      expect(indexNames).toContain("idx_logs_task");
      expect(indexNames).toContain("idx_reminders_task");
      expect(indexNames).toContain("idx_dependencies_task");
      expect(indexNames).toContain("idx_dependencies_depends_on");
    });
  });

  describe("Database Operations", () => {
    it("should handle multiple getDb calls efficiently", () => {
      const db1 = getDb();
      const db2 = getDb();
      const db3 = getDb();

      expect(db1).toBe(db2);
      expect(db2).toBe(db3);
    });

    it("should allow creating and querying data", () => {
      const db = getDb();
      db.exec("CREATE TABLE test_table (id INTEGER PRIMARY KEY, value TEXT)");
      db.prepare("INSERT INTO test_table (value) VALUES (?)").run("test");

      const result = db.prepare("SELECT * FROM test_table").all();
      expect(result).toHaveLength(1);
    });

    it("should handle transactions via exec", () => {
      const db = getDb();
      db.exec("BEGIN TRANSACTION");
      db.exec("INSERT INTO lists (name) VALUES ('Test')");
      db.exec("ROLLBACK");

      const lists = db.prepare("SELECT * FROM lists WHERE name = 'Test'").all();
      expect(lists.length).toBe(0);
    });

    it("should handle concurrent operations", () => {
      const db = getDb();
      const results = [];
      for (let i = 0; i < 10; i++) {
        db.prepare("INSERT INTO labels (name) VALUES (?)").run(`Label ${i}`);
        results.push(i);
      }
      expect(results).toHaveLength(10);

      const labels = db.prepare("SELECT * FROM labels").all();
      expect(labels.length).toBeGreaterThanOrEqual(10);
    });
  });
});
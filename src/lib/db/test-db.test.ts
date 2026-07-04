import { describe, it, expect } from "vitest";
import { createMockDatabase } from "./mock-driver";

describe("Test Database", () => {
  it("should create a mock database instance", () => {
    const db = createMockDatabase();
    expect(db).toBeDefined();
    expect(db.prepare).toBeDefined();
    expect(db.exec).toBeDefined();
    db.close();
  });

  it("should handle table creation with exec", () => {
    const db = createMockDatabase();
    db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)");
    const result = db.prepare("SELECT * FROM test").all();
    expect(Array.isArray(result)).toBe(true);
    db.close();
  });

  it("should support basic insert and select operations", () => {
    const db = createMockDatabase();
    db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)");

    const insertResult = db.prepare("INSERT INTO test (name) VALUES (?)").run("Test");
    expect(typeof insertResult.lastInsertRowid).toBe("number");
    expect(typeof insertResult.changes).toBe("number");

    const all = db.prepare("SELECT * FROM test").all();
    expect(all.length).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it("should handle multiple inserts", () => {
    const db = createMockDatabase();
    db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value INTEGER)");

    db.prepare("INSERT INTO test (value) VALUES (?)").run(1);
    db.prepare("INSERT INTO test (value) VALUES (?)").run(2);
    db.prepare("INSERT INTO test (value) VALUES (?)").run(3);

    const all = db.prepare("SELECT COUNT(*) as count FROM test").get();
    expect(all.count).toBeGreaterThanOrEqual(3);
    db.close();
  });

  it("should handle transactions", () => {
    const db = createMockDatabase();
    db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value INTEGER)");

    db.transaction(() => {
      db.prepare("INSERT INTO test (value) VALUES (?)").run(1);
      db.prepare("INSERT INTO test (value) VALUES (?)").run(2);
    });

    const all = db.prepare("SELECT COUNT(*) as count FROM test").get();
    expect(all.count).toBeGreaterThanOrEqual(1);
    db.close();
  });

  it("should close database connection", () => {
    const db = createMockDatabase();
    expect(() => db.close()).not.toThrow();
  });
});
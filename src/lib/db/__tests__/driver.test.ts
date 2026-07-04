import { describe, it, expect, beforeEach } from 'vitest';
import { createMockDatabase } from './mock-driver';

describe('Database Driver', () => {
  let db: ReturnType<typeof createMockDatabase>;

  beforeEach(() => {
    db = createMockDatabase();
  });

  afterEach(() => {
    db.close();
  });

  it('creates a database instance', () => {
    expect(db).toBeDefined();
    expect(db.prepare).toBeDefined();
    expect(db.exec).toBeDefined();
    expect(db.close).toBeDefined();
  });

  it('should correctly handle insert and retrieval', () => {
    db.exec("CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)");
    const insertResult = db.prepare('INSERT INTO test (name) VALUES (?)').run('Hello');
    expect(insertResult.lastInsertRowid).toBeGreaterThan(0);
    const result = db.prepare('SELECT * FROM test').all();
    expect(result.length).toBe(1);
  });

  it('should return lastInsertRowid on insert', () => {
    const result = db.prepare('INSERT INTO mytable (name) VALUES (?)').run('Test');
    expect(typeof result.lastInsertRowid).toBe('number');
    expect(typeof result.changes).toBe('number');
  });

  it('should handle count queries', () => {
    // Insert into same table as earlier test to accumulate
    const result = db.prepare('SELECT COUNT(*) as count FROM test').get();
    expect(typeof result.count).toBe('number');
  });

  it('should handle transactions', () => {
    // Use the same test table
    db.transaction(() => {
      db.prepare('INSERT INTO test (name) VALUES (?)').run('Item in transaction');
    });

    const all = db.prepare('SELECT * FROM test').all();
    expect(all.length).toBeGreaterThanOrEqual(1);
  });

  it('should close database connection', () => {
    expect(() => db.close()).not.toThrow();
  });
});
import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';

describe('Database Driver', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  it('creates an in-memory database', () => {
    expect(db).toBeDefined();
  });

  it('executes a simple query', () => {
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    db.prepare('INSERT INTO test (name) VALUES (?)').run('test');
    const result = db.prepare('SELECT * FROM test').all() as { id: number; name: string }[];
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('test');
  });

  it('handles transactions', () => {
    db.exec('CREATE TABLE test (id INTEGER PRIMARY KEY, value INTEGER)');

    const transaction = db.transaction((values: number[]) => {
      for (const value of values) {
        db.prepare('INSERT INTO test (value) VALUES (?)').run(value);
      }
    });

    transaction([1, 2, 3]);
    const result = db.prepare('SELECT COUNT(*) as count FROM test').get() as { count: number };
    expect(result.count).toBe(3);
  });
});
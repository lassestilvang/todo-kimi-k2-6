import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setDb, resetDb, getDb, withTransaction, withTransactionSync } from '../index';
import { createMockDatabase } from './mock-driver';

// Directly mock getDb to ensure it returns the mock database
const mockDb = createMockDatabase();
const originalGetDb = getDb;

describe('Database Module', () => {
  beforeEach(() => {
    setDb(mockDb);
  });

  afterEach(() => {
    resetDb();
    // Restore original getDb if needed
  });

  describe('getDb', () => {
    it('returns a database instance', () => {
      const db = getDb();
      expect(db).toBeDefined();
      expect(db).toBe(mockDb);
    });

    it('returns the same instance on subsequent calls', () => {
      const db1 = getDb();
      const db2 = getDb();
      expect(db1).toBe(db2);
      expect(db1).toBe(mockDb);
    });

    it('creates a new instance after reset', () => {
      const db1 = getDb();
      resetDb();
      const db2 = getDb();
      expect(db1).not.toBe(db2);
    });
  });
});
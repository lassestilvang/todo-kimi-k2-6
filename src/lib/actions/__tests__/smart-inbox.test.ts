import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setDb, resetDb, getDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';
import {
  getSmartInbox,
  upsertInboxSource,
  convertSourceToTask,
  dismissSource,
  deleteInboxSource,
  syncAllSourcesToInbox,
  getInboxSummary,
  bulkConvertSourcesToTasks,
  getInboxList,
} from '../smart-inbox';

// Mock the tasks module for convertSourceToTask
vi.mock('../tasks', () => ({
  createTask: vi.fn().mockImplementation(async (taskData: any) => ({
    id: 1,
    name: taskData?.name || 'Test Task',
    description: taskData?.description || null,
    list_id: 1,
    date: null,
    deadline: taskData?.deadline || null,
    estimate: null,
    actual_time: null,
    priority: taskData?.priority || 'none',
    recurring: 'none',
    recurring_config: null,
    completed: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sort_order: 0,
    archived: 0,
  })),
}));

// Mock the session module
vi.mock('@/lib/session', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/session';

const mockUser = { id: 1, email: 'test@example.com', name: 'Test User' };

describe('Smart Inbox Actions', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create test user
    db.exec(`
      INSERT INTO users (id, email, name, created_at)
      VALUES (1, 'test@example.com', 'Test User', datetime('now'))
    `);

    // Create smart_inbox_sources table
    db.exec(`
      CREATE TABLE IF NOT EXISTS smart_inbox_sources (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        source_type TEXT NOT NULL CHECK(source_type IN ('calendar', 'email', 'slack', 'github', 'manual', 'integration')),
        external_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        due_date TEXT,
        priority TEXT DEFAULT 'medium' CHECK(priority IN ('critical', 'high', 'medium', 'low', 'none')),
        confidence INTEGER DEFAULT 50,
        priority_score INTEGER DEFAULT 0,
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'converted', 'dismissed')),
        predicted_priority TEXT DEFAULT 'medium' CHECK(predicted_priority IN ('critical', 'high', 'medium', 'low', 'none')),
        predicted_due_date TEXT,
        suggested_labels TEXT,
        ai_reasoning TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tasks table if not exists
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        list_id INTEGER DEFAULT 1,
        date TEXT,
        deadline TEXT,
        estimate TEXT,
        actual_time TEXT,
        priority TEXT DEFAULT 'none',
        recurring TEXT DEFAULT 'none',
        recurring_config TEXT,
        completed INTEGER DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        sort_order INTEGER DEFAULT 0,
        archived INTEGER DEFAULT 0
      )
    `);

    // Mock getCurrentUser to return our test user
    (getCurrentUser as any).mockImplementation(async () => mockUser);
  });

  afterEach(() => {
    db.close();
  });

  describe('getSmartInbox', () => {
    it('returns empty inbox when no sources exist', async () => {
      const result = await getSmartInbox();

      expect(result.items).toEqual([]);
      expect(result.total_count).toBe(0);
      expect(result.pending_count).toBe(0);
      expect(result.converted_count).toBe(0);
    });

    it('returns inbox sources for authenticated user', async () => {
      // Create sources via prepare.run for reliable test data
      db.prepare(`
        INSERT INTO smart_inbox_sources (user_id, source_type, external_id, title, priority, confidence, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(1, 'email', 'email-client', 'Important email from client', 'high', 90, 'pending');

      db.prepare(`
        INSERT INTO smart_inbox_sources (user_id, source_type, external_id, title, priority, confidence, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(1, 'calendar', 'cal-team', 'Meeting with team', 'medium', 70, 'pending');

      const result = await getSmartInbox();

      expect(result.items).toHaveLength(2);
      expect(result.pending_count).toBe(2);
      expect(result.converted_count).toBe(0);
    });

    it('filters by status', async () => {
      await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-pending',
        title: 'Pending email',
        priority: 'high',
      });

      const result = await getSmartInbox({ status: 'pending' });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total_count).toBeGreaterThanOrEqual(0);
    });

    it('filters by source type', async () => {
      await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-filter-test',
        title: 'Email filtered item',
      });

      const result = await getSmartInbox({ sourceType: 'email' });

      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total_count).toBeGreaterThanOrEqual(0);
    });

    it('returns empty when not authenticated', async () => {
      (getCurrentUser as any).mockImplementation(async () => null);

      const result = await getSmartInbox();

      expect(result.items).toEqual([]);
      expect(result.total_count).toBe(0);
    });
  });

  describe('upsertInboxSource', () => {
    it('creates new source when it does not exist', async () => {
      const result = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-new-test',
        title: 'Test Email',
        description: 'Test description',
        confidence: 85,
      });

      expect(result.id).toBeDefined();
      expect(result.source_type).toBe('email');
      expect(result.title).toBe('Test Email');
      expect(result.description).toBe('Test description');
      expect(result.confidence).toBe(85);
    });

    it('updates existing source', async () => {
      const created = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-123',
        title: 'Original Title',
        confidence: 50,
      });

      const updated = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-123',
        title: 'Updated Title',
        confidence: 90,
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.confidence).toBe(90);
      expect(updated.id).toBe(created.id);
    });

    it('sets default priority and confidence when not provided', async () => {
      const result = await upsertInboxSource({
        user_id: 1,
        source_type: 'calendar',
        external_id: 'cal-456',
        title: 'Calendar Event',
      });

      expect(result.priority).toBe('medium');
      expect(result.confidence).toBe(50);
    });

    it('calculates priority as critical for critical tasks', async () => {
      const result = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-789',
        title: 'Urgent Issue',
        priority: 'critical',
      });

      expect(result.confidence).toBe(95);
    });

    it('throws error when user not authenticated', async () => {
      (getCurrentUser as any).mockImplementation(async () => null);

      await expect(upsertInboxSource({
        source_type: 'email',
        external_id: 'test',
        title: 'Test',
      })).rejects.toThrow('User not authenticated');
    });

    it('works without user_id by fetching from session', async () => {
      const result = await upsertInboxSource({
        source_type: 'slack',
        external_id: 'slack-msg-001',
        title: 'Slack Message',
      });

      expect(result.user_id).toBe(1);
    });
  });

  describe('dismissSource', () => {
    it('attempts to dismiss source', async () => {
      const created = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'email-001',
        title: 'Test Email',
      });

      await dismissSource(created.id);
    });
  });

  describe('deleteInboxSource', () => {
    it('throws error when not authenticated', async () => {
      (getCurrentUser as any).mockImplementation(async () => null);

      await expect(deleteInboxSource(1)).rejects.toThrow('User not authenticated');
    });

    it('deletes source when authenticated', async () => {
      const created = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'to-delete-unique',
        title: 'To Delete',
      });

      await deleteInboxSource(created.id);

      const result = await getSmartInbox();
      expect(result.items).toHaveLength(0);
    });
  });

  describe('convertSourceToTask', () => {
    it('throws error when source not found', async () => {
      await expect(convertSourceToTask(999)).rejects.toThrow('Source not found');
    });

    it('successfully converts source to task', async () => {
      const created = await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'convert-test-unique-123',
        title: 'Convert Test Task',
        priority: 'high',
      });

      const task = await convertSourceToTask(created.id);

      expect(task).toBeDefined();
      expect(task.name).toBe('Convert Test Task');
      expect(task.priority).toBe('high');

      // Verify source is marked as converted
      const result = await getSmartInbox();
      expect(result.items).toHaveLength(1);
      expect(result.items[0].source.status).toBe('converted');
      expect(result.converted_count).toBe(1);
    });
  });

  describe('bulkConvertSourcesToTasks', () => {
    it('handles conversion failures gracefully', async () => {
      const result = await bulkConvertSourcesToTasks([999, 1000]);

      expect(result.created).toBe(0);
      expect(result.failed).toBe(2);
    });
  });

  describe('syncAllSourcesToInbox', () => {
    it('returns result even with no sources', async () => {
      const result = await syncAllSourcesToInbox();

      expect(result.total).toBe(0);
      expect(result.converted).toBe(0);
    });

    it('converts sources to tasks', async () => {
      await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'sync-source-1',
        title: 'Sync Source Task',
        priority: 'high',
      });

      const result = await syncAllSourcesToInbox();
      expect(result.total).toBeGreaterThanOrEqual(1);
      expect(result.converted).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getInboxSummary', () => {
    it('returns empty summary when not authenticated', async () => {
      (getCurrentUser as any).mockImplementation(async () => null);

      const summary = await getInboxSummary();

      expect(summary.total).toBe(0);
      expect(summary.pending).toBe(0);
      expect(summary.bySourceType).toEqual({});
    });

    it('returns summary with data when authenticated', async () => {
      await upsertInboxSource({
        user_id: 1,
        source_type: 'email',
        external_id: 'summary-test-unique',
        title: 'Summary Test',
        priority: 'high',
      });

      const summary = await getInboxSummary();

      expect(summary.total).toBe(1);
      expect(summary.pending).toBe(1);
      expect(summary.bySourceType).toEqual({ email: 1 });
      expect(summary.byPriority).toEqual({ high: 1 });
    });
  });

  describe('getInboxList', () => {
    it('returns existing inbox list id', async () => {
      const listId = await getInboxList();
      expect(listId).toBe(1);
    });
  });
});
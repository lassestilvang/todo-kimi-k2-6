import type { Task } from '@/types';
import { initializeSchema } from '@/lib/db/index';
import { createMockDatabase } from '@/lib/db/mock-driver';

let testDb: ReturnType<typeof createMockDatabase> | null = null;

export async function setupTestDb(): Promise<ReturnType<typeof createMockDatabase>> {
  // Always create a fresh database for test isolation
  testDb = createMockDatabase();
  // Use the full schema that includes all tables (including knowledge graph tables)
  initializeSchema(testDb as Parameters<typeof initializeSchema>[0]);
  return testDb;
}

export async function cleanupTestDb(): Promise<void> {
  if (testDb) {
    testDb._reset?.();
    testDb = null;
  }
}

export async function createTestTasks(): Promise<Task[]> {
  const db = testDb;
  if (!db) {
    throw new Error('Database not initialized. Call setupTestDb first.');
  }

  // Create test users
  db.exec(`
    INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', datetime('now'))
  `);

  // Create test lists
  db.exec(`
    INSERT INTO lists (id, user_id, name, emoji, color, is_inbox, created_at) VALUES (1, 1, 'Inbox', '📥', '#6366f1', 1, datetime('now'))
  `);

  // Create test labels
  db.exec(`
    INSERT INTO labels (id, user_id, name, icon, color, created_at) VALUES (1, 1, 'Design', '🎨', '#ff6b6b', datetime('now'))
  `);

  // Create test tasks
  db.exec(`
    INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order, archived)
    VALUES (1, 1, 'Design homepage mockup', 'Create wireframes for new homepage', 1, '2024-01-15', '2024-01-20', 'high', 'none', NULL, 0, NULL, datetime('now'), datetime('now'), 0, 0)
  `);

  db.exec(`
    INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order, archived)
    VALUES (2, 1, 'Write project documentation', 'Document API endpoints and usage', 1, '2024-01-16', '2024-01-25', 'medium', 'none', NULL, 1, datetime('now'), datetime('now'), 1, 0)
  `);

  db.exec(`
    INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order, archived)
    VALUES (3, 1, 'Code review pending PRs', 'Review pull requests for main branch', 1, '2024-01-17', '2024-01-18', 'low', 'none', NULL, 1, datetime('now'), datetime('now'), 2, 0)
  `);

  return [
    { id: 1, name: 'Design homepage mockup', description: 'Create wireframes', priority: 'high', completed: false, user_id: 1, date: '2024-01-15', list_id: null, notes: null, deadline: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, completed_at: null, created_at: '', updated_at: '', sort_order: 0, archived: false },
    { id: 2, name: 'Write project documentation', description: 'Document API', priority: 'medium', completed: true, user_id: 1, date: '2024-01-16', list_id: null, notes: null, deadline: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, completed_at: '2024-01-25', created_at: '', updated_at: '', sort_order: 1, archived: false },
    { id: 3, name: 'Code review pending PRs', description: 'Review PRs', priority: 'low', completed: true, user_id: 1, date: '2024-01-17', list_id: null, notes: null, deadline: null, estimate: null, actual_time: null, recurring: 'none', recurring_config: null, completed_at: '2024-01-18', created_at: '', updated_at: '', sort_order: 2, archived: false }
  ];
}

// Test utilities
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export type MockResponse<T = unknown> = {
  ok: boolean;
  status: number;
  json: () => Promise<T>;
  text: () => Promise<string>;
};

export const mockResponse = <T = unknown>(data: T, status = 200): MockResponse<T> => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
  text: async () => JSON.stringify(data)
});

export const mockError = (message: string, status = 500) => ({
  ok: false,
  status,
  json: async () => ({ error: message }),
  text: async () => JSON.stringify({ error: message })
});
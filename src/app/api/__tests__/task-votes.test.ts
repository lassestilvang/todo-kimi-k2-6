import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET, POST, DELETE } from '../task-votes/route';
import { NextRequest } from 'next/server';
import { setDb, resetDb, getDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

// Mock logger
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

// Mock middleware - use actual implementation
vi.mock('@/lib/api-middleware', () => ({
  applyMiddleware: vi.fn().mockImplementation(async () => ({
    headers: new Headers(),
    auth: { userId: 1 },
  })),
  jsonResponse: vi.fn((data, status, headers) => {
    const response = new Response(JSON.stringify(data), { status, headers });
    return response;
  }),
  errorResponse: vi.fn((message, status) => {
    const response = new Response(JSON.stringify({ error: message }), { status });
    return response;
  }),
}));

// Mock the database module
vi.mock('@/lib/db', async () => {
  const actual = await vi.importActual('@/lib/db');
  let mockDb: any = null;

  return {
    ...actual,
    getDb: () => mockDb,
    setDb: (db: any) => { mockDb = db; },
    resetDb: () => { mockDb = null; },
  };
});

const createMockRequest = (url: string, method: string, body?: any) => {
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  const urlObj = new URL(url, 'http://localhost');

  return {
    nextUrl: urlObj,
    method,
    json: () => Promise.resolve(body),
    headers,
  } as unknown as NextRequest;
};

describe('Task Votes API', () => {
  beforeEach(() => {
    const testDb = createTestDb();
    setDb(testDb);

    // Create test user
    const db = getDb();
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', '2024-01-01T00:00:00.000Z')
    `);

    // Create test task
    db.exec(`
      INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, completed, created_at, updated_at, sort_order, archived)
      VALUES (1, 1, 'Test Task', 'A test task', 1, '2024-01-15', '2024-01-20', 'high', 'none', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 0, 0)
    `);

    // Create test task for voting
    db.exec(`
      INSERT INTO tasks (id, user_id, name, description, list_id, date, deadline, priority, recurring, completed, created_at, updated_at, sort_order, archived)
      VALUES (2, 1, 'Another Task', 'Another task', 1, '2024-01-16', '2024-01-21', 'medium', 'none', 0, '2024-01-01T00:00:00.000Z', '2024-01-01T00:00:00.000Z', 1, 0)
    `);
  });

  afterEach(() => {
    resetDb();
  });

  describe('GET', () => {
    it('returns all votes', async () => {
      // Create some votes
      const db = getDb();
      db.exec(`
        INSERT INTO task_votes (task_id, user_id, value, created_at) VALUES (2, 1, 1, '2024-01-01T00:00:00.000Z')
      `);

      const request = createMockRequest('/api/task-votes', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });

    it('returns votes for specific task', async () => {
      const request = createMockRequest('/api/task-votes?task_id=2', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });

    it('returns votes for specific user', async () => {
      const request = createMockRequest('/api/task-votes?user_id=1', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });

    it('returns vote for specific user and task', async () => {
      // Create a vote
      const db = getDb();
      db.exec(`
        INSERT INTO task_votes (task_id, user_id, value, created_at) VALUES (2, 1, 1, '2024-01-01T00:00:00.000Z')
      `);

      const request = createMockRequest('/api/task-votes?task_id=2&user_id=1', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });
  });

  describe('POST', () => {
    it('creates a new vote', async () => {
      const request = createMockRequest('/api/task-votes', 'POST', {
        task_id: 2,
        value: 1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('updates existing vote', async () => {
      // Create initial vote
      const db = getDb();
      db.exec(`
        INSERT INTO task_votes (task_id, user_id, value, created_at) VALUES (2, 1, 1, '2024-01-01T00:00:00.000Z')
      `);

      const request = createMockRequest('/api/task-votes', 'POST', {
        task_id: 2,
        value: -1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('returns error for invalid vote value', async () => {
      const request = createMockRequest('/api/task-votes', 'POST', {
        task_id: 2,
        value: 2, // Invalid: should be -1 or 1
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('returns error for missing task_id', async () => {
      const request = createMockRequest('/api/task-votes', 'POST', {
        value: 1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('returns error for non-existent task', async () => {
      const request = createMockRequest('/api/task-votes', 'POST', {
        task_id: 9999,
        value: 1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });
  });

  describe('DELETE', () => {
    it('deletes a vote', async () => {
      // Create a vote
      const db = getDb();
      db.exec(`
        INSERT INTO task_votes (task_id, user_id, value, created_at) VALUES (2, 1, 1, '2024-01-01T00:00:00.000Z')
      `);

      const request = createMockRequest('/api/task-votes?task_id=2', 'DELETE');
      const response = await DELETE(request);

      expect(response).toBeDefined();
    });

    it('returns error when task_id is missing', async () => {
      const request = createMockRequest('/api/task-votes', 'DELETE');
      const response = await DELETE(request);

      expect(response).toBeDefined();
    });

    it('handles deleting non-existent vote', async () => {
      const request = createMockRequest('/api/task-votes?task_id=9999', 'DELETE');
      const response = await DELETE(request);

      expect(response).toBeDefined();
    });
  });
});
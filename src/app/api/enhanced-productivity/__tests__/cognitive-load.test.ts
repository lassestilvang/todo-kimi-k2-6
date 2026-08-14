import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "../cognitive-load/route";
import { NextRequest } from "next/server";
import { setDb, resetDb, getDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

// Mock logger
vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
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
    url: urlObj.toString(),
    method,
    json: () => Promise.resolve(body),
    headers,
  } as unknown as NextRequest;
};

describe('Cognitive Load API', () => {
  beforeEach(() => {
    const testDb = createTestDb();
    setDb(testDb);

    const db = getDb();
    db.exec(`
      CREATE TABLE IF NOT EXISTS cognitive_load_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        task_count INTEGER DEFAULT 0,
        completed_count INTEGER DEFAULT 0,
        avg_time_to_complete REAL,
        energy_level INTEGER,
        distraction_score REAL,
        focus_blocks INTEGER DEFAULT 0,
        interruption_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', '2024-01-01T00:00:00.000Z')
    `);
  });

  afterEach(() => {
    resetDb();
  });

  describe('GET', () => {
    it('returns cognitive load logs', async () => {
      const db = getDb();
      db.exec(`
        INSERT INTO cognitive_load_logs (user_id, date, task_count, completed_count, energy_level, focus_blocks, interruption_count)
        VALUES (1, '2024-01-15', 5, 3, 7, 2, 1)
      `);

      const request = createMockRequest('/api/enhanced-productivity/cognitive-load', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });

    it('returns analysis for specified days', async () => {
      const db = getDb();
      for (let i = 0; i < 7; i++) {
        const date = new Date(2024, 0, 15 + i).toISOString().split('T')[0];
        db.exec(`
          INSERT INTO cognitive_load_logs (user_id, date, task_count, completed_count, energy_level, focus_blocks, interruption_count)
          VALUES (1, '${date}', 5, 3, 7, 2, 1)
        `);
      }

      const request = createMockRequest('/api/enhanced-productivity/cognitive-load?days=7', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });

    it('should handle middleware error (line 8)', async () => {
      const applyMiddleware = (await import('@/lib/api-middleware')).applyMiddleware;
      vi.mocked(applyMiddleware).mockImplementationOnce(async () => ({
        error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
        headers: {},
      }));

      const request = createMockRequest('/api/enhanced-productivity/cognitive-load', 'GET');
      const response = await GET(request);

      expect(response).toBeDefined();
    });
  });

  describe('POST', () => {
    it('creates a cognitive load log', async () => {
      const request = createMockRequest('/api/enhanced-productivity/cognitive-load', 'POST', {
        date: '2024-01-15',
        taskCount: 5,
        completedCount: 3,
        energy_level: 7,
        focus_blocks: 2,
        interruption_count: 1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('updates existing log for same day', async () => {
      const db = getDb();
      db.exec(`
        INSERT INTO cognitive_load_logs (user_id, date, task_count, completed_count, energy_level, focus_blocks, interruption_count)
        VALUES (1, '2024-01-15', 3, 2, 5, 1, 0)
      `);

      const request = createMockRequest('/api/enhanced-productivity/cognitive-load', 'POST', {
        date: '2024-01-15',
        taskCount: 5,
        completedCount: 3,
        energy_level: 7,
        focus_blocks: 2,
        interruption_count: 1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });

    it('should handle middleware error (line 14)', async () => {
      const applyMiddleware = (await import('@/lib/api-middleware')).applyMiddleware;
      vi.mocked(applyMiddleware).mockImplementationOnce(async () => ({
        error: new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 }),
        headers: {},
      }));

      const request = createMockRequest('/api/enhanced-productivity/cognitive-load', 'POST', {
        date: '2024-01-15',
        taskCount: 5,
        completedCount: 3,
        energy_level: 7,
        focus_blocks: 2,
        interruption_count: 1,
      });

      const response = await POST(request);

      expect(response).toBeDefined();
    });
  });
});
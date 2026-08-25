import { describe, it, expect, beforeEach, afterEach, vi, afterAll } from 'vitest';
import { GET, POST } from '../route';
import { createTestDb } from '@/lib/db/test-db';
import { setDb, resetDb } from '@/lib/db';

// Set up demo mode for authentication
const originalNodeEnv = process.env.NODE_ENV;
const originalNextAuthSecret = process.env.NEXTAUTH_SECRET;

beforeAll(() => {
  (process.env as any).NODE_ENV = 'test';
  (process.env as any).NEXTAUTH_SECRET = 'demo-secret';
});

afterAll(() => {
  (process.env as any).NODE_ENV = originalNodeEnv;
  (process.env as any).NEXTAUTH_SECRET = originalNextAuthSecret;
});

vi.mock('@/lib/api-middleware', () => ({
  applyMiddleware: vi.fn().mockResolvedValue({
    error: null,
    headers: {},
    auth: { userId: 1 },
    apiKey: 'test-key'
  }),
  errorResponse: (message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: message }),
  }),
  jsonResponse: (data: any, status: number = 200) => ({
    status,
    json: () => Promise.resolve(data),
  }),
}));

vi.mock('@/lib/ai', () => ({
  parseTaskInput: vi.fn().mockResolvedValue({
    tasks: [{ id: 1, name: 'Test Task', completed: false, priority: 'medium' }],
    confidence: 0.9,
  }),
  generateTaskInsights: vi.fn().mockResolvedValue({
    insights: ['Test insight 1', 'Test insight 2'],
    summary: 'Test summary',
  }),
  generateTasksFromNotes: vi.fn().mockResolvedValue({
    tasks: [{ id: 1, name: 'Generated Task', completed: false, priority: 'medium' }],
  }),
  parseEditCommand: vi.fn().mockResolvedValue({
    action: 'edited',
    task: { id: 1, name: 'Updated Task' },
  }),
  getAIManager: vi.fn().mockReturnValue({
    parseTask: vi.fn().mockResolvedValue({
      tasks: [{ id: 1, name: 'Streamed Task', completed: false, priority: 'medium' }],
    }),
  }),
}));

vi.mock('@/lib/rate-limiter', () => ({
  getClientKey: vi.fn().mockReturnValue('test-client'),
  checkRateLimit: vi.fn().mockResolvedValue({
    allowed: true,
    remaining: 19,
    resetTime: Date.now() + 60000,
  }),
}));

vi.mock('@/lib/ai/config', () => ({
  getAIConfigStatus: vi.fn().mockReturnValue({
    configured: true,
    provider: 'openai',
    model: 'gpt-4o-mini',
  }),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

function createMockRequest(
  url: string,
  options: { method?: string; body?: unknown } = {}
): any {
  const parsedUrl = new URL(url, 'http://localhost');
  return {
    nextUrl: {
      pathname: parsedUrl.pathname,
      searchParams: parsedUrl.searchParams,
    },
    json: () => Promise.resolve(options.body || {}),
    method: options.method || 'GET',
  };
}

describe('AI API', () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDb();
  });

  describe('GET /api/ai', () => {
    it('returns AI configuration status', async () => {
      const response = await GET();
      expect(response).toBeDefined();
    });
  });

  describe('POST /api/ai', () => {
    it('handles parse action', async () => {
      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'parse',
          input: { text: 'Create a new project' },
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('handles insights action', async () => {
      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'insights',
          input: {
            tasks: [
              { id: 1, name: 'Task 1', completed: true, priority: 'high' },
              { id: 2, name: 'Task 2', completed: false, priority: 'medium' },
            ],
          },
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('handles generateTasks action', async () => {
      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'generateTasks',
          input: {
            notes: 'Plan the product launch with these steps...',
          },
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('handles edit action', async () => {
      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'edit',
          input: {
            text: 'Mark task 1 as completed',
            tasks: [{ id: 1, name: 'Task 1', completed: false, priority: 'medium' }],
          },
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('returns 400 for invalid request type', async () => {
      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'invalid-type',
          input: {},
        },
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid request type');
    });

    it('handles middleware errors', async () => {
      const { applyMiddleware } = await import('@/lib/api-middleware');
      (applyMiddleware as any).mockResolvedValueOnce({
        error: { status: 401, json: () => Promise.resolve({ error: 'Not authenticated' }) },
      });

      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: { type: 'parse', input: {} },
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('handles rate limiting', async () => {
      const { checkRateLimit } = await import('@/lib/rate-limiter');
      (checkRateLimit as any).mockResolvedValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
      });

      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: { type: 'parse', input: {} },
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(429);
      expect(data.error).toContain('Rate limit');
    });

    it('handles errors in parse action', async () => {
      const { parseTaskInput } = await import('@/lib/ai');
      (parseTaskInput as any).mockRejectedValueOnce(new Error('API error'));

      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'parse',
          input: { text: 'Test task' },
        },
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process AI request');
    });

    it('handles errors in insights action', async () => {
      const { generateTaskInsights } = await import('@/lib/ai');
      (generateTaskInsights as any).mockRejectedValueOnce(new Error('Insights error'));

      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'insights',
          input: { tasks: [] },
        },
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process AI request');
    });

    it('handles errors in generateTasks action', async () => {
      const { generateTasksFromNotes } = await import('@/lib/ai');
      (generateTasksFromNotes as any).mockRejectedValueOnce(new Error('Generation error'));

      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'generateTasks',
          input: { notes: 'Test notes' },
        },
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process AI request');
    });

    it('handles errors in edit action', async () => {
      const { parseEditCommand } = await import('@/lib/ai');
      (parseEditCommand as any).mockRejectedValueOnce(new Error('Edit error'));

      const request = createMockRequest('http://localhost/api/ai', {
        method: 'POST',
        body: {
          type: 'edit',
          input: { text: 'Edit task', tasks: [] },
        },
      });

      const response = await POST(request);
      const data = await response.json();
      expect(response.status).toBe(500);
      expect(data.error).toBe('Failed to process AI request');
    });
  });
});
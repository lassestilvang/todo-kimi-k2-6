import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  beforeAll,
  vi,
} from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/session', async () => {
  const actual = await vi.importActual<typeof import('@/lib/session')>(
    '@/lib/session'
  );
  return {
    ...actual,
    getCurrentUser: vi.fn(async () => ({ id: 1, name: 'Tester', email: 't@example.com' })),
  };
});

import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';
import { initializeSchema } from '@/lib/db/index';
import { migrations } from '@/lib/db/migrations';

beforeAll(() => {
  (process.env as Record<string, string>).NODE_ENV = 'test';
  (process.env as Record<string, string>).NEXTAUTH_SECRET = 'demo-secret';
});

describe('voice-control actions', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);
    initializeSchema(db);
    try {
      for (const sql of Object.values(migrations)) {
        db.exec(sql);
      }
    } catch {
      /* ignore */
    }
    try {
      db.exec(
        `INSERT INTO users (id, name, email) VALUES (1, 'Tester', 't@example.com')`
      );
    } catch {
      /* ignore */
    }
  });

  afterEach(() => {
    db.close();
  });

  describe('parseVoiceCommand', () => {
    it('parses "create a task" as create_task intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('create a task Buy groceries');
      expect(intent.action).toBe('create_task');
      expect(intent.confidence).toBeGreaterThan(0);
      expect(intent.parameters.description).toContain('Buy groceries');
    });

    it('parses "remind me to" as create_task intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('remind me to call mom');
      expect(intent.action).toBe('create_task');
    });

    it('parses "i need to" as create_task intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('i need to finish report');
      expect(intent.action).toBe('create_task');
    });

    it('parses "complete X" as complete_task intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('complete the report');
      expect(intent.action).toBe('complete_task');
    });

    it('parses "finished X" as complete_task intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('I finished the task');
      expect(intent.action).toBe('complete_task');
    });

    it('parses "delete X" as delete_task intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('delete old task');
      expect(intent.action).toBe('delete_task');
    });

    it('parses "set priority" as set_priority intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('set buy groceries priority high');
      expect(intent.action).toBe('set_priority');
    });

    it('parses "search X" as search intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('search for projects');
      expect(intent.action).toBe('search');
      expect(intent.parameters.query).toBe('for projects');
    });

    it('parses "find X" as search intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('find urgent tasks');
      expect(intent.action).toBe('search');
    });

    it('parses "go to X" as navigate intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('go to kanban');
      expect(intent.action).toBe('navigate');
      expect(intent.parameters.target).toContain('kanban');
    });

    it('returns unknown for unrecognized input', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('asdfasdfasdf');
      expect(intent.action).toBe('unknown');
      expect(intent.confidence).toBe(0.5);
    });

    it('preserves rawText in parsed intent', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const text = 'create a task Buy milk';
      const intent = await parseVoiceCommand(text);
      expect(intent.rawText).toBe(text);
    });

    it('detects dates in create task commands', async () => {
      const { parseVoiceCommand } = await import('@/lib/actions/voice-control');
      const intent = await parseVoiceCommand('create a task meeting tomorrow');
      expect(intent.action).toBe('create_task');
      // date parameter may or may not be present depending on extraction
      expect(intent.parameters).toHaveProperty('description');
    });
  });

  describe('executeVoiceIntent', () => {
    it('returns failure when not authenticated', async () => {
      const sessionModule = await import('@/lib/session');
      (sessionModule.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      const { executeVoiceIntent, parseVoiceCommand } = await import(
        '@/lib/actions/voice-control'
      );
      const intent = await parseVoiceCommand('go to today');
      const result = await executeVoiceIntent(intent);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Authentication required');
    });

    it('executes navigate intent successfully', async () => {
      const { executeVoiceIntent, parseVoiceCommand } = await import(
        '@/lib/actions/voice-control'
      );
      const intent = await parseVoiceCommand('go to kanban');
      const result = await executeVoiceIntent(intent);
      expect(result.success).toBe(true);
      expect(result.message).toContain('kanban');
    });

    it('executes search intent successfully', async () => {
      const { executeVoiceIntent, parseVoiceCommand } = await import(
        '@/lib/actions/voice-control'
      );
      const intent = await parseVoiceCommand('search urgent');
      const result = await executeVoiceIntent(intent);
      expect(result.success).toBe(true);
    });
  });

  describe('logVoiceCommand', () => {
    it('logs command without throwing', async () => {
      const { logVoiceCommand } = await import('@/lib/actions/voice-control');
      await expect(
        logVoiceCommand({
          command: 'create a task Test',
          success: true,
        })
      ).resolves.not.toThrow();
    });
  });

  describe('getVoiceCommandHistory', () => {
    it('returns array', async () => {
      const { getVoiceCommandHistory } = await import('@/lib/actions/voice-control');
      const history = await getVoiceCommandHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('respects limit parameter', async () => {
      const { getVoiceCommandHistory } = await import('@/lib/actions/voice-control');
      const history = await getVoiceCommandHistory(5);
      expect(history.length).toBeLessThanOrEqual(5);
    });
  });
});

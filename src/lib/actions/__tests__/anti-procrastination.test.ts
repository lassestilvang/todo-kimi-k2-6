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

import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';
import { initializeSchema } from '@/lib/db/index';
import { migrations } from '@/lib/db/migrations';

beforeAll(() => {
  (process.env as Record<string, string>).NODE_ENV = 'test';
  (process.env as Record<string, string>).NEXTAUTH_SECRET = 'demo-secret';
});

describe('anti-procrastination actions', () => {
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

  it('detectProcrastination returns array', async () => {
    const { detectProcrastination } = await import(
      '@/lib/actions/anti-procrastination'
    );
    const r = await detectProcrastination();
    expect(Array.isArray(r)).toBe(true);
    if (r.length > 0) {
      const sig = r[0];
      expect(['low', 'medium', 'high']).toContain(sig.severity);
      expect([
        'break_down',
        'park',
        'drop',
        'schedule_kickstart',
        'buddy',
        'keep_going',
      ]).toContain(sig.suggested_action);
      expect(typeof sig.task_name).toBe('string');
      expect(typeof sig.message).toBe('string');
    }
  });

  it('signals are capped at 10', async () => {
    const { detectProcrastination } = await import(
      '@/lib/actions/anti-procrastination'
    );
    const r = await detectProcrastination();
    expect(r.length).toBeLessThanOrEqual(10);
  });

  it('bumpReschedule returns boolean', async () => {
    const { bumpReschedule } = await import(
      '@/lib/actions/anti-procrastination'
    );
    const r = await bumpReschedule(99999);
    expect(typeof r).toBe('boolean');
  });
});

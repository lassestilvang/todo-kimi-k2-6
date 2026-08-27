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

describe('parking-lot actions', () => {
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

  it('parkTask returns boolean', async () => {
    const { parkTask } = await import('@/lib/actions/parking-lot');
    const r = await parkTask({ task_id: 99999 });
    expect(typeof r).toBe('boolean');
  });

  it('unparkTask returns boolean', async () => {
    const { unparkTask } = await import('@/lib/actions/parking-lot');
    const r = await unparkTask(99999);
    expect(typeof r).toBe('boolean');
  });

  it('listParkedTasks returns an array', async () => {
    const { listParkedTasks } = await import('@/lib/actions/parking-lot');
    const list = await listParkedTasks();
    expect(Array.isArray(list)).toBe(true);
  });

  it('resurrectTask returns boolean (alias of unparkTask)', async () => {
    const { resurrectTask } = await import('@/lib/actions/parking-lot');
    const r = await resurrectTask(99999);
    expect(typeof r).toBe('boolean');
  });

  it('getResurrectionCandidates returns array', async () => {
    const { getResurrectionCandidates } = await import(
      '@/lib/actions/parking-lot'
    );
    const list = await getResurrectionCandidates();
    expect(Array.isArray(list)).toBe(true);
  });

  it('parkTask accepts parked_until and reason without crashing', async () => {
    const { parkTask } = await import('@/lib/actions/parking-lot');
    const r = await parkTask({
      task_id: 1,
      parked_until: '2099-12-31',
      reason: '  needs more research  ',
    });
    expect(typeof r).toBe('boolean');
  });
});

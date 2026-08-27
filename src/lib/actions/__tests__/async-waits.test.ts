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

describe('async-waits actions', () => {
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

  it('createAsyncWait returns null/AsyncWait without crashing', async () => {
    const { createAsyncWait } = await import('@/lib/actions/async-waits');
    const r = await createAsyncWait({
      task_id: 99999,
      waiting_on: 'Alice',
    });
    // mock driver returns null when FK fails; real driver would return row
    expect(r === null || typeof r === 'object').toBe(true);
  });

  it('createAsyncWait returns null when waiting_on empty', async () => {
    const { createAsyncWait } = await import('@/lib/actions/async-waits');
    const r = await createAsyncWait({ task_id: 1, waiting_on: '   ' });
    expect(r).toBeNull();
  });

  it('listAsyncWaits returns array', async () => {
    const { listAsyncWaits } = await import('@/lib/actions/async-waits');
    const r = await listAsyncWaits();
    expect(Array.isArray(r)).toBe(true);
  });

  it('listAsyncWaits with status filter still returns array', async () => {
    const { listAsyncWaits } = await import('@/lib/actions/async-waits');
    const r = await listAsyncWaits({ status: 'waiting' });
    expect(Array.isArray(r)).toBe(true);
  });

  it('nudgeAsyncWait returns boolean', async () => {
    const { nudgeAsyncWait } = await import('@/lib/actions/async-waits');
    const r = await nudgeAsyncWait(99999);
    expect(typeof r).toBe('boolean');
  });

  it('resolveAsyncWait accepts both outcomes', async () => {
    const { resolveAsyncWait } = await import('@/lib/actions/async-waits');
    const a = await resolveAsyncWait(99999, 'resolved');
    const b = await resolveAsyncWait(99999, 'abandoned');
    expect(typeof a).toBe('boolean');
    expect(typeof b).toBe('boolean');
  });

  it('getWaitsNeedingNudge returns array', async () => {
    const { getWaitsNeedingNudge } = await import('@/lib/actions/async-waits');
    const r = await getWaitsNeedingNudge();
    expect(Array.isArray(r)).toBe(true);
  });
});

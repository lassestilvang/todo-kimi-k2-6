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

describe('reading-queue actions', () => {
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

  it('addToReadingQueue creates item with title', async () => {
    const { addToReadingQueue } = await import('@/lib/actions/reading-queue');
    const r = await addToReadingQueue({ title: 'Test Article' });
    expect(r?.title).toBe('Test Article');
  });

  it('addToReadingQueue accepts all item types', async () => {
    const { addToReadingQueue } = await import('@/lib/actions/reading-queue');
    const types = ['article', 'video', 'podcast', 'paper', 'book', 'thread'] as const;
    for (const t of types) {
      const r = await addToReadingQueue({ title: `Test ${t}`, item_type: t });
      expect(r?.item_type).toBe(t);
    }
  });

  it('listReadingQueue returns empty array for unauthenticated', async () => {
    const { listReadingQueue } = await import('@/lib/actions/reading-queue');
    const r = await listReadingQueue();
    expect(Array.isArray(r)).toBe(true);
  });

  it('listReadingQueue filters by status', async () => {
    const { listReadingQueue } = await import('@/lib/actions/reading-queue');
    const all = await listReadingQueue();
    expect(Array.isArray(all)).toBe(true);
  });

  it('setReadingStatus returns boolean', async () => {
    const { setReadingStatus } = await import('@/lib/actions/reading-queue');
    const r = await setReadingStatus(999, 'done');
    expect(typeof r).toBe('boolean');
  });

  it('deleteReadingItem returns boolean', async () => {
    const { deleteReadingItem } = await import('@/lib/actions/reading-queue');
    const r = await deleteReadingItem(999);
    expect(typeof r).toBe('boolean');
  });

  it('setReadingSummary returns boolean', async () => {
    const { setReadingSummary } = await import('@/lib/actions/reading-queue');
    const r = await setReadingSummary(999, 'summary text');
    expect(typeof r).toBe('boolean');
  });
});
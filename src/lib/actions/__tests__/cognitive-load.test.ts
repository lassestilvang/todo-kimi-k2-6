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

describe('cognitive-load actions', () => {
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

  it('setCognitiveLoad returns boolean', async () => {
    const { setCognitiveLoad } = await import('@/lib/actions/cognitive-load');
    const r = await setCognitiveLoad(99999, 'deep');
    expect(typeof r).toBe('boolean');
  });

  it('setCognitiveLoad accepts all valid loads', async () => {
    const { setCognitiveLoad } = await import('@/lib/actions/cognitive-load');
    const loads = ['deep', 'creative', 'routine', 'social', 'emotional'] as const;
    for (const l of loads) {
      const r = await setCognitiveLoad(99999, l);
      expect(typeof r).toBe('boolean');
    }
  });

  it('getWeeklyCognitiveLoad returns expected shape', async () => {
    const { getWeeklyCognitiveLoad } = await import(
      '@/lib/actions/cognitive-load'
    );
    const d = await getWeeklyCognitiveLoad();
    expect(typeof d.total_tasks).toBe('number');
    expect(typeof d.total_minutes).toBe('number');
    expect(typeof d.over_capacity).toBe('boolean');
    expect(typeof d.week).toBe('string');
    expect(typeof d.by_load).toBe('object');
    expect(typeof d.by_load.deep).toBe('number');
    expect(typeof d.by_load.creative).toBe('number');
    expect(typeof d.by_load.routine).toBe('number');
    expect(typeof d.by_load.social).toBe('number');
    expect(typeof d.by_load.emotional).toBe('number');
  });

  it('getWeeklyCognitiveLoad has recommended shares that sum to 1', async () => {
    const { getWeeklyCognitiveLoad } = await import(
      '@/lib/actions/cognitive-load'
    );
    const d = await getWeeklyCognitiveLoad();
    const sum =
      d.recommended_share.deep +
      d.recommended_share.creative +
      d.recommended_share.routine +
      d.recommended_share.social +
      d.recommended_share.emotional;
    expect(Math.abs(sum - 1)).toBeLessThan(0.001);
  });

  it('suggestReorderedToday returns array', async () => {
    const { suggestReorderedToday } = await import(
      '@/lib/actions/cognitive-load'
    );
    const list = await suggestReorderedToday();
    expect(Array.isArray(list)).toBe(true);
  });
});

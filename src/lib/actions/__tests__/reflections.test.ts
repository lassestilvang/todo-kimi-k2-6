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

describe('reflections actions', () => {
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

  it('getReflection returns null for no user', async () => {
    const { getReflection } = await import('@/lib/actions/reflections');
    const r = await getReflection();
    expect(r).toBeNull();
  });

  it('getReflection returns reflection for user', async () => {
    const { saveReflection, getReflection } = await import(
      '@/lib/actions/reflections'
    );
    await saveReflection({ gratitude: 'Test gratitude' });
    const r = await getReflection();
    expect(r).toBeTruthy();
    expect(r?.gratitude).toBe('Test gratitude');
  });

  it('getReflection returns specific week', async () => {
    const { saveReflection, getReflection } = await import(
      '@/lib/actions/reflections'
    );
    await saveReflection({ gratitude: 'This week', week: '2024-01-01' });
    const r = await getReflection('2024-01-01');
    expect(r?.gratitude).toBe('This week');
  });

  it('listReflections returns array', async () => {
    const { listReflections } = await import('@/lib/actions/reflections');
    const r = await listReflections();
    expect(Array.isArray(r)).toBe(true);
  });

  it('saveReflection creates new record', async () => {
    const { saveReflection } = await import('@/lib/actions/reflections');
    const r = await saveReflection({
      surprised: 'Test surprise',
      worked: 'Test worked',
      did_not_work: 'Test failed',
      should_change: 'Change needed',
      gratitude: 'Gratitude note',
      mood_score: 8,
    });
    expect(r).toBeTruthy();
    expect(r?.surprised).toBe('Test surprise');
    expect(r?.mood_score).toBe(8);
  });

  it('saveReflection returns a reflection object', async () => {
    const { saveReflection } = await import('@/lib/actions/reflections');
    const r = await saveReflection({ gratitude: 'Test' });
    expect(r).toBeTruthy();
    expect(r?.gratitude).toBe('Test');
  });

  it('saveReflection sanitizes input', async () => {
    const { saveReflection } = await import('@/lib/actions/reflections');
    const r = await saveReflection({
      surprised: '<script>alert(1)</script>safe content',
    });
    expect(r?.surprised).not.toContain('<script>');
  });
});
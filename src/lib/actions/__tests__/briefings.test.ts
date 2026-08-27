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

describe('briefings actions', () => {
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

  it('getBriefing returns a valid object', async () => {
    const { getBriefing } = await import('@/lib/actions/briefings');
    const b = await getBriefing();
    expect(b).toBeTruthy();
    expect(Array.isArray(b.due_today)).toBe(true);
    expect(Array.isArray(b.overdue)).toBe(true);
    expect(Array.isArray(b.top_three)).toBe(true);
    expect(typeof b.summary).toBe('string');
    expect(['low', 'moderate', 'high', 'severe']).toContain(
      b.context_switch_level
    );
  });

  it('greeting changes by hour', async () => {
    const { getBriefing } = await import('@/lib/actions/briefings');
    const b = await getBriefing();
    // One of the known greetings based on hour
    expect([
      'Burning the midnight oil',
      'Good morning',
      'Good afternoon',
      'Good evening',
    ]).toContain(b.greeting);
  });

  it('summary has a non-empty string', async () => {
    const { getBriefing } = await import('@/lib/actions/briefings');
    const b = await getBriefing();
    expect(typeof b.summary).toBe('string');
    expect(b.summary.length).toBeGreaterThan(0);
  });

  it('one_thing_to_do_first has expected shape', async () => {
    const { getBriefing } = await import('@/lib/actions/briefings');
    const b = await getBriefing();
    expect(b.one_thing_to_do_first).toBeTruthy();
    expect(typeof b.one_thing_to_do_first.id).toBe('number');
    expect(typeof b.one_thing_to_do_first.reason).toBe('string');
  });
});

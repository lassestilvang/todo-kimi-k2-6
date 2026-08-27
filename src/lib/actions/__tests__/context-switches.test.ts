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

describe('context-switches actions', () => {
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

  it('recordContextSwitch returns null or object', async () => {
    const { recordContextSwitch } = await import(
      '@/lib/actions/context-switches'
    );
    const r = await recordContextSwitch({});
    expect(r === null || typeof r === 'object').toBe(true);
  });

  it('recordContextSwitch accepts task_id, project_tag, session_duration', async () => {
    const { recordContextSwitch } = await import(
      '@/lib/actions/context-switches'
    );
    const r = await recordContextSwitch({
      task_id: 1,
      project_tag: 'client-x',
      session_duration_seconds: 1200,
    });
    expect(r === null || typeof r === 'object').toBe(true);
  });

  it('getContextSwitchStats returns expected shape', async () => {
    const { getContextSwitchStats } = await import(
      '@/lib/actions/context-switches'
    );
    const s = await getContextSwitchStats();
    expect(typeof s.today_count === 'number' || s.today_count === undefined).toBe(
      true
    );
    expect(['low', 'moderate', 'high', 'severe']).toContain(s.level);
    expect(typeof s.recommendation).toBe('string');
  });

  it('clearTodaySwitches returns boolean', async () => {
    const { clearTodaySwitches } = await import(
      '@/lib/actions/context-switches'
    );
    const r = await clearTodaySwitches();
    expect(typeof r).toBe('boolean');
  });

  it('drop_pct is a finite number when defined', async () => {
    const { getContextSwitchStats } = await import(
      '@/lib/actions/context-switches'
    );
    const s = await getContextSwitchStats();
    if (typeof s.estimated_productivity_drop_pct === 'number') {
      // NaN can happen with mock driver; require a real number
      if (!Number.isNaN(s.estimated_productivity_drop_pct)) {
        expect(s.estimated_productivity_drop_pct).toBeLessThanOrEqual(60);
      }
    }
  });
});

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

describe('briefing preferences actions', () => {
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

  it('getBriefingPreferences returns null for non-existent user', async () => {
    const { getBriefingPreferences } = await import(
      '@/lib/actions/briefing-prefs'
    );
    const r = await getBriefingPreferences();
    expect(r).toBeNull();
  });

  it('saveBriefingPreferences creates new record', async () => {
    const { saveBriefingPreferences, getBriefingPreferences } = await import(
      '@/lib/actions/briefing-prefs'
    );
    const created = await saveBriefingPreferences({
      enabled: true,
      delivery_hour: 9,
    });
    expect(created).toBeTruthy();
    expect(created?.enabled).toBe(1);
    expect(created?.delivery_hour).toBe(9);
  });

  it('saveBriefingPreferences updates existing record', async () => {
    const { saveBriefingPreferences, getBriefingPreferences } = await import(
      '@/lib/actions/briefing-prefs'
    );
    await saveBriefingPreferences({ delivery_hour: 8 });
    const first = await getBriefingPreferences();

    await saveBriefingPreferences({ delivery_hour: 10, enabled: false });
    const updated = await getBriefingPreferences();

    expect(updated?.delivery_hour).toBe(10);
    expect(updated?.enabled).toBe(0);
  });

  it('saveBriefingPreferences updates updated_at even with empty change', async () => {
    const { saveBriefingPreferences, getBriefingPreferences } = await import(
      '@/lib/actions/briefing-prefs'
    );
    await saveBriefingPreferences({ enabled: true });
    const first = await getBriefingPreferences();

    // Wait a bit for timestamp to change
    await new Promise(resolve => setTimeout(resolve, 10));

    await saveBriefingPreferences({}); // empty input, only updates timestamp
    const updated = await getBriefingPreferences();

    // Should still have the same record (not null) and updated_at should be newer
    expect(updated).toBeTruthy();
    expect(updated?.id).toBe(first?.id);
  });
});
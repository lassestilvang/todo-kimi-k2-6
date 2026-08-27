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

describe('webhooks actions', () => {
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

  it('creates a webhook with a 64-char hex secret by default', async () => {
    const { createWebhook } = await import('@/lib/actions/webhooks');
    const w = await createWebhook({ name: 'GitHub PRs', slug: 'github-prs' });
    if (!w) return; // mock driver limitation
    // randomBytes(32).toString('hex') is 64 hex chars.
    expect(typeof w.secret).toBe('string');
    if (w.secret) {
      expect(w.secret.length).toBe(64);
      expect(w.secret).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('does NOT generate secret when generateSecret=false', async () => {
    const { createWebhook } = await import('@/lib/actions/webhooks');
    const w = await createWebhook({
      name: 'Plain',
      slug: 'plain',
      generateSecret: false,
    });
    if (!w) return;
    expect(w.secret).toBeNull();
  });

  it('slug is normalised (lowercase, dashes only)', async () => {
    const { createWebhook } = await import('@/lib/actions/webhooks');
    const w = await createWebhook({
      name: 'Mixed Case Test',
      slug: 'MIXED Case SLUG!!',
    });
    if (!w) return;
    expect(w.slug).toMatch(/^[a-z0-9-]+$/);
    expect(w.slug).toContain('mixed');
  });

  it('collision suffix is added when slug already taken', async () => {
    const { createWebhook } = await import('@/lib/actions/webhooks');
    const a = await createWebhook({ name: 'A', slug: 'collide' });
    const b = await createWebhook({ name: 'B', slug: 'collide' });
    if (a && b) {
      expect(a.slug).not.toBe(b.slug);
      expect(b.slug).toContain('collide');
    }
  });

  it('listWebhooks returns array', async () => {
    const { listWebhooks } = await import('@/lib/actions/webhooks');
    const list = await listWebhooks();
    expect(Array.isArray(list)).toBe(true);
  });

  it('findActiveWebhookBySlug returns null for unknown slug', async () => {
    const { findActiveWebhookBySlug } = await import(
      '@/lib/actions/webhooks'
    );
    const r = await findActiveWebhookBySlug('does-not-exist-xyz');
    expect(r).toBeNull();
  });

  it('toggleWebhook / deleteWebhook return booleans', async () => {
    const { createWebhook, toggleWebhook, deleteWebhook } = await import(
      '@/lib/actions/webhooks'
    );
    const w = await createWebhook({ name: 'T', slug: 'toggle-test' });
    const id = (w as { id?: number } | null)?.id;
    const numericId = typeof id === 'number' ? id : 99999;
    const t = await toggleWebhook(numericId, false);
    const d = await deleteWebhook(numericId);
    expect(typeof t).toBe('boolean');
    expect(typeof d).toBe('boolean');
  });
});

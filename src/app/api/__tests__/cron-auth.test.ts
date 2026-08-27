import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the database so the cron route doesn't try to hit a real DB
vi.mock('@/lib/db', () => ({
  getDb: () => ({
    prepare: () => ({
      all: () => [],
      get: () => undefined,
      run: () => ({ lastInsertRowid: 0, changes: 0 }),
    }),
  }),
}));

vi.mock('@/lib/email', () => ({
  sendTaskReminderEmail: vi.fn().mockResolvedValue(undefined),
  sendDueSoonEmail: vi.fn().mockResolvedValue(undefined),
  sendWeeklyDigest: vi.fn().mockResolvedValue(undefined),
  shouldSendNotification: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

vi.mock('@/lib/actions/workflows', () => ({
  executeWorkflow: vi.fn().mockResolvedValue(undefined),
  evaluateConditions: vi.fn().mockResolvedValue(true),
}));

beforeAll(() => {
  process.env['CRON_SECRET'] = 'test-secret';
  (process.env as Record<string, string>)['NODE_ENV'] = 'test';
});

describe('cron auth gating', () => {
  it('reminders route returns 401 when no Authorization header', async () => {
    const { GET } = await import('@/app/api/cron/reminders/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/reminders')
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('reminders route returns 401 when CRON_SECRET is wrong', async () => {
    const { GET } = await import('@/app/api/cron/reminders/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/reminders', {
        headers: { authorization: 'Bearer wrong-secret' },
      })
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('reminders route returns 200 when CRON_SECRET matches', async () => {
    const { GET } = await import('@/app/api/cron/reminders/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/reminders', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });

  it('workflows cron route returns 401 when no Authorization header', async () => {
    const { GET } = await import('@/app/api/cron/workflows/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/workflows')
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('workflows cron route returns 200 with valid CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/workflows/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/workflows', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});

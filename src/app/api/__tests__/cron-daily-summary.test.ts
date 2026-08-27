import { describe, it, expect, beforeAll, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    prepare: () => ({
      all: () => [],
      get: () => undefined,
    }),
    exec: () => ({ changes: 0 }),
  }),
}));

vi.mock('@/lib/email', () => ({
  sendTaskReminderEmail: vi.fn(),
  sendDueSoonEmail: vi.fn(),
  sendWeeklyDigest: vi.fn(),
  shouldSendNotification: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
}));

beforeAll(() => {
  (process.env as Record<string, string>)['CRON_SECRET'] = 'test-secret';
  (process.env as Record<string, string>)['NODE_ENV'] = 'test';
});

describe('daily-summary cron auth', () => {
  it('returns 401 when no Authorization header', async () => {
    const { GET } = await import('@/app/api/cron/daily-summary/route');
    const req = new NextRequest(new Request('http://localhost/api/cron/daily-summary'));
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 401 when CRON_SECRET does not match', async () => {
    const { GET } = await import('@/app/api/cron/daily-summary/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/daily-summary', {
        headers: { authorization: 'Bearer wrong-secret' },
      })
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns 200 with valid CRON_SECRET', async () => {
    const { GET } = await import('@/app/api/cron/daily-summary/route');
    const req = new NextRequest(
      new Request('http://localhost/api/cron/daily-summary', {
        headers: { authorization: 'Bearer test-secret' },
      })
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
  });
});
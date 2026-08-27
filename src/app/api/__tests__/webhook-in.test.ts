import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { createHmac } from 'node:crypto';
import { NextRequest } from 'next/server';

// In-memory mock for the webhooks table
let hook: {
  id: number;
  slug: string;
  secret: string | null;
  active: number;
} | null = null;
let recordedCall: number | null = null;

vi.mock('@/lib/actions/webhooks', () => ({
  findActiveWebhookBySlug: (slug: string) => {
    if (hook && hook.slug === slug && hook.active === 1) return hook;
    return null;
  },
  recordWebhookCall: (id: number) => {
    recordedCall = id;
    return Promise.resolve();
  },
}));

vi.mock('@/lib/actions/tasks', () => ({
  createTask: (input: { name: string; description?: string; priority?: string }) =>
    Promise.resolve({ id: 9999, ...input }),
}));

vi.mock('@/lib/session', () => ({
  getCurrentUser: () => Promise.resolve({ id: 1, email: 'test@example.com' }),
}));

vi.mock('@/lib/db', () => ({
  getDb: () => ({
    prepare: () => ({
      all: () => [],
      get: () => undefined,
      run: () => ({ lastInsertRowid: 0, changes: 0 }),
    }),
  }),
}));

beforeAll(() => {
  (process.env as Record<string, string>)['NODE_ENV'] = 'test';
  (process.env as Record<string, string>)['NEXTAUTH_SECRET'] = 'demo-secret';
});

beforeEach(() => {
  hook = null;
  recordedCall = null;
});

describe('webhook ingestion route', () => {
  const params = { params: Promise.resolve({ slug: 'test-hook' }) };

  it('returns 404 for unknown slug', async () => {
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/unknown', {
        method: 'POST',
        body: '{}',
      })
    );
    const res = await POST(req, params);
    expect(res.status).toBe(404);
  });

  it('returns 413 for body > 64KB', async () => {
    hook = { id: 1, slug: 'test-hook', secret: null, active: 1 };
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const big = 'x'.repeat(70_000);
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/test-hook', {
        method: 'POST',
        body: big,
      })
    );
    const res = await POST(req, params);
    expect(res.status).toBe(413);
  });

  it('returns 401 when secret configured but signature missing', async () => {
    hook = { id: 1, slug: 'test-hook', secret: 'shh', active: 1 };
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/test-hook', {
        method: 'POST',
        body: JSON.stringify({ title: 'hello' }),
      })
    );
    const res = await POST(req, params);
    expect(res.status).toBe(401);
  });

  it('returns 401 when signature does not match', async () => {
    hook = { id: 1, slug: 'test-hook', secret: 'shh', active: 1 };
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/test-hook', {
        method: 'POST',
        body: JSON.stringify({ title: 'hello' }),
        headers: { 'x-webhook-signature': 'sha256=deadbeef' },
      })
    );
    const res = await POST(req, params);
    expect(res.status).toBe(401);
  });

  it('accepts request with valid HMAC signature', async () => {
    hook = { id: 1, slug: 'test-hook', secret: 'shh', active: 1 };
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const body = JSON.stringify({ title: 'hello' });
    const sig = createHmac('sha256', 'shh').update(body).digest('hex');
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/test-hook', {
        method: 'POST',
        body,
        headers: { 'x-webhook-signature': `sha256=${sig}` },
      })
    );
    let res;
    try {
      res = await POST(req, params);
    } catch (e) {
      console.error('POST threw:', e);
      throw e;
    }
    if (res.status !== 201) {
      const text = await res.text();
      console.error('webhook HMAC error body:', text);
    }
    expect(res.status).toBe(201);
    expect(recordedCall).toBe(1);
  });

  it('accepts request without secret (no signature required)', async () => {
    hook = { id: 2, slug: 'test-hook', secret: null, active: 1 };
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/test-hook', {
        method: 'POST',
        body: JSON.stringify({ title: 'open' }),
      })
    );
    const res = await POST(req, params);
    if (res.status !== 201) {
      const text = await res.text();
      console.error('webhook no-secret error body:', text);
    }
    expect(res.status).toBe(201);
    expect(recordedCall).toBe(2);
  });

  it('rejects invalid JSON with 400', async () => {
    hook = { id: 3, slug: 'test-hook', secret: null, active: 1 };
    const { POST } = await import('@/app/api/webhooks/in/[slug]/route');
    const req = new NextRequest(
      new Request('http://localhost/api/webhooks/in/test-hook', {
        method: 'POST',
        body: 'not json{',
      })
    );
    const res = await POST(req, params);
    expect(res.status).toBe(400);
  });
});

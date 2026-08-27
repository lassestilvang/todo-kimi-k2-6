import { NextRequest } from 'next/server';
import {
  listWebhooks,
  createWebhook,
  toggleWebhook,
  deleteWebhook,
} from '@/lib/actions/webhooks';
import { webhookSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const hooks = await listWebhooks();
    // Never echo the raw secret in the listing — only return its presence.
    const redacted = hooks.map(h => ({
      ...h,
      secret: h.secret ? '••••••••' : null,
    }));
    return jsonResponse({ webhooks: redacted }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const w = await createWebhook({
      ...parsed.data,
      generateSecret: body.generate_secret !== false,
    });
    return jsonResponse({ webhook: w }, 201, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function PATCH(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as { id: number; active: boolean };
    if (!body.id) return errorResponse('id required', 400);
    const ok = await toggleWebhook(body.id, body.active);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function DELETE(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));
    if (!Number.isFinite(id)) return errorResponse('id required', 400);
    const ok = await deleteWebhook(id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

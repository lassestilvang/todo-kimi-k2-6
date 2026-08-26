import { NextRequest } from 'next/server';
import {
  addToReadingQueue,
  listReadingQueue,
  setReadingStatus,
  setReadingSummary,
  deleteReadingItem,
} from '@/lib/actions/reading-queue';
import { readingQueueSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const status =
      (searchParams.get('status') as
        | 'queued'
        | 'in_progress'
        | 'done'
        | 'archived'
        | null) || undefined;
    return jsonResponse(
      { items: await listReadingQueue({ status: status ?? undefined }) },
      200,
      m.headers
    );
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = readingQueueSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const item = await addToReadingQueue(parsed.data);
    return jsonResponse({ item }, 201, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function PATCH(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as {
      id: number;
      action: 'status' | 'summary';
      status?: 'queued' | 'in_progress' | 'done' | 'archived';
      summary?: string;
      action_items?: string;
    };
    if (!body.id) return errorResponse('id required', 400);
    let ok = false;
    if (body.action === 'status' && body.status) {
      ok = await setReadingStatus(body.id, body.status);
    } else if (body.action === 'summary' && body.summary) {
      ok = await setReadingSummary(body.id, body.summary, body.action_items ?? null);
    }
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
    const ok = await deleteReadingItem(id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

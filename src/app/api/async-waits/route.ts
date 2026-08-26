import { NextRequest } from 'next/server';
import {
  createAsyncWait,
  listAsyncWaits,
  nudgeAsyncWait,
  resolveAsyncWait,
  getWaitsNeedingNudge,
} from '@/lib/actions/async-waits';
import { asyncWaitSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const nudgeOnly = searchParams.get('nudge') === '1';
    if (nudgeOnly) {
      return jsonResponse(
        { waits: await getWaitsNeedingNudge() },
        200,
        m.headers
      );
    }
    const status =
      (searchParams.get('status') as
        | 'waiting'
        | 'nudged'
        | 'resolved'
        | 'abandoned'
        | null) || undefined;
    return jsonResponse(
      { waits: await listAsyncWaits({ status: status ?? undefined }) },
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
    const parsed = asyncWaitSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const wait = await createAsyncWait(parsed.data);
    if (!wait) return errorResponse('Failed to create', 400);
    return jsonResponse({ wait }, 201, m.headers);
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
      action: 'nudge' | 'resolve' | 'abandon';
    };
    if (!body.id) return errorResponse('id required', 400);
    let ok = false;
    if (body.action === 'nudge') ok = await nudgeAsyncWait(body.id);
    if (body.action === 'resolve') ok = await resolveAsyncWait(body.id, 'resolved');
    if (body.action === 'abandon') ok = await resolveAsyncWait(body.id, 'abandoned');
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

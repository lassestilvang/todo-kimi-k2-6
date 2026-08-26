import { NextRequest } from 'next/server';
import {
  detectProcrastination,
  bumpReschedule,
} from '@/lib/actions/anti-procrastination';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const signals = await detectProcrastination();
    return jsonResponse({ signals }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as { task_id: number };
    if (!body.task_id) return errorResponse('task_id required', 400);
    const ok = await bumpReschedule(body.task_id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

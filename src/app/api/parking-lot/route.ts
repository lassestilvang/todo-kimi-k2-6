import { NextRequest } from 'next/server';
import {
  listParkedTasks,
  parkTask,
  unparkTask,
  getResurrectionCandidates,
} from '@/lib/actions/parking-lot';
import { parkTaskSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const resurrection = searchParams.get('resurrection') === '1';
    if (resurrection) {
      return jsonResponse(
        { candidates: await getResurrectionCandidates() },
        200,
        m.headers
      );
    }
    return jsonResponse({ tasks: await listParkedTasks() }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = parkTaskSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const ok = await parkTask(parsed.data);
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
    const taskId = Number(searchParams.get('task_id'));
    if (!Number.isFinite(taskId)) return errorResponse('task_id required', 400);
    const ok = await unparkTask(taskId);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

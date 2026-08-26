import { NextRequest } from 'next/server';
import {
  listAfterlife,
  findAfterlifePatterns,
  softDeleteTask,
} from '@/lib/actions/afterlife';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('patterns') === '1') {
      return jsonResponse(
        { patterns: await findAfterlifePatterns() },
        200,
        m.headers
      );
    }
    return jsonResponse({ entries: await listAfterlife() }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as {
      task_id: number;
      reason?: string;
    };
    if (!body.task_id) return errorResponse('task_id required', 400);
    const ok = await softDeleteTask(body.task_id, body.reason);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

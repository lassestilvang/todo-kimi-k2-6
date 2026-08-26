import { NextRequest } from 'next/server';
import {
  setCognitiveLoad,
  getWeeklyCognitiveLoad,
  suggestReorderedToday,
} from '@/lib/actions/cognitive-load';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('reorder') === '1') {
      return jsonResponse(
        { tasks: await suggestReorderedToday() },
        200,
        m.headers
      );
    }
    return jsonResponse(
      { distribution: await getWeeklyCognitiveLoad() },
      200,
      m.headers
    );
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function PATCH(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as {
      task_id: number;
      cognitive_load: 'deep' | 'creative' | 'routine' | 'social' | 'emotional';
    };
    if (!body.task_id || !body.cognitive_load) {
      return errorResponse('task_id and cognitive_load required', 400);
    }
    const ok = await setCognitiveLoad(body.task_id, body.cognitive_load);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

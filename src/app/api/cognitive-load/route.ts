import { NextRequest } from 'next/server';
import {
  setCognitiveLoad,
  getWeeklyCognitiveLoad,
  suggestReorderedToday,
} from '@/lib/actions/cognitive-load';
import { cognitiveLoadSchema } from '@/lib/validation';
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
    const body = await request.json();
    const parsed = cognitiveLoadSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Validation failed', 400, parsed.error.issues);
    }
    const ok = await setCognitiveLoad(parsed.data.task_id, parsed.data.cognitive_load);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

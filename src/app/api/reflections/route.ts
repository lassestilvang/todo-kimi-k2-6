import { NextRequest } from 'next/server';
import {
  saveReflection,
  getReflection,
  listReflections,
} from '@/lib/actions/reflections';
import { currentWeek } from '@/lib/week-utils';
import { reflectionSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    if (week === 'list') {
      return jsonResponse(
        { reflections: await listReflections() },
        200,
        m.headers
      );
    }
    const r = await getReflection(week ?? undefined);
    return jsonResponse({ reflection: r, current_week: currentWeek() }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = reflectionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const r = await saveReflection(parsed.data);
    return jsonResponse({ reflection: r }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

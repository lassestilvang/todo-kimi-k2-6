import { NextRequest } from 'next/server';
import { getBriefing } from '@/lib/actions/briefings';
import {
  getBriefingPreferences,
  saveBriefingPreferences,
} from '@/lib/actions/briefing-prefs';
import { briefingPreferencesSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('prefs') === '1') {
      return jsonResponse(
        { preferences: await getBriefingPreferences() },
        200,
        m.headers
      );
    }
    const briefing = await getBriefing();
    return jsonResponse({ briefing }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function PUT(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = briefingPreferencesSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const prefs = await saveBriefingPreferences(parsed.data);
    return jsonResponse({ preferences: prefs }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

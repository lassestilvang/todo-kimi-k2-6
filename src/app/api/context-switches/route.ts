import { NextRequest } from 'next/server';
import {
  recordContextSwitch,
  getContextSwitchStats,
  clearTodaySwitches,
} from '@/lib/actions/context-switches';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    return jsonResponse({ stats: await getContextSwitchStats() }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as {
      task_id?: number;
      project_tag?: string;
      session_duration_seconds?: number;
    };
    const r = await recordContextSwitch(body ?? {});
    return jsonResponse({ switch: r }, 201, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function DELETE(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const ok = await clearTodaySwitches();
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

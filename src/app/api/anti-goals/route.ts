import { NextRequest } from 'next/server';
import {
  listAntiGoals,
  createAntiGoal,
  toggleAntiGoal,
  deleteAntiGoal,
} from '@/lib/actions/anti-goals';
import { antiGoalSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    return jsonResponse({ anti_goals: await listAntiGoals() }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = antiGoalSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const ag = await createAntiGoal(parsed.data);
    return jsonResponse({ anti_goal: ag }, 201, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function PATCH(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as { id: number; active: boolean };
    if (!body.id) return errorResponse('id required', 400);
    const ok = await toggleAntiGoal(body.id, body.active);
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
    const ok = await deleteAntiGoal(id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

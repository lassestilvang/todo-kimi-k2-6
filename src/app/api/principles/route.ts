import { NextRequest } from 'next/server';
import {
  listPrinciples,
  createPrinciple,
  updatePrinciple,
  deletePrinciple,
  inferPrinciples,
} from '@/lib/actions/principles';
import { operatingPrincipleSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    const onlyActive = searchParams.get('active') !== '0';
    const category = searchParams.get('category') || undefined;
    const inferred = searchParams.get('infer') === '1';
    if (inferred) {
      const created = await inferPrinciples();
      return jsonResponse({ inferred: created }, 200, m.headers);
    }
    const principles = await listPrinciples({
      onlyActive,
      category: category as 'scheduling' | 'priority' | 'focus' | 'energy' | 'communication' | 'other' | undefined,
    });
    return jsonResponse({ principles }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = operatingPrincipleSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const p = await createPrinciple(parsed.data);
    return jsonResponse({ principle: p }, 201, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function PATCH(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const id = Number(body.id);
    if (!Number.isFinite(id)) return errorResponse('id required', 400);
    const parsed = operatingPrincipleSchema.partial().safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const p = await updatePrinciple(id, parsed.data);
    return jsonResponse({ principle: p }, 200, m.headers);
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
    const ok = await deletePrinciple(id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

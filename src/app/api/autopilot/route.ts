import { NextRequest } from 'next/server';
import {
  listAutopilotDecisions,
  markDecisionOverridden,
  autopilotDecide,
  listGuardrails,
  setGuardrail,
  deleteGuardrail,
} from '@/lib/actions/autopilot';
import { autopilotGuardrailSchema } from '@/lib/validation';
import { applyMiddleware, errorResponse, jsonResponse } from '@/lib/api-middleware';

export async function GET(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('guardrails') === '1') {
      return jsonResponse({ guardrails: await listGuardrails() }, 200, m.headers);
    }
    return jsonResponse(
      { decisions: await listAutopilotDecisions() },
      200,
      m.headers
    );
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 500);
  }
}

export async function POST(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as {
      decision_type: string;
      question: string;
      candidates: string[];
    };
    if (!body.decision_type || !body.question || !Array.isArray(body.candidates)) {
      return errorResponse('decision_type, question, candidates required', 400);
    }
    const r = await autopilotDecide(body);
    return jsonResponse({ ...r }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function PATCH(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = (await request.json()) as { id: number; action: 'override' };
    if (!body.id) return errorResponse('id required', 400);
    const ok = await markDecisionOverridden(body.id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

export async function PUT(request: NextRequest) {
  const m = await applyMiddleware(request, { requireAuth: true });
  if (m.error) return m.error;
  try {
    const body = await request.json();
    const parsed = autopilotGuardrailSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Validation failed', 400, parsed.error.issues);
    const g = await setGuardrail(parsed.data);
    return jsonResponse({ guardrail: g }, 200, m.headers);
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
    const ok = await deleteGuardrail(id);
    return jsonResponse({ ok }, 200, m.headers);
  } catch (e) {
    return errorResponse(e instanceof Error ? e.message : 'Failed', 400);
  }
}

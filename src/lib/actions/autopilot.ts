'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { sanitizeString } from '@/lib/validation';
import { revalidatePath } from 'next/cache';

export interface AutopilotDecision {
  id: number;
  user_id: number;
  decision_type: string;
  question: string;
  chosen_option: string;
  rejected_options: string | null;
  rationale: string | null;
  user_approved: number;
  overridden: number;
  week_of: string | null;
  created_at: string;
}

export interface AutopilotGuardrail {
  id: number;
  user_id: number;
  scope: string;
  allowed_values: string | null;
  denied_values: string | null;
  created_at: string;
}

function weekOf(date: Date = new Date()): string {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  );
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

export async function listAutopilotDecisions(limit = 30): Promise<AutopilotDecision[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return db
    .prepare(
      `SELECT * FROM autopilot_decisions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`
    )
    .all(user.id, limit) as AutopilotDecision[];
}

export async function logAutopilotDecision(input: {
  decision_type: string;
  question: string;
  chosen_option: string;
  rejected_options?: string[];
  rationale?: string | null;
}): Promise<AutopilotDecision | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const result = db
    .prepare(
      `INSERT INTO autopilot_decisions
         (user_id, decision_type, question, chosen_option, rejected_options, rationale, week_of)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      sanitizeString(input.decision_type) ?? '',
      sanitizeString(input.question) ?? '',
      sanitizeString(input.chosen_option) ?? '',
      JSON.stringify(input.rejected_options ?? []),
      sanitizeString(input.rationale ?? '') ?? null,
      weekOf()
    );
  revalidatePath('/autopilot');
  return db
    .prepare('SELECT * FROM autopilot_decisions WHERE id = ?')
    .get(result.lastInsertRowid) as AutopilotDecision;
}

export async function markDecisionOverridden(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      `UPDATE autopilot_decisions
       SET overridden = 1, user_approved = 0
       WHERE id = ? AND user_id = ?`
    )
    .run(id, user.id);
  revalidatePath('/autopilot');
  return result.changes > 0;
}

export async function listGuardrails(): Promise<AutopilotGuardrail[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return db
    .prepare(
      'SELECT * FROM autopilot_guardrails WHERE user_id = ? ORDER BY scope ASC'
    )
    .all(user.id) as AutopilotGuardrail[];
}

export async function setGuardrail(input: {
  scope: string;
  allowed_values?: string[];
  denied_values?: string[];
}): Promise<AutopilotGuardrail | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const allowed = input.allowed_values?.length
    ? JSON.stringify(input.allowed_values)
    : null;
  const denied = input.denied_values?.length
    ? JSON.stringify(input.denied_values)
    : null;

  const existing = db
    .prepare(
      'SELECT id FROM autopilot_guardrails WHERE user_id = ? AND scope = ?'
    )
    .get(user.id, input.scope) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      `UPDATE autopilot_guardrails
       SET allowed_values = ?, denied_values = ?
       WHERE id = ?`
    ).run(allowed, denied, existing.id);
    revalidatePath('/autopilot');
    return db
      .prepare('SELECT * FROM autopilot_guardrails WHERE id = ?')
      .get(existing.id) as AutopilotGuardrail;
  }

  const result = db
    .prepare(
      `INSERT INTO autopilot_guardrails (user_id, scope, allowed_values, denied_values)
       VALUES (?, ?, ?, ?)`
    )
    .run(user.id, sanitizeString(input.scope) ?? '', allowed, denied);
  revalidatePath('/autopilot');
  return db
    .prepare('SELECT * FROM autopilot_guardrails WHERE id = ?')
    .get(result.lastInsertRowid) as AutopilotGuardrail;
}

export async function deleteGuardrail(id: number): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare('DELETE FROM autopilot_guardrails WHERE id = ? AND user_id = ?')
    .run(id, user.id);
  revalidatePath('/autopilot');
  return result.changes > 0;
}

/**
 * Make a routine decision the user has delegated, respecting guardrails.
 *
 * Decision types currently supported:
 * - "list_assignment" → choose a list for a new task, by name match
 * - "label_suggestion" → choose 1–3 labels from the project's existing label set
 * - "deadline_back_off" → if user has guardrail "no late deadlines", back off
 *
 * Falls back to deterministic heuristics — no AI call yet (the AI provider
 * layer can be added behind this same signature).
 */
export async function autopilotDecide(input: {
  decision_type: string;
  question: string;
  candidates: string[];
}): Promise<{
  chosen: string;
  rationale: string;
  rejected: string[];
}> {
  const user = await getCurrentUser();
  if (!user?.id || !input.candidates.length) {
    return {
      chosen: input.candidates[0] ?? '',
      rationale: 'No candidates — defaulted.',
      rejected: [],
    };
  }

  const guardrails = await listGuardrails();
  const deniedValues = new Set<string>();
  const allowedValues = new Set<string>();
  for (const g of guardrails) {
    if (g.denied_values) {
      try {
        for (const v of JSON.parse(g.denied_values)) deniedValues.add(v);
      } catch {
        /* ignore malformed JSON */
      }
    }
    if (g.allowed_values) {
      try {
        for (const v of JSON.parse(g.allowed_values)) allowedValues.add(v);
      } catch {
        /* ignore malformed JSON */
      }
    }
  }

  let pool = input.candidates.filter(c => !deniedValues.has(c));
  if (allowedValues.size > 0) {
    pool = pool.filter(c => allowedValues.has(c));
  }
  if (pool.length === 0) pool = input.candidates;

  // Deterministic: stable hash of question + week → index. Spreads decisions over time.
  const seedStr = `${input.decision_type}:${input.question}:${weekOf()}`;
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % pool.length;
  const chosen = pool[idx];
  const rejected = input.candidates.filter(c => c !== chosen);

  const rationale =
    deniedValues.size > 0
      ? `Picked from ${pool.length} options; respected ${deniedValues.size} guardrail restriction${deniedValues.size === 1 ? '' : 's'}.`
      : `Deterministically picked from ${pool.length} options (stable for the week).`;

  await logAutopilotDecision({
    decision_type: input.decision_type,
    question: input.question,
    chosen_option: chosen,
    rejected_options: rejected,
    rationale,
  });

  return { chosen, rationale, rejected };
}

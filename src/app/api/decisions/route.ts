import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import type { DecisionEntry } from "@/types";

interface CreateDecisionInput {
  task_id?: number;
  user_id: number;
  decision_type: "priority" | "approach" | "tool" | "timeline" | "allocation" | "cancellation";
  question: string;
  rationale: string;
  outcome?: string;
  outcome_notes?: string;
  outcome_rating?: number;
}

// GET all decisions
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("task_id");

  const db = getDb();

  let query = "SELECT * FROM decisions WHERE user_id = ?";
  const params: any[] = [userId];

  if (taskId) {
    query += " AND task_id = ?";
    params.push(parseInt(taskId));
  }

  query += " ORDER BY created_at DESC";

  const decisions = db.prepare(query).all(...params) as DecisionEntry[];

  return jsonResponse(decisions);
}

interface CreateDecisionInput {
  task_id?: number;
  user_id: number;
  decision_type: "priority" | "approach" | "tool" | "timeline" | "allocation" | "cancellation";
  question: string;
  rationale?: string;
  options?: Array<{ option_text: string; pros?: string[]; cons?: string[] }>;
  outcome?: string;
  outcome_notes?: string;
  outcome_rating?: number;
}

// POST create decision
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const body = await request.json() as CreateDecisionInput;

  const { task_id, decision_type, question, rationale, options, outcome, outcome_notes, outcome_rating } = body;

  if (!question) {
    return errorResponse("Question is required", 400);
  }

  const db = getDb();

  const result = db
    .prepare(
      `INSERT INTO decisions (task_id, user_id, decision_type, question, rationale, outcome, outcome_notes, outcome_rating)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      task_id || null,
      userId,
      decision_type,
      question,
      rationale || null,
      outcome || null,
      outcome_notes || null,
      outcome_rating || null
    );

  const decisionId = result.lastInsertRowid as number;

  // Create options if provided
  if (options && options.length > 0) {
    for (const opt of options) {
      db.prepare(
        `INSERT INTO decision_options (decision_entry_id, option_text, pros, cons, estimated_impact, estimated_effort)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        decisionId,
        opt.option_text,
        opt.pros ? JSON.stringify(opt.pros) : null,
        opt.cons ? JSON.stringify(opt.cons) : null,
        null, // estimated_impact
        null  // estimated_effort
      );
    }
  }

  const decision = {
    id: decisionId,
    task_id: task_id || null,
    user_id: userId,
    decision_type,
    question,
    rationale: rationale || null,
    outcome: outcome || null,
    outcome_notes: outcome_notes || null,
    outcome_rating: outcome_rating || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    options: options || [],
  };

  return jsonResponse(decision, 201);
}

// PUT update decision outcome
export async function PUT(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const decisionId = parseInt(searchParams.get("id") || "0", 10);

  if (!decisionId) {
    return errorResponse("Decision ID is required", 400);
  }

  const body = await request.json();
  const { outcome, outcome_notes, outcome_rating } = body;

  const db = getDb();

  // Verify decision belongs to user
  const existing = db
    .prepare("SELECT id FROM decisions WHERE id = ? AND user_id = ?")
    .get(decisionId, userId);

  if (!existing) {
    return errorResponse("Decision not found or access denied", 404);
  }

  db
    .prepare(
      `UPDATE decisions SET outcome = ?, outcome_notes = ?, outcome_rating = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    )
    .run(outcome || null, outcome_notes || null, outcome_rating || null, decisionId);

  const updatedDecision = db
    .prepare("SELECT * FROM decisions WHERE id = ?")
    .get(decisionId) as DecisionEntry;

  return jsonResponse(updatedDecision);
}

// DELETE decision
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId || 1;
  const searchParams = request.nextUrl.searchParams;
  const decisionId = parseInt(searchParams.get("id") || "0", 10);

  if (!decisionId) {
    return errorResponse("Decision ID is required", 400);
  }

  const db = getDb();

  // Verify decision belongs to user
  const existing = db
    .prepare("SELECT id FROM decisions WHERE id = ? AND user_id = ?")
    .get(decisionId, userId);

  if (!existing) {
    return errorResponse("Decision not found or access denied", 404);
  }

  db.prepare("DELETE FROM decisions WHERE id = ?").run(decisionId);

  return jsonResponse({ success: true });
}
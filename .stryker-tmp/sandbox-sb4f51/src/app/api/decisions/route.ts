// @ts-nocheck
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import type { DecisionEntry } from "@/types";
import { z } from "zod";

const CreateDecisionInputSchema = z.object({
  task_id: z.number().optional(),
  user_id: z.number(),
  decision_type: z.enum(["priority", "approach", "tool", "timeline", "allocation", "cancellation"]),
  question: z.string().min(1).max(5000),
  rationale: z.string().optional(),
  options: z.array(z.object({
    option_text: z.string().min(1).max(1000),
    pros: z.array(z.string()).optional(),
    cons: z.array(z.string()).optional(),
    estimated_impact: z.string().optional(),
    estimated_effort: z.string().optional(),
  })).optional(),
  outcome: z.string().optional(),
  outcome_notes: z.string().optional(),
  outcome_rating: z.number().min(-1).max(1).optional(),
});

// GET all decisions
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const taskId = searchParams.get("task_id");

  const db = getDb();

  let query = "SELECT * FROM decisions WHERE user_id = ?";
  const params: (number | string)[] = [userId];

  if (taskId) {
    query += " AND task_id = ?";
    params.push(parseInt(taskId, 10));
  }

  query += " ORDER BY created_at DESC";

  const decisions = db.prepare(query).all(...params) as DecisionEntry[];

  return jsonResponse(decisions);
}

// POST create decision
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  try {
    const body = await request.json();
    const parsed = CreateDecisionInputSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO decisions (task_id, user_id, decision_type, question, rationale, outcome, outcome_notes, outcome_rating, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
      )
      .run(
        parsed.data.task_id || null,
        userId,
        parsed.data.decision_type,
        parsed.data.question,
        parsed.data.rationale || null,
        parsed.data.outcome || null,
        parsed.data.outcome_notes || null,
        parsed.data.outcome_rating || null
      );

    const decisionId = result.lastInsertRowid as number;

    // Create options if provided
    if (parsed.data.options && parsed.data.options.length > 0) {
      for (const opt of parsed.data.options) {
        db.prepare(
          `INSERT INTO decision_options (decision_entry_id, option_text, pros, cons, estimated_impact, estimated_effort)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          decisionId,
          opt.option_text,
          opt.pros ? JSON.stringify(opt.pros) : null,
          opt.cons ? JSON.stringify(opt.cons) : null,
          opt.estimated_impact || null,
          opt.estimated_effort || null
        );
      }
    }

    // Get options for the decision
    const options = db.prepare(`
      SELECT id, decision_entry_id, option_text, pros, cons, estimated_impact, estimated_effort
      FROM decision_options
      WHERE decision_entry_id = ?
    `).all(decisionId) as Array<{
      id: number;
      decision_entry_id: number;
      option_text: string;
      pros: string | null;
      cons: string | null;
      estimated_impact: string | null;
      estimated_effort: string | null;
    }>;

    const decision = {
      id: decisionId,
      task_id: parsed.data.task_id || null,
      user_id: userId,
      decision_type: parsed.data.decision_type,
      question: parsed.data.question,
      rationale: parsed.data.rationale || null,
      outcome: parsed.data.outcome || null,
      outcome_notes: parsed.data.outcome_notes || null,
      outcome_rating: parsed.data.outcome_rating || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      options: options.map(o => ({
        id: o.id,
        option_text: o.option_text,
        pros: o.pros ? JSON.parse(o.pros) : [],
        cons: o.cons ? JSON.parse(o.cons) : [],
        estimated_impact: o.estimated_impact,
        estimated_effort: o.estimated_effort,
      })),
    };

    return jsonResponse(decision, 201);
  } catch (error: any) {
    console.error("Failed to create decision:", error);
    return errorResponse(`Failed to create decision: ${error.message || "Unknown error"}`, 500);
  }
}

// PUT update decision outcome
export async function PUT(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const decisionId = parseInt(searchParams.get("id") || "0", 10);

  if (!decisionId) {
    return errorResponse("Decision ID required", 400);
  }

  try {
    const body = await request.json();
    const outcomeSchema = z.object({
      outcome: z.string().optional(),
      outcome_notes: z.string().optional(),
      outcome_rating: z.number().min(-1).max(1).optional(),
    });

    const parsed = outcomeSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid input: " + parsed.error.issues[0].message, 400);
    }

    const db = getDb();

    // Check if decision belongs to user
    const existing = db.prepare(`
      SELECT user_id FROM decisions WHERE id = ?
    `).get(decisionId) as { user_id: number } | undefined;

    if (!existing || existing.user_id !== userId) {
      return errorResponse("Decision not found or access denied", 404);
    }

    const updates: string[] = [];
    const values: unknown[] = [];

    if (parsed.data.outcome !== undefined) {
      updates.push("outcome = ?");
      values.push(parsed.data.outcome);
    }
    if (parsed.data.outcome_notes !== undefined) {
      updates.push("outcome_notes = ?");
      values.push(parsed.data.outcome_notes);
    }
    if (parsed.data.outcome_rating !== undefined) {
      updates.push("outcome_rating = ?");
      values.push(parsed.data.outcome_rating);
    }

    if (updates.length === 0) {
      return errorResponse("No updates provided", 400);
    }

    updates.push("updated_at = datetime('now')");
    values.push(decisionId);

    db.prepare(`
      UPDATE decisions
      SET ${updates.join(", ")}
      WHERE id = ?
    `).run(...values);

    const updatedDecision = db
      .prepare("SELECT * FROM decisions WHERE id = ?")
      .get(decisionId) as DecisionEntry | undefined;

    if (!updatedDecision) {
      return errorResponse("Decision not found", 404);
    }

    return jsonResponse(updatedDecision);
  } catch (error: any) {
    console.error("Failed to update decision:", error);
    return errorResponse(`Failed to update decision: ${error.message || "Unknown error"}`, 500);
  }
}

// DELETE decision
export async function DELETE(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) return middleware.error;

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("User not authenticated", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const decisionId = parseInt(searchParams.get("id") || "0", 10);

  if (!decisionId) {
    return errorResponse("Decision ID required", 400);
  }

  try {
    const db = getDb();

    // Check if decision belongs to user
    const existing = db
      .prepare("SELECT id FROM decisions WHERE id = ? AND user_id = ?")
      .get(decisionId, userId);

    if (!existing) {
      return errorResponse("Decision not found or access denied", 404);
    }

    db.prepare("DELETE FROM decisions WHERE id = ?").run(decisionId);

    return jsonResponse({ success: true });
  } catch (error: any) {
    console.error("Failed to delete decision:", error);
    return errorResponse(`Failed to delete decision: ${error.message || "Unknown error"}`, 500);
  }
}
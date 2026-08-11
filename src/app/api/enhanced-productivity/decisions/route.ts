import { NextRequest, NextResponse } from "next/server";
import { applyMiddleware } from "@/lib/api-middleware";
import {
  createDecisionShadow,
  getDecisionAnalysis,
  getDecisions,
} from "@/lib/actions/enhanced-productivity";
import { getCurrentUser } from "@/lib/session";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const middlewareResult = await applyMiddleware(request, { requireAuth: true });
    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const analysisMode = searchParams.get("analysis") === "true";

    if (analysisMode) {
      const analysis = await getDecisionAnalysis(user.id, limit);
      return NextResponse.json(analysis);
    }

    // Return decisions as array when not in analysis mode
    const decisions = await getDecisions(user.id, limit);
    return NextResponse.json(decisions);
  } catch (error) {
    console.error("Error in decisions GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const middlewareResult = await applyMiddleware(request, { requireAuth: true });
    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();

    const result = await createDecisionShadow({
      decision_type: body.decision_type,
      question: body.question,
      chosen_option_text: body.chosen_option_text,
      rationale: body.rationale,
      opportunity_cost: body.opportunity_cost,
      time_spent_minutes: body.time_spent_minutes,
      context_tags: body.context_tags,
      alternative_options: body.alternative_options,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in decisions POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const middlewareResult = await applyMiddleware(request, { requireAuth: true });
    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = request.nextUrl.pathname;
    const match = url.match(/\/decisions\/(\d+)/);
    const decisionId = match ? parseInt(match[1]) : null;

    if (!decisionId) {
      return NextResponse.json({ error: "Decision ID required" }, { status: 400 });
    }

    const body = await request.json();
    const db = getDb();

    type SqlValue = string | number | null | undefined;
    const updates: string[] = [];
    const values: SqlValue[] = [];

    if (body.outcome !== undefined) {
      updates.push("outcome = ?");
      values.push(body.outcome);
    }
    if (body.outcome_rating !== undefined) {
      updates.push("outcome_rating = ?");
      values.push(body.outcome_rating);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    values.push(decisionId, user.id);

    db.prepare(`
      UPDATE decision_shadows
      SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `).run(...values);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in decisions PATCH:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const middlewareResult = await applyMiddleware(request, { requireAuth: true });
    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const url = request.nextUrl.pathname;
    const match = url.match(/\/decisions\/(\d+)/);
    const decisionId = match ? parseInt(match[1]) : null;

    if (!decisionId) {
      return NextResponse.json({ error: "Decision ID required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM decision_shadows WHERE id = ? AND user_id = ?")
      .run(decisionId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in decisions DELETE:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
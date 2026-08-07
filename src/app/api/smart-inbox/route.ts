import { NextRequest } from "next/server";
import type { InboxSourceType } from "@/lib/actions/smart-inbox";
import type { InboxSource } from "@/lib/actions/smart-inbox";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import {
  getSmartInbox,
  upsertInboxSource,
  convertSourceToTask,
  dismissSource,
  bulkConvertSourcesToTasks,
  deleteInboxSource,
  getInboxSummary,
} from "@/lib/actions/smart-inbox";
import { parseNaturalLanguageTask } from "@/lib/ai";
import { getDb } from "@/lib/db";

interface TriageUpdate {
  id: number;
  predicted_priority?: "critical" | "high" | "medium" | "low" | "none";
  predicted_due_date?: string;
  suggested_labels?: string;
  suggested_list?: string;
  ai_reasoning?: string;
}

function calculatePriorityScore(priority: string, dueDate?: string): number {
  const priorityScores: Record<string, number> = {
    critical: 100,
    high: 80,
    medium: 50,
    low: 20,
    none: 0,
  };

  let score = priorityScores[priority] || 50;

  if (dueDate) {
    const due = new Date(dueDate);
    const now = new Date();
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 0) score += 30;
    else if (diffDays <= 1) score += 20;
    else if (diffDays <= 3) score += 10;
  }

  return Math.min(100, Math.max(0, score));
}

export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const url = new URL(request.url);
  const params: {
    limit?: number;
    status?: string;
    sourceType?: InboxSourceType;
    sortBy?: "priority" | "date" | "confidence";
  } = {};

  if (url.searchParams.has("limit")) {
    const limit = url.searchParams.get("limit");
    if (limit) params.limit = parseInt(limit);
  }
  if (url.searchParams.has("status")) {
    const status = url.searchParams.get("status");
    if (status) params.status = status;
  }
  if (url.searchParams.has("sourceType")) {
    const sourceType = url.searchParams.get("sourceType");
    if (sourceType) params.sourceType = sourceType as InboxSourceType;
  }
  if (url.searchParams.has("sortBy")) {
    const sortBy = url.searchParams.get("sortBy");
    if (sortBy) params.sortBy = sortBy as "priority" | "date" | "confidence";
  }

  try {
    const inbox = await getSmartInbox(params);
    return jsonResponse({ inbox }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch smart inbox";
    return errorResponse(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  if (!middlewareResult.auth?.isAuthenticated) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await request.json();

    // Handle AI triage
    if (body.action === "triage") {
      const userId = middlewareResult.auth.userId;
      if (!userId) {
        return errorResponse("Unauthorized", 401);
      }

      const { itemIds } = body;
      if (!itemIds || !Array.isArray(itemIds) || itemIds.length === 0) {
        return errorResponse("Invalid itemIds", 400);
      }

      const dbInstance = getDb();

      // Fetch items to triage
      const items = dbInstance
        .prepare(
          `SELECT * FROM smart_inbox_sources
           WHERE id IN (${itemIds.map(() => "?").join(",")})
           AND user_id = ?
           AND status = 'pending'`
        )
        .all(...itemIds, userId) as InboxSource[];

      if (items.length === 0) {
        return jsonResponse({ updates: [] }, 200, middlewareResult.headers);
      }

      const updates: TriageUpdate[] = [];

      // Process each item with AI
      for (const item of items) {
        const text = item.title + (item.description ? ` ${item.description}` : "");

        let aiResult;
        try {
          aiResult = await parseNaturalLanguageTask(text);
        } catch (error) {
          console.error("AI parsing failed, using fallback:", error);
          aiResult = {
            name: item.title,
            priority: item.priority as "critical" | "high" | "medium" | "low" | "none",
            due_date: item.due_date,
            confidence: item.confidence || 50,
            labels: [],
            matches: []
          };
        }

        if (!aiResult) continue;

        const predictedDueDate = aiResult.due_date || item.due_date;
        const update: TriageUpdate = {
          id: item.id,
          predicted_priority: aiResult.priority || item.priority,
          predicted_due_date: predictedDueDate,
          suggested_labels: JSON.stringify(aiResult.labels || []),
          ai_reasoning: `AI analysis detected: ${aiResult.priority || "normal priority"} task with ${predictedDueDate ? `due ${predictedDueDate}` : "no immediate deadline"}`,
        };

        updates.push(update);

        // Update the item with AI insights
        dbInstance.prepare(`
          UPDATE smart_inbox_sources
          SET priority_score = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          calculatePriorityScore(update.predicted_priority || "medium", predictedDueDate),
          predictedDueDate,
          item.id
        );
      }

      return jsonResponse({ updates }, 200, middlewareResult.headers);
    }

    // Handle different action types
    if (body.action === "convert") {
      const task = await convertSourceToTask(body.sourceId);
      return jsonResponse({ task }, 200, middlewareResult.headers);
    }

    if (body.action === "bulkConvert") {
      const result = await bulkConvertSourcesToTasks(body.sourceIds || []);
      return jsonResponse({ result }, 200, middlewareResult.headers);
    }

    if (body.action === "dismiss") {
      await dismissSource(body.sourceId);
      return jsonResponse({ success: true }, 200, middlewareResult.headers);
    }

    if (body.action === "delete") {
      await deleteInboxSource(body.sourceId);
      return jsonResponse({ success: true }, 200, middlewareResult.headers);
    }

    if (body.action === "summary") {
      const summary = await getInboxSummary();
      return jsonResponse({ summary }, 200, middlewareResult.headers);
    }

    // Default: Create new source
    const source = await upsertInboxSource(body);
    return jsonResponse({ source }, 201, middlewareResult.headers);
  } catch (error) {
    console.error("POST error:", error);
    const message = error instanceof Error ? error.message : "Failed to process request";
    return errorResponse(message, 500);
  }
}

export async function PUT(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const { sourceId, updates } = body;

    if (!sourceId) {
      return errorResponse("sourceId is required", 400);
    }

    const dbInstance = getDb();

    dbInstance.prepare(`
      UPDATE smart_inbox_sources
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          due_date = COALESCE(?, due_date),
          priority = COALESCE(?, priority),
          confidence = COALESCE(?, confidence),
          predicted_priority = COALESCE(?, predicted_priority),
          predicted_due_date = COALESCE(?, predicted_due_date),
          suggested_labels = ?,
          ai_reasoning = COALESCE(?, ai_reasoning),
          metadata = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      updates.title,
      updates.description,
      updates.due_date,
      updates.priority,
      updates.confidence,
      updates.predicted_priority,
      updates.predicted_due_date,
      updates.suggested_labels ? JSON.stringify(updates.suggested_labels) : null,
      updates.ai_reasoning,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      sourceId
    );

    const source = await dbInstance.prepare(
      "SELECT * FROM smart_inbox_sources WHERE id = ?"
    ).get(sourceId);

    return jsonResponse({ source }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update source";
    return errorResponse(message, 400);
  }
}

export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const url = new URL(request.url);
  const sourceIdParam = url.searchParams.get("sourceId");

  if (!sourceIdParam) {
    return errorResponse("sourceId is required", 400);
  }

  try {
    await deleteInboxSource(parseInt(sourceIdParam));
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete source";
    return errorResponse(message, 400);
  }
}
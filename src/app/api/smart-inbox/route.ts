import { NextRequest } from "next/server";
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

export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const url = new URL(request.url);
  const params: {
    limit?: number;
    status?: string;
    sourceType?: string;
  } = {};

  if (url.searchParams.has("limit")) {
    params.limit = parseInt(url.searchParams.get("limit")!);
  }
  if (url.searchParams.has("status")) {
    params.status = url.searchParams.get("status")!;
  }
  if (url.searchParams.has("sourceType")) {
    params.sourceType = url.searchParams.get("sourceType")!;
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

  try {
    const body = await request.json();

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
    const message = error instanceof Error ? error.message : "Failed to process request";
    return errorResponse(message, 400);
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

    // Update source
    const db = (await import("@/lib/db")).getDb();

    const result = await db.prepare(`
      UPDATE smart_inbox_sources
      SET title = COALESCE(?, title),
          description = COALESCE(?, description),
          due_date = COALESCE(?, due_date),
          priority = COALESCE(?, priority),
          confidence = COALESCE(?, confidence),
          metadata = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      updates.title,
      updates.description,
      updates.due_date,
      updates.priority,
      updates.confidence,
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      sourceId
    );

    const source = await db.prepare("SELECT * FROM smart_inbox_sources WHERE id = ?").get(sourceId);

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
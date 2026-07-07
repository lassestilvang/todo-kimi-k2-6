import { NextRequest } from "next/server";
import { getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } from "@/lib/actions/time";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import type { CreateTimeEntryInput } from "@/types";

// GET /api/time-entries - Get time entries for a task
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return errorResponse("Task ID required", 400);
    }
    const entries = await getTimeEntries(Number(taskId));
    return jsonResponse({ entries }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch time entries";
    return errorResponse(message, 500);
  }
}

// POST /api/time-entries - Create a new time entry
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const entry = await addTimeEntry(body as CreateTimeEntryInput);
    return jsonResponse({ entry }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create time entry";
    return errorResponse(message, 400);
  }
}

// PUT /api/time-entries - Update a time entry
export async function PUT(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return errorResponse("Time entry ID required", 400);
    }
    const entry = await updateTimeEntry(id, updates);
    return jsonResponse({ entry }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update time entry";
    return errorResponse(message, 400);
  }
}

// DELETE /api/time-entries - Delete a time entry
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return errorResponse("Time entry ID required", 400);
    }
    await deleteTimeEntry(Number(id));
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete time entry";
    return errorResponse(message, 500);
  }
}
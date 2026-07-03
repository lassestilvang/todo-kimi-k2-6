import { NextRequest } from "next/server";
import {
  getTasks,
  createTask,
  getTimeReport,
} from "@/lib/actions";
import {
  syncOfflineTasks,
  getSyncStatus,
  clearSyncedTasks,
} from "@/lib/offline-storage";
import { taskSchema, searchParamsSchema } from "@/lib/validation";
import { logError } from "@/lib/logger";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";
import type { CreateTaskInput } from "@/types";

// GET /api/tasks - Get all tasks with optional filtering
export async function GET(request: NextRequest) {
  // Apply rate limiting middleware with auth requirement
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;

    // Validate and parse query parameters
    const queryParams = {
      view: searchParams.get("view") as "today" | "next7" | "upcoming" | "all" | "blocked" | undefined,
      listId: searchParams.get("listId"),
      includeCompleted: searchParams.get("includeCompleted"),
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      q: searchParams.get("q"),
    };

    const parsed = searchParamsSchema.safeParse(queryParams);
    if (!parsed.success) {
      return errorResponse("Invalid query parameters", 400);
    }

    const validated = parsed.data;

    const tasksList = await getTasks({
      view: validated.view,
      listId: validated.listId ? Number(validated.listId) : undefined,
      includeCompleted: validated.includeCompleted === "true",
    });

    return jsonResponse({ tasks: tasksList }, 200, middlewareResult.headers);
  } catch (error) {
    logError("Error fetching tasks", undefined, error instanceof Error ? error : new Error(String(error)));
    return errorResponse("Failed to fetch tasks", 500);
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  // Apply middleware with auth requirement
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = taskSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    const task = await createTask(parsed.data as CreateTaskInput);
    return jsonResponse({ task }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return errorResponse(message, 400);
  }
}

// PUT /api/tasks/sync - Sync offline tasks
export async function PUT(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const { action } = await request.json();

    if (action === "status") {
      const status = getSyncStatus();
      return jsonResponse({ status }, 200, middlewareResult.headers);
    }

    if (action === "sync") {
      const result = await syncOfflineTasks();
      return jsonResponse({ result }, 200, middlewareResult.headers);
    }

    if (action === "clear") {
      clearSyncedTasks();
      return jsonResponse({ success: true }, 200, middlewareResult.headers);
    }

    return errorResponse("Invalid action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return errorResponse(message, 500);
  }
}

// GET /api/tasks/time-report - Get time tracking reports
export async function GET_TIME_REPORT(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const taskIdParam = searchParams.get("taskId");

    // Validate taskId if provided
    let taskId: number | undefined;
    if (taskIdParam) {
      const parsed = Number(taskIdParam);
      if (isNaN(parsed) || parsed <= 0) {
        return errorResponse("Invalid task ID", 400);
      }
      taskId = parsed;
    }

    const reports = await getTimeReport({
      startDate,
      endDate,
      taskId
    } as Parameters<typeof getTimeReport>[0]);
    return jsonResponse({ reports }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to get time report";
    return errorResponse(message, 500);
  }
}

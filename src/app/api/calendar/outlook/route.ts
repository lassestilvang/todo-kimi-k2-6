import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  syncTaskToCalendar,
  removeFromCalendar,
  getOutlookAuthUrl,
  exchangeOutlookCodeForTokens,
  getOutlookUserProfile,
  type OutlookCalendarSync,
} from "@/lib/integrations/outlook-calendar";
import {
  enableCalendarSync,
  getCalendarSyncByProvider,
  deleteCalendarSyncByProvider,
} from "@/lib/actions/calendar";
import { getTasks } from "@/lib/actions/tasks";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";
import type { Task } from "@/types";

/**
 * Outlook Calendar API routes
 * Handles authentication, sync, and status for Outlook Calendar integration
 */

// GET - Get Outlook sync status or generate auth URL
export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("Authentication required", 401);
  }

  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "auth_url") {
    const state = generateState();
    const authUrl = getOutlookAuthUrl(state);
    return Response.json({ authUrl, state });
  }

  // Get sync status
  const sync = await getCalendarSyncByProvider(userId, "outlook");
  const enabled = !!sync?.enabled;
  const expiresAt = sync?.expires_at ? new Date(sync.expires_at).toISOString() : null;

  return jsonResponse({ enabled, expiresAt });
}

// POST - Sync tasks to Outlook or handle auth callback
export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request, { requireAuth: true });
  if (middleware.error) {
    return middleware.error;
  }

  const userId = middleware.auth?.userId;
  if (!userId) {
    return errorResponse("Authentication required", 401);
  }

  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "sync": {
        const sync = await getCalendarSyncByProvider(userId, "outlook");
        if (!sync?.enabled) {
          return errorResponse("Outlook Calendar is not connected", 400);
        }

        const result = await syncTasksToOutlook(userId, sync);
        return jsonResponse({ success: true, ...result });
      }

      case "enable": {
        const { accessToken, refreshToken, expiresIn, tenantId } = data;
        if (!accessToken || !refreshToken) {
          return errorResponse("access_token and refresh_token are required", 400);
        }

        await enableCalendarSync(
          userId,
          "outlook",
          accessToken,
          refreshToken,
          expiresIn * 1000,
          tenantId
        );

        return jsonResponse({ success: true, enabled: true });
      }

      case "disable": {
        await deleteCalendarSyncByProvider(userId, "outlook");
        return jsonResponse({ success: true, enabled: false });
      }

      default:
        return errorResponse("Invalid action", 400);
    }
  } catch (error) {
    console.error("Outlook calendar POST error:", error);
    return errorResponse(error instanceof Error ? error.message : "Failed to process request", 500);
  }
}

/**
 * Generate a random state string for OAuth
 */
function generateState(): string {
  return Buffer.from(Math.random().toString(36).substring(2)).toString("hex");
}

/**
 * Sync all user tasks to Outlook Calendar
 */
async function syncTasksToOutlook(
  userId: number,
  sync: Awaited<ReturnType<typeof getCalendarSyncByProvider>>
): Promise<{ created: number; updated: number; errors: string[] }> {
  const result = { created: 0, updated: 0, errors: [] as string[] };

  if (!sync || !sync.enabled) {
    return result;
  }

  // Cast to OutlookCalendarSync for type compatibility
  const outlookSync = sync as OutlookCalendarSync;

  // Get all incomplete tasks with due dates
  const db = getDb();
  const tasks = db
    .prepare(`
      SELECT t.*, COALESCE(l.name, 'Tasks') as list_name
      FROM tasks t
      LEFT JOIN lists l ON t.list_id = l.id
      WHERE t.user_id = ?
      AND t.completed = 0
      AND t.deadline IS NOT NULL
      ORDER BY t.deadline ASC
    `)
    .all(userId);

  for (const task of tasks as any[]) {
    try {
      await syncTaskToCalendar(
        {
          id: task.id,
          name: task.name,
          description: task.description,
          deadline: task.deadline,
          priority: task.priority,
          labels: task.labels ? JSON.parse(task.labels) : [],
        } as Task,
        outlookSync
      );
      result.created++;
    } catch (error) {
      result.errors.push(`Failed to sync task ${task.id}: ${(error as Error).message}`);
    }
  }

  return result;
}
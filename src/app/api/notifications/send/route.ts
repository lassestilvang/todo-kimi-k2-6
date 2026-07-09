import { getDb } from "@/lib/db";
import { sendTaskReminderEmail, sendDueSoonEmail, EmailTask } from "@/lib/email";
import { logError } from "@/lib/logger";
import { applyMiddleware, jsonResponse, errorResponse } from "@/lib/api-middleware";

interface DbTaskRow {
  id?: number;
  name?: string;
  description?: string | null;
  deadline?: string | null;
}

interface TaskRow {
  id: number;
  name: string;
  description: string | null;
  deadline: string | null;
  date: string | null;
  user_email: string;
  priority?: string;
  completed?: boolean;
}

/**
 * API endpoint to send task-related notifications
 * This would typically be called by a scheduled job or on-task-change trigger
 */
export async function POST(request: Request) {
  // Apply middleware - require authentication
  const middleware = await applyMiddleware(request as any, { requireAuth: true });
  if (middleware.error) return middleware.error;

  try {
    const body = await request.json();
    const { type, taskId, userId } = body;

    const db = getDb();
    const auth = middleware.auth;

    // Security: Only allow sending notifications for the authenticated user's tasks
    if (!auth?.isAuthenticated || !auth.userId) {
      return errorResponse("Authentication required", 401);
    }

    // The userId from body must match authenticated user (or be a shared task)
    const targetUserId = userId || auth.userId;
    if (targetUserId && targetUserId !== auth.userId) {
      return errorResponse("Unauthorized", 403);
    }

    // Use authenticated user's ID
    const effectiveUserId = auth.userId!;

    if (type === "reminder") {
      const task = db
        .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
        .get(taskId, effectiveUserId) as Partial<DbTaskRow> | null;
      if (task) {
        const taskData: EmailTask = {
          id: task.id ?? 0,
          name: task.name ?? "Unnamed Task",
          description: task.description ?? null,
          deadline: task.deadline ?? null,
        };
        await sendTaskReminderEmail(auth.email!, taskData);
      }
    }

    if (type === "due_soon") {
      const task = db
        .prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?")
        .get(taskId, effectiveUserId) as Partial<DbTaskRow> | null;
      if (task) {
        const taskData: EmailTask = {
          id: task.id ?? 0,
          name: task.name ?? "Unnamed Task",
          description: task.description ?? null,
          deadline: task.deadline ?? null,
        };
        await sendDueSoonEmail(auth.email!, taskData);
      }
    }

    return jsonResponse({ success: true });
  } catch (error) {
    logError(
      "Notification error",
      undefined,
      error instanceof Error ? error : new Error(String(error))
    );
    return Response.json({ error: "Failed to send notification" }, { status: 500 });
  }
}

/**
 * GET handler to process pending reminders
 * This would be called by a cron job
 */
export async function GET() {
  try {
    const db = getDb();
    const now = new Date();
    const today = now.toISOString().split("T")[0];

    // Find tasks due today or overdue
    const tasks = db
      .prepare(
        `SELECT t.*, u.email as user_email
         FROM tasks t
         JOIN task_shares ts ON t.id = ts.task_id
         JOIN users u ON ts.user_id = u.id
         WHERE t.deadline IS NOT NULL
         AND t.completed = 0
         AND t.deadline <= ?
         AND ts.permission = 'edit'`
      )
      .all(today) as TaskRow[];

    let sentCount = 0;
    for (const task of tasks) {
      const taskData: EmailTask = {
        id: task.id,
        name: task.name,
        description: task.description ?? null,
        deadline: task.deadline ?? null,
      };
      await sendDueSoonEmail(task.user_email, taskData);
      sentCount++;
    }

    return Response.json({ sent: sentCount });
  } catch (error) {
    console.error("Notification processing error:", error);
    return Response.json(
      { error: "Failed to process notifications" },
      { status: 500 }
    );
  }
}
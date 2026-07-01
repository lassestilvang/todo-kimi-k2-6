"use server";

import { getDb } from "@/lib/db";
import { sendTaskSharedEmail } from "@/lib/email";
import type { User, TaskWithRelations, Task } from "@/types";

/**
 * Share a task with a user and send notification email
 */
export async function shareTaskWithUser(
  taskId: number,
  userId: number,
  permission: "view" | "edit" = "view",
  senderId?: number
): Promise<{ success: boolean; emailSent: boolean }> {
  const db = getDb();

  // Check if user exists, if not create or get them
  let user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as User | undefined;

  if (!user && senderId) {
    // Try to find by email or create placeholder
    user = await getOrCreateUserById(userId);
  }

  if (!user) {
    throw new Error("User not found");
  }

  // Insert or update share
  db.prepare(
    "INSERT OR REPLACE INTO task_shares (task_id, user_id, permission) VALUES (?, ?, ?)"
  ).run(taskId, userId, permission);

  // Send email notification if sender info available
  let emailSent = false;
  if (senderId) {
    const sender = db.prepare("SELECT name, email FROM users WHERE id = ?").get(senderId) as User | undefined;
    if (sender && user.email) {
      const task = db.prepare("SELECT name FROM tasks WHERE id = ?").get(taskId) as { name: string } | undefined;
      if (task) {
        try {
          await sendTaskSharedEmail(user.email, { id: 0, name: task.name, description: null, notes: null, list_id: 1, date: null, deadline: null, estimate: null, actual_time: null, priority: "none", recurring: "none", recurring_config: null, completed: false, completed_at: null, created_at: "", updated_at: "", sort_order: 0 } as Task, sender.name || sender.email);
          emailSent = true;
        } catch (error) {
          console.error("Failed to send share email:", error);
        }
      }
    }
  }

  return { success: true, emailSent };
}

/**
 * Get or create user by ID
 */
async function getOrCreateUserById(id: number): Promise<User | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) as User | undefined;
}

/**
 * Get all users for sharing dropdown
 */
export async function getUsers(): Promise<Array<{ id: number; email: string; name: string | null }>> {
  const db = getDb();
  return db.prepare(
    "SELECT id, email, name FROM users ORDER BY name ASC, email ASC"
  ).all() as Array<{ id: number; email: string; name: string | null }>;
}

/**
 * Check if current user can access a shared task
 */
export async function canAccessTask(taskId: number, userId: number): Promise<"view" | "edit" | null> {
  const db = getDb();
  const share = db.prepare(
    "SELECT permission FROM task_shares WHERE task_id = ? AND user_id = ?"
  ).get(taskId, userId) as { permission: "view" | "edit" } | undefined;

  return share?.permission || null;
}

/**
 * Get tasks shared with a user
 */
export async function getSharedTasksForUser(userId: number): Promise<TaskWithRelations[]> {
  const db = getDb();
  const taskIds = db
    .prepare("SELECT task_id FROM task_shares WHERE user_id = ? AND permission = 'edit'")
    .all(userId)
    .map((r: { task_id: number }) => r.task_id);

  if (taskIds.length === 0) return [];

  // Get tasks with their relations
  const tasks = await Promise.all(
    taskIds.map(async (id) => {
      const task = await db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as TaskWithRelations;
      if (!task) return null;

      // Get relations
      const [labels, subtasks, reminders, attachments] = await Promise.all([
        db.prepare(
          `SELECT l.* FROM labels l
           JOIN task_labels tl ON l.id = tl.label_id
           WHERE tl.task_id = ?`
        ).all(id) as Array<{ id: number; name: string; icon: string; color: string; created_at: string }>,
        db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY id").all(id) as Array<{ id: number; task_id: number; name: string; completed: number; created_at: string }>,
        db.prepare("SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at").all(id) as Array<{ id: number; task_id: number; remind_at: string; created_at: string }>,
        db.prepare("SELECT * FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC").all(id) as Array<{ id: number; task_id: number; filename: string; file_size: number; mime_type: string; url: string; created_at: string }>,
      ]);

      return {
        ...task,
        labels,
        subtasks: subtasks.map(s => ({ ...s, completed: Boolean(s.completed) })),
        reminders,
        attachments,
        logs: [],
        comments: [],
        blockers: [],
        blocked_by: [],
      };
    })
  );

  return tasks.filter(Boolean) as TaskWithRelations[];
}
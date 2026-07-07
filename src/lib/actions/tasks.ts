"use server";

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type {
  Task,
  TaskWithRelations,
  List,
  Label,
  Subtask,
  Reminder,
  TaskLog,
  CreateTaskInput,
  UpdateTaskInput,
  CreateListInput,
  CreateLabelInput,
  FilterPreset,
  Priority,
} from "@/types";
import { listSchema, labelSchema, sanitizeString } from "@/lib/validation";
import { logTaskAction } from "@/lib/actions/task-helpers";

/**
 * Check for potential duplicate tasks by comparing names.
 * Returns similar tasks with similarity score > 0.7
 */
export async function findSimilarTasks(name: string, excludeTaskId?: number): Promise<Array<{ id: number; name: string; date: string | null; similarity: number }>> {
  const db = getDb();
  const user = await getCurrentUser();

  const whereClause = user?.id ? "WHERE user_id = ? OR user_id IS NULL" : "WHERE 1=1";
  const tasks = db
    .prepare(`SELECT id, name, date FROM tasks ${whereClause.replace("WHERE 1=1", "")}`)
    .all(user?.id ?? null) as Array<{ id: number; name: string; date: string | null }>;

  const normalizedInput = name.toLowerCase().trim();

  return tasks
    .filter(t => t.id !== excludeTaskId)
    .map(t => {
      const normalizedExisting = t.name.toLowerCase().trim();
      // Simple similarity: check if one contains the other or they share significant words
      const words = normalizedInput.split(/\s+/);
      const existingWords = normalizedExisting.split(/\s+/);

      const commonWords = words.filter(w => existingWords.includes(w));
      const similarity = words.length > 0 ? commonWords.length / words.length : 0;

      // Also check for substring matches
      const containsMatch = normalizedExisting.includes(normalizedInput) || normalizedInput.includes(normalizedExisting) ? 0.8 : 0;

      return { ...t, similarity: Math.max(similarity, containsMatch) };
    })
    .filter(t => t.similarity > 0.5)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

function logTaskAction(taskId: number, action: string, details?: string) {
  const db = getDb();
  db.prepare("INSERT INTO task_logs (task_id, action, details) VALUES (?, ?, ?)").run(
    taskId,
    action,
    details ? sanitizeString(details) : null
  );
}

export async function getLists(): Promise<List[]> {
  const db = getDb();
  const user = await getCurrentUser();

  // User isolation: only show lists owned by the user
  // In production, unauthenticated users should not see any lists
  if (user?.id) {
    return db.prepare(
      "SELECT * FROM lists WHERE user_id = ? ORDER BY is_inbox DESC, name ASC"
    ).all(user.id) as List[];
  }

  // In demo mode, show all lists (including inbox with is_inbox=1 which has no user_id)
  // DEPRECATED: This should not be used in production
  if (process.env.NODE_ENV !== "production") {
    return db.prepare("SELECT * FROM lists ORDER BY is_inbox DESC, name ASC").all() as List[];
  }

  return [];
}

export async function getListById(id: number): Promise<List | undefined> {
  const db = getDb();
  const user = await getCurrentUser();

  // User isolation: only show lists owned by the user
  if (user?.id) {
    return db
      .prepare("SELECT * FROM lists WHERE id = ? AND user_id = ?")
      .get(id, user.id) as List | undefined;
  }
  // In production, unauthenticated users can only see inbox
  if (process.env.NODE_ENV === "production") {
    return db.prepare("SELECT * FROM lists WHERE id = ? AND is_inbox = 1").get(id) as List | undefined;
  }
  return db.prepare("SELECT * FROM lists WHERE id = ?").get(id) as List | undefined;
}

export async function createList(input: CreateListInput): Promise<List> {
  // Validate input
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid list data");
  }

  const db = getDb();
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const result = db
    .prepare("INSERT INTO lists (name, emoji, color, user_id) VALUES (?, ?, ?, ?)")
    .run(parsed.data.name, parsed.data.emoji || "📋", parsed.data.color || "#6366f1", userId);
  return (await getListById(result.lastInsertRowid as number))!;
}

export async function updateList(
  id: number,
  input: Partial<CreateListInput>
): Promise<List> {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.emoji !== undefined) {
    fields.push("emoji = ?");
    values.push(input.emoji);
  }
  if (input.color !== undefined) {
    fields.push("color = ?");
    values.push(input.color);
  }
  if (fields.length === 0) throw new Error("No fields to update");
  values.push(id);
  db.prepare(`UPDATE lists SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  return (await getListById(id))!;
}

export async function deleteList(id: number): Promise<void> {
  const db = getDb();
  db.prepare("UPDATE tasks SET list_id = 1 WHERE list_id = ?").run(id);
  db.prepare("DELETE FROM lists WHERE id = ?").run(id);
}

export async function getLabels(): Promise<Label[]> {
  const db = getDb();
  const user = await getCurrentUser();

  // User isolation: only show labels owned by the user
  if (user?.id) {
    return db.prepare(
      "SELECT * FROM labels WHERE user_id = ? ORDER BY name ASC"
    ).all(user.id) as Label[];
  }
  // In production, unauthenticated users get empty results
  if (process.env.NODE_ENV === "production") {
    return [];
  }
  return db.prepare("SELECT * FROM labels ORDER BY name ASC").all() as Label[];
}

export async function getLabelById(id: number): Promise<Label | undefined> {
  const db = getDb();
  const user = await getCurrentUser();

  // User isolation: only show labels owned by the user
  if (user?.id) {
    return db.prepare(
      "SELECT * FROM labels WHERE id = ? AND user_id = ?"
    ).get(id, user.id) as Label | undefined;
  }
  // In production, unauthenticated users get no labels
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  return db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as Label | undefined;
}

export async function createLabel(input: CreateLabelInput): Promise<Label> {
  // Validate input
  const parsed = labelSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid label data");
  }

  const db = getDb();
  const user = await getCurrentUser();
  const userId = user?.id ?? null;

  const result = db
    .prepare("INSERT INTO labels (name, icon, color, user_id) VALUES (?, ?, ?, ?)")
    .run(parsed.data.name, parsed.data.icon || "🏷️", parsed.data.color || "#8b5cf6", userId);
  return (await getLabelById(result.lastInsertRowid as number))!;
}

export async function deleteLabel(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_labels WHERE label_id = ?").run(id);
  db.prepare("DELETE FROM labels WHERE id = ?").run(id);
}

// Note: These helper functions are kept for potential future use but are currently
// inlined in getTasks for performance (batch queries).
// function getTaskLabels(db: ReturnType<typeof getDb>, taskId: number): Label[] { ... }

export async function getTaskById(id: number): Promise<TaskWithRelations | undefined> {
  const db = getDb();
  const user = await getCurrentUser();

  // User isolation: only allow access to user's own tasks
  const task = user?.id
    ? db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").get(id, user.id) as Task | undefined
    : (process.env.NODE_ENV === "production"
        ? undefined
        : db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined);

  if (!task) return undefined;

  // Batch fetch all relations
  const [labels, subtasks, reminders, logs, blockers, blockedBy] = await Promise.all([
    db.prepare(
      `SELECT l.* FROM labels l
       JOIN task_labels tl ON l.id = tl.label_id
       WHERE tl.task_id = ?
       ORDER BY l.name`
    ).all(id) as Label[],
    db.prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY id").all(id) as Subtask[],
    db.prepare("SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at").all(id) as Reminder[],
    db.prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC").all(id) as TaskLog[],
    // Tasks that this task blocks (this task has dependencies pointing to them)
    db.prepare(
      `SELECT td.* FROM task_dependencies td
       WHERE td.depends_on_task_id = ?`
    ).all(id) as TaskDependency[],
    // Tasks that block this task
    db.prepare(
      `SELECT td.* FROM task_dependencies td
       WHERE td.task_id = ?`
    ).all(id) as TaskDependency[],
  ]);

  return {
    ...task,
    labels,
    subtasks,
    reminders,
    logs,
    blockers,
    blocked_by: blockedBy,
  };
}

export interface GetTasksOptions {
  view?: "today" | "next7" | "upcoming" | "all" | "blocked" | undefined;
  listId?: number | undefined;
  includeCompleted?: boolean;
  searchQuery?: string | undefined;
  filterPreset?: FilterPreset;
  limit?: number;
  offset?: number;
}

export async function getTasks(options?: GetTasksOptions): Promise<TaskWithRelations[]> {
  const db = getDb();
  const user = await getCurrentUser();
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  const today = new Date().toISOString().split("T")[0];

  // User isolation: only show tasks owned by the user
  // In production, unauthenticated users get empty results
  if (user?.id) {
    whereClauses.push("user_id = ?");
    params.push(user.id);
  } else if (process.env.NODE_ENV !== "production") {
    // Demo mode: show tasks without user_id (legacy behavior)
    whereClauses.push("user_id IS NULL");
  }

  // If no user in production, return empty array immediately
  if (!user?.id && process.env.NODE_ENV === "production") {
    return [];
  }

  if (!options?.includeCompleted) {
    whereClauses.push("completed = 0");
  }

  if (options?.listId !== undefined) {
    whereClauses.push("list_id = ?");
    params.push(options.listId);
  }

  switch (options?.view) {
    case "today":
      whereClauses.push("date = ?");
      params.push(today);
      break;
    case "next7": {
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      whereClauses.push("date >= ? AND date <= ?");
      params.push(today, nextWeek);
      break;
    }
    case "upcoming":
      whereClauses.push("date >= ?");
      params.push(today);
      break;
    case "blocked": {
      // Tasks that have dependencies pointing to them (are blocked)
      whereClauses.push("id IN (SELECT task_id FROM task_dependencies)");
      break;
    }
    case "all":
    default:
      break;
  }

  // Handle filter presets
  if (options?.filterPreset) {
    switch (options.filterPreset) {
      case "needs_attention":
        // High priority tasks due today or overdue
        whereClauses.push("(priority = 'high' AND (date = ? OR (date < ? AND completed = 0)))");
        params.push(today, today);
        break;
      case "this_week":
        const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        whereClauses.push("date >= ? AND date <= ?");
        params.push(today, nextWeek);
        break;
      case "with_labels":
        whereClauses.push("id IN (SELECT DISTINCT task_id FROM task_labels)");
        break;
      case "with_subtasks":
        whereClauses.push("id IN (SELECT DISTINCT task_id FROM subtasks)");
        break;
      case "completed":
        whereClauses.push("completed = 1");
        break;
    }
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const orderBy = options?.view === "all" ? "updated_at DESC, sort_order ASC" : "sort_order ASC, date ASC, deadline ASC, priority DESC";

  // Validate sort field and direction to prevent SQL injection
  const safeOrderBy = orderBy; // Already validated as hardcoded strings above

  // Default limit to prevent excessive data loads
  const limit = Math.min(options?.limit || 100, 100);
  const offset = options?.offset || 0;

  const tasks = db.prepare(
    `SELECT * FROM tasks ${where} ORDER BY ${safeOrderBy} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset) as Task[];
  const taskIds = tasks.map((t) => t.id);

  // Batch fetch all relations in parallel
  const [labelsResult, subtasksResult, remindersResult, logsResult, commentsResult, blockersResult, blockedByResult] = await Promise.all([
    taskIds.length > 0
      ? db
          .prepare(
            `SELECT l.*, tl.task_id FROM labels l
             JOIN task_labels tl ON l.id = tl.label_id
             WHERE tl.task_id IN (${taskIds.map(() => "?").join(",")})`
          )
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db.prepare(`SELECT * FROM subtasks WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, id`).all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT * FROM reminders WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, remind_at`)
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT * FROM task_logs WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at DESC`)
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db.prepare(`SELECT * FROM task_comments WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at ASC`).all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT td.*, t.name as blocked_task_name FROM task_dependencies td JOIN tasks t ON td.task_id = t.id WHERE td.depends_on_task_id IN (${taskIds.map(() => "?").join(",")})`)
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT td.*, t.name as blocking_task_name FROM task_dependencies td JOIN tasks t ON td.depends_on_task_id = t.id WHERE td.task_id IN (${taskIds.map(() => "?").join(",")})`)
          .all(...taskIds)
      : [],
  ]);

  // Group relations by task_id
  // Labels need special handling since they don't have task_id in the result
  interface LabelWithTaskId extends Label {
    task_id: number;
  }
  const labelsByTask = (labelsResult as LabelWithTaskId[]).reduce((acc, label) => {
    if (!acc[label.task_id]) acc[label.task_id] = [];
    acc[label.task_id].push(label);
    return acc;
  }, {} as Record<number, Label[]>);

  const subtasksByTask = (subtasksResult as Subtask[]).reduce((acc, subtask) => {
    if (!acc[subtask.task_id]) acc[subtask.task_id] = [];
    acc[subtask.task_id].push(subtask);
    return acc;
  }, {} as Record<number, Subtask[]>);

  const remindersByTask = (remindersResult as Reminder[]).reduce((acc, reminder) => {
    if (!acc[reminder.task_id]) acc[reminder.task_id] = [];
    acc[reminder.task_id].push(reminder);
    return acc;
  }, {} as Record<number, Reminder[]>);

  const logsByTask = (logsResult as TaskLog[]).reduce((acc, log) => {
    if (!acc[log.task_id]) acc[log.task_id] = [];
    acc[log.task_id].push(log);
    return acc;
  }, {} as Record<number, TaskLog[]>);

  const commentsByTask = (commentsResult as TaskComment[]).reduce((acc, comment) => {
    if (!acc[comment.task_id]) acc[comment.task_id] = [];
    acc[comment.task_id].push(comment);
    return acc;
  }, {} as Record<number, TaskComment[]>);

  const blockersByTask = (blockersResult as TaskDependency[]).reduce((acc, dep) => {
    if (!acc[dep.depends_on_task_id]) acc[dep.depends_on_task_id] = [];
    acc[dep.depends_on_task_id].push(dep);
    return acc;
  }, {} as Record<number, TaskDependency[]>);

  const blockedByTask = (blockedByResult as TaskDependency[]).reduce((acc, dep) => {
    if (!acc[dep.task_id]) acc[dep.task_id] = [];
    acc[dep.task_id].push(dep);
    return acc;
  }, {} as Record<number, TaskDependency[]>);

  const result: TaskWithRelations[] = tasks.map((task) => ({
    ...task,
    labels: labelsByTask[task.id] || [],
    subtasks: subtasksByTask[task.id] || [],
    reminders: remindersByTask[task.id] || [],
    logs: logsByTask[task.id] || [],
    comments: commentsByTask[task.id] || [],
    blockers: blockersByTask[task.id] || [],
    blocked_by: blockedByTask[task.id] || [],
  }));

  if (options?.searchQuery) {
    const Fuse = (await import("fuse.js")).default;
    const fuse = new Fuse(result, {
      keys: ["name", "description"],
      threshold: 0.4,
    });
    return fuse.search(options.searchQuery).map((r) => r.item);
  }

  return result;
}

export async function createTask(input: CreateTaskInput & { sort_order?: number }): Promise<TaskWithRelations> {
  const db = getDb();
  const user = await getCurrentUser();

  // Sanitize input to prevent XSS
  const sanitizedInput = {
    ...input,
    name: sanitizeString(input.name) ?? "",
    description: sanitizeString(input.description),
    notes: sanitizeString(input.notes),
  };

  // Use transaction for atomic operation
  const result = db.transaction(() => {
    // Determine sort_order: use provided value or auto-increment
    let sortOrder: number;
    if (sanitizedInput.sort_order !== undefined) {
      sortOrder = sanitizedInput.sort_order;
    } else {
      // Get max sort_order for the list or default to 0
      const maxResult = sanitizedInput.list_id
        ? db.prepare("SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ?").get(sanitizedInput.list_id) as { max: number }
        : db.prepare("SELECT MAX(sort_order) as max FROM tasks").get() as { max: number };
      sortOrder = (maxResult?.max ?? -1) + 1;
    }
    const insertResult = db
      .prepare(
        `INSERT INTO tasks
         (name, description, list_id, date, deadline, estimate, actual_time, priority, recurring, recurring_config, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        sanitizedInput.name,
        sanitizedInput.description || null,
        sanitizedInput.list_id || 1,
        sanitizedInput.date || null,
        sanitizedInput.deadline || null,
        sanitizedInput.estimate || null,
        sanitizedInput.actual_time || null,
        sanitizedInput.priority || "none",
        sanitizedInput.recurring || "none",
        sanitizedInput.recurring_config || null,
        sortOrder
      );

    const taskId = insertResult.lastInsertRowid as number;

    if (sanitizedInput.label_ids?.length) {
      const stmt = db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)");
      for (const labelId of sanitizedInput.label_ids) {
        stmt.run(taskId, labelId);
      }
    }

    if (sanitizedInput.subtasks?.length) {
      const stmt = db.prepare("INSERT INTO subtasks (task_id, name) VALUES (?, ?)");
      for (const name of sanitizedInput.subtasks) {
        stmt.run(taskId, sanitizeString(name) ?? name);
      }
    }

    if (sanitizedInput.reminders?.length) {
      const stmt = db.prepare("INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)");
      for (const remindAt of sanitizedInput.reminders) {
        stmt.run(taskId, remindAt);
      }
    }

    // Handle task dependencies (blockers)
    if (sanitizedInput.blocker_ids?.length) {
      const stmt = db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)");
      for (const blockingTaskId of sanitizedInput.blocker_ids) {
        stmt.run(taskId, blockingTaskId);
      }
    }

    logTaskAction(taskId, "created", `Task "${input.name}" created`);

    return taskId;
  });

  return getTaskById(result) as Promise<TaskWithRelations>;
}

export async function updateTask(id: number, input: UpdateTaskInput): Promise<TaskWithRelations> {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
  if (!existing) throw new Error("Task not found");

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    const sanitizedName = sanitizeString(input.name) ?? input.name;
    fields.push("name = ?");
    values.push(sanitizedName);
    if (sanitizedName !== existing.name) {
      logTaskAction(id, "updated", `Name changed`);
    }
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(sanitizeString(input.description) || null);
  }
  if (input.list_id !== undefined) {
    fields.push("list_id = ?");
    values.push(input.list_id);
  }
  if (input.date !== undefined) {
    fields.push("date = ?");
    values.push(input.date || null);
  }
  if (input.deadline !== undefined) {
    fields.push("deadline = ?");
    values.push(input.deadline || null);
  }
  if (input.estimate !== undefined) {
    fields.push("estimate = ?");
    values.push(input.estimate || null);
  }
  if (input.actual_time !== undefined) {
    fields.push("actual_time = ?");
    values.push(input.actual_time || null);
  }
  if (input.priority !== undefined) {
    fields.push("priority = ?");
    values.push(input.priority);
  }
  if (input.recurring !== undefined) {
    fields.push("recurring = ?");
    values.push(input.recurring);
  }
  if (input.recurring_config !== undefined) {
    fields.push("recurring_config = ?");
    values.push(input.recurring_config || null);
  }
  if (input.completed !== undefined) {
    fields.push("completed = ?, completed_at = ?");
    values.push(input.completed ? 1 : 0, input.completed ? new Date().toISOString() : null);
    if (input.completed !== Boolean(existing.completed)) {
      logTaskAction(id, input.completed ? "completed" : "uncompleted", `Task status updated`);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);
  }

  if (input.label_ids !== undefined) {
    db.prepare("DELETE FROM task_labels WHERE task_id = ?").run(id);
    if (input.label_ids.length) {
      const stmt = db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)");
      for (const labelId of input.label_ids) {
        stmt.run(id, labelId);
      }
    }
  }

  if (input.subtasks !== undefined) {
    db.prepare("DELETE FROM subtasks WHERE task_id = ?").run(id);
    if (input.subtasks.length) {
      const stmt = db.prepare("INSERT INTO subtasks (task_id, name) VALUES (?, ?)");
      for (const name of input.subtasks) {
        stmt.run(id, sanitizeString(name) ?? name);
      }
    }
  }

  if (input.reminders !== undefined) {
    db.prepare("DELETE FROM reminders WHERE task_id = ?").run(id);
    if (input.reminders.length) {
      const stmt = db.prepare("INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)");
      for (const remindAt of input.reminders) {
        stmt.run(id, remindAt);
      }
    }
  }

  // Handle task dependencies (blockers)
  if (input.blocker_ids !== undefined) {
    db.prepare("DELETE FROM task_dependencies WHERE task_id = ?").run(id);
    if (input.blocker_ids.length) {
      const stmt = db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)");
      for (const blockingTaskId of input.blocker_ids) {
        stmt.run(id, blockingTaskId);
      }
    }
  }

  return getTaskById(id) as Promise<TaskWithRelations>;
}

export async function deleteTask(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
}

export async function bulkUpdateTasks(
  taskIds: number[],
  updates: {
    list_id?: number;
    label_ids?: number[];
    priority?: Priority;
    completed?: boolean;
  }
): Promise<void> {
  const db = getDb();

  for (const taskId of taskIds) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (updates.list_id !== undefined) {
      fields.push("list_id = ?");
      values.push(updates.list_id);
    }
    if (updates.priority !== undefined) {
      fields.push("priority = ?");
      values.push(updates.priority);
    }
    if (updates.completed !== undefined) {
      fields.push("completed = ?, completed_at = ?");
      values.push(updates.completed ? 1 : 0, updates.completed ? new Date().toISOString() : null);
    }

    if (fields.length > 0) {
      fields.push("updated_at = CURRENT_TIMESTAMP");
      values.push(taskId);
      db.prepare(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`).run(...values);

      if (updates.completed !== undefined && updates.completed) {
        logTaskAction(taskId, "completed", "Task marked as completed (bulk)");
      }
    }

    // Handle label updates separately
    if (updates.label_ids !== undefined) {
      db.prepare("DELETE FROM task_labels WHERE task_id = ?").run(taskId);
      if (updates.label_ids.length > 0) {
        const stmt = db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)");
        for (const labelId of updates.label_ids) {
          stmt.run(taskId, labelId);
        }
      }
    }
  }
}

export async function bulkDeleteTasks(taskIds: number[]): Promise<void> {
  const db = getDb();
  const stmt = db.prepare("DELETE FROM tasks WHERE id = ?");
  for (const taskId of taskIds) {
    stmt.run(taskId);
  }
}

export async function reorderTasks(taskOrders: { id: number; sort_order: number }[]): Promise<void> {
  const db = getDb();
  const stmt = db.prepare("UPDATE tasks SET sort_order = ? WHERE id = ?");
  for (const task of taskOrders) {
    stmt.run(task.sort_order, task.id);
  }
}

export async function getTasksByIds(ids: number[]): Promise<TaskWithRelations[]> {
  if (ids.length === 0) return [];

  const db = getDb();

  // Batch fetch all tasks with their relations in a single query to avoid N+1 problem
  const placeholders = ids.map(() => "?").join(",");

  // Fetch tasks
  const tasks = db
    .prepare(`SELECT * FROM tasks WHERE id IN (${placeholders})`)
    .all(...ids) as Task[];

  const taskIds = tasks.map((t) => t.id);

  // Batch fetch all relations in parallel (same pattern as getTasks)
  const [labelsResult, subtasksResult, remindersResult, logsResult, commentsResult, blockersResult, blockedByResult] = await Promise.all([
    taskIds.length > 0
      ? db
          .prepare(
            `SELECT l.*, tl.task_id FROM labels l
             JOIN task_labels tl ON l.id = tl.label_id
             WHERE tl.task_id IN (${taskIds.map(() => "?").join(",")})`
          )
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db.prepare(`SELECT * FROM subtasks WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, id`).all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT * FROM reminders WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, remind_at`)
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT * FROM task_logs WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at DESC`)
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db.prepare(`SELECT * FROM task_comments WHERE task_id IN (${taskIds.map(() => "?").join(",")}) ORDER BY task_id, created_at ASC`).all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT td.*, t.name as blocked_task_name FROM task_dependencies td JOIN tasks t ON td.task_id = t.id WHERE td.depends_on_task_id IN (${taskIds.map(() => "?").join(",")})`)
          .all(...taskIds)
      : [],
    taskIds.length > 0
      ? db
          .prepare(`SELECT td.*, t.name as blocking_task_name FROM task_dependencies td JOIN tasks t ON td.depends_on_task_id = t.id WHERE td.task_id IN (${taskIds.map(() => "?").join(",")})`)
          .all(...taskIds)
      : [],
  ]);

  // Group relations by task_id
  interface LabelWithTaskId extends Label {
    task_id: number;
  }
  const labelsByTask = (labelsResult as LabelWithTaskId[]).reduce((acc, label) => {
    if (!acc[label.task_id]) acc[label.task_id] = [];
    acc[label.task_id].push(label);
    return acc;
  }, {} as Record<number, Label[]>);

  const subtasksByTask = (subtasksResult as Subtask[]).reduce((acc, subtask) => {
    if (!acc[subtask.task_id]) acc[subtask.task_id] = [];
    acc[subtask.task_id].push(subtask);
    return acc;
  }, {} as Record<number, Subtask[]>);

  const remindersByTask = (remindersResult as Reminder[]).reduce((acc, reminder) => {
    if (!acc[reminder.task_id]) acc[reminder.task_id] = [];
    acc[reminder.task_id].push(reminder);
    return acc;
  }, {} as Record<number, Reminder[]>);

  const logsByTask = (logsResult as TaskLog[]).reduce((acc, log) => {
    if (!acc[log.task_id]) acc[log.task_id] = [];
    acc[log.task_id].push(log);
    return acc;
  }, {} as Record<number, TaskLog[]>);

  const commentsByTask = (commentsResult as TaskComment[]).reduce((acc, comment) => {
    if (!acc[comment.task_id]) acc[comment.task_id] = [];
    acc[comment.task_id].push(comment);
    return acc;
  }, {} as Record<number, TaskComment[]>);

  const blockersByTask = (blockersResult as TaskDependency[]).reduce((acc, dep) => {
    if (!acc[dep.depends_on_task_id]) acc[dep.depends_on_task_id] = [];
    acc[dep.depends_on_task_id].push(dep);
    return acc;
  }, {} as Record<number, TaskDependency[]>);

  const blockedByTask = (blockedByResult as TaskDependency[]).reduce((acc, dep) => {
    if (!acc[dep.task_id]) acc[dep.task_id] = [];
    acc[dep.task_id].push(dep);
    return acc;
  }, {} as Record<number, TaskDependency[]>);

  // Build result with relations (note: missing time_entries and habit-related data for now)
  const result: TaskWithRelations[] = tasks.map((task) => ({
    ...task,
    labels: labelsByTask[task.id] || [],
    subtasks: subtasksByTask[task.id] || [],
    reminders: remindersByTask[task.id] || [],
    logs: logsByTask[task.id] || [],
    comments: commentsByTask[task.id] || [],
    blockers: blockersByTask[task.id] || [],
    blocked_by: blockedByTask[task.id] || [],
    time_entries: [],
    recurring_exceptions: [],
  }));

  return result;
}

export async function toggleSubtask(id: number): Promise<Subtask> {
  const db = getDb();
  const subtask = db.prepare("SELECT * FROM subtasks WHERE id = ?").get(id) as Subtask;
  db.prepare("UPDATE subtasks SET completed = ? WHERE id = ?").run(
    subtask.completed ? 0 : 1,
    id
  );
  return { ...subtask, completed: !subtask.completed };
}

export async function getOverdueCount(): Promise<number> {
  const db = getDb();
  const today = new Date().toISOString().split("T")[0];
  const result = db
    .prepare("SELECT COUNT(*) as count FROM tasks WHERE date < ? AND completed = 0")
    .get(today) as { count: number };
  return result.count;
}

/**
 * Generates recurring tasks based on their recurrence rules.
 * Should be called periodically (e.g., daily via cron or on app load).
 */
export async function generateRecurringTasks(): Promise<number> {
  const db = getDb();

  // Find all incomplete tasks with recurrence rules
  // Basic patterns (daily, weekly, weekdays, monthly, yearly) don't need config
  // Only filter out config requirement for 'custom' pattern
  const recurringTasks = db
    .prepare(
      `SELECT id, name, description, list_id, date, deadline, priority, recurring, recurring_config
       FROM tasks
       WHERE completed = 0 AND recurring != 'none'`
    )
    .all() as Task[];

  let generatedCount = 0;

  for (const task of recurringTasks) {
    // Parse recurring_config with error handling
    let config: { interval?: number; unit?: "days" | "weeks" | "months" | "years" } = {};
    try {
      config = JSON.parse(task.recurring_config || "{}");
      if (typeof config !== "object" || config === null) {
        config = {};
      }
    } catch (error) {
      console.warn(`Invalid recurring_config for task ${task.id}, skipping:`, error);
      continue;
    }
    let nextDate: string | null = null;

    switch (task.recurring) {
      case "daily":
        nextDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;

      case "weekly":
        nextDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;

      case "weekdays": {
        const next = new Date(Date.now() + 24 * 60 * 60 * 1000);
        let nextDay = next.getDay();
        // Skip weekends (0 = Sunday, 6 = Saturday)
        while (nextDay === 0 || nextDay === 6) {
          next.setDate(next.getDate() + 1);
          nextDay = next.getDay();
        }
        nextDate = next.toISOString().split("T")[0];
        break;
      }

      case "monthly":
        nextDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;

      case "yearly":
        nextDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        break;

      case "custom":
        if (config.interval && config.unit) {
          const multiplier =
            config.unit === "days"
              ? 1
              : config.unit === "weeks"
              ? 7
              : config.unit === "months"
              ? 30
              : 365;
          nextDate = new Date(Date.now() + config.interval * multiplier * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
        }
        break;
    }

    if (nextDate && (!task.date || task.date < nextDate)) {
      // Create new task instance
      await createTask({
        name: task.name,
        description: task.description || undefined,
        list_id: task.list_id || undefined,
        date: nextDate,
        priority: task.priority,
        label_ids: [], // Labels not copied to recurring instances
      });
      generatedCount++;
    }
  }

  return generatedCount;
}

// Note: Task Dependencies, Templates, Comments, Import/Export, and Attachments
// have been moved to their respective modules for better maintainability.
// See:
// - dependencies.ts for task dependency functions
// - templates.ts for template functions
// - comments.ts for task comment functions
// - export.ts for import/export functions
// - attachments.ts for attachment functions

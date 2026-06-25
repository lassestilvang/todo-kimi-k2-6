"use server";

import { getDb } from "@/lib/db";
import {
  type Task,
  type TaskWithRelations,
  type List,
  type Label,
  type Subtask,
  type Reminder,
  type TaskLog,
  type CreateTaskInput,
  type UpdateTaskInput,
  type CreateListInput,
  type CreateLabelInput,
  type TaskDependency,
  type Template,
  type CreateTemplateInput,
  type TaskComment,
  type CreateCommentInput,
  type FilterPreset,
  type TimeEntry,
  type Priority,
  type TaskAttachment,
  type CreateAttachmentInput,
} from "@/types";
import { listSchema, labelSchema } from "@/lib/validation";

function logTaskAction(taskId: number, action: string, details?: string) {
  const db = getDb();
  db.prepare("INSERT INTO task_logs (task_id, action, details) VALUES (?, ?, ?)").run(
    taskId,
    action,
    details || null
  );
}

export async function getLists(): Promise<List[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM lists ORDER BY is_inbox DESC, name ASC").all() as List[];
}

export async function getListById(id: number): Promise<List | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM lists WHERE id = ?").get(id) as List | undefined;
}

export async function createList(input: CreateListInput): Promise<List> {
  // Validate input
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid list data");
  }

  const db = getDb();
  const result = db
    .prepare("INSERT INTO lists (name, emoji, color) VALUES (?, ?, ?)")
    .run(parsed.data.name, parsed.data.emoji || "📋", parsed.data.color || "#6366f1");
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
  return db.prepare("SELECT * FROM labels ORDER BY name ASC").all() as Label[];
}

export async function getLabelById(id: number): Promise<Label | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as Label | undefined;
}

export async function createLabel(input: CreateLabelInput): Promise<Label> {
  // Validate input
  const parsed = labelSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message || "Invalid label data");
  }

  const db = getDb();
  const result = db
    .prepare("INSERT INTO labels (name, icon, color) VALUES (?, ?, ?)")
    .run(parsed.data.name, parsed.data.icon || "🏷️", parsed.data.color || "#8b5cf6");
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
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
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

export async function getTasks(options?: {
  view?: "today" | "next7" | "upcoming" | "all" | "blocked";
  listId?: number;
  includeCompleted?: boolean;
  searchQuery?: string;
  filterPreset?: FilterPreset;
}): Promise<TaskWithRelations[]> {
  const db = getDb();
  const whereClauses: string[] = [];
  const params: unknown[] = [];
  const today = new Date().toISOString().split("T")[0];

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

  const tasks = db.prepare(`SELECT * FROM tasks ${where} ORDER BY ${orderBy}`).all(...params) as Task[];
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

  // Use transaction for atomic operation
  const result = db.transaction(() => {
    // Determine sort_order: use provided value or auto-increment
    let sortOrder: number;
    if (input.sort_order !== undefined) {
      sortOrder = input.sort_order;
    } else {
      // Get max sort_order for the list or default to 0
      const maxSortOrder = input.list_id
        ? (db.prepare("SELECT MAX(sort_order) as max FROM tasks WHERE list_id = ?").get(input.list_id) as { max: number })?.max
        : (db.prepare("SELECT MAX(sort_order) as max FROM tasks").get() as { max: number })?.max;
      sortOrder = (maxSortOrder ?? -1) + 1;
    }

    const insertResult = db
      .prepare(
        `INSERT INTO tasks
         (name, description, list_id, date, deadline, estimate, actual_time, priority, recurring, recurring_config, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.name,
        input.description || null,
        input.list_id || 1,
        input.date || null,
        input.deadline || null,
        input.estimate || null,
        input.actual_time || null,
        input.priority || "none",
        input.recurring || "none",
        input.recurring_config || null,
        sortOrder
      );

    const taskId = insertResult.lastInsertRowid as number;

    if (input.label_ids?.length) {
      const stmt = db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)");
      for (const labelId of input.label_ids) {
        stmt.run(taskId, labelId);
      }
    }

    if (input.subtasks?.length) {
      const stmt = db.prepare("INSERT INTO subtasks (task_id, name) VALUES (?, ?)");
      for (const name of input.subtasks) {
        stmt.run(taskId, name);
      }
    }

    if (input.reminders?.length) {
      const stmt = db.prepare("INSERT INTO reminders (task_id, remind_at) VALUES (?, ?)");
      for (const remindAt of input.reminders) {
        stmt.run(taskId, remindAt);
      }
    }

    // Handle task dependencies (blockers)
    if (input.blocker_ids?.length) {
      const stmt = db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)");
      for (const blockingTaskId of input.blocker_ids) {
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
    fields.push("name = ?");
    values.push(input.name);
    if (input.name !== existing.name) {
      logTaskAction(id, "updated", `Name changed from "${existing.name}" to "${input.name}"`);
    }
  }
  if (input.description !== undefined) {
    fields.push("description = ?");
    values.push(input.description || null);
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
      logTaskAction(id, input.completed ? "completed" : "uncompleted", `Task ${input.completed ? "completed" : "uncompleted"}`);
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
        stmt.run(id, name);
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
  const recurringTasks = db
    .prepare(
      `SELECT id, name, description, list_id, date, deadline, priority, recurring, recurring_config
       FROM tasks
       WHERE completed = 0 AND recurring != 'none' AND recurring_config IS NOT NULL`
    )
    .all() as Task[];

  let generatedCount = 0;

  for (const task of recurringTasks) {
    const config = JSON.parse(task.recurring_config || "{}");
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
        const day = next.getDay();
        // Skip weekends
        while (day === 0 || day === 6) {
          next.setDate(next.getDate() + 1);
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

// ============================================
// Task Dependencies (Blockers)
// ============================================

export async function addTaskDependency(taskId: number, dependsOnTaskId: number): Promise<TaskDependency> {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)")
    .run(taskId, dependsOnTaskId);
  return {
    id: Number(result.lastInsertRowid),
    task_id: taskId,
    depends_on_task_id: dependsOnTaskId,
    created_at: new Date().toISOString(),
  };
}

export async function removeTaskDependency(taskId: number, dependsOnTaskId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?").run(taskId, dependsOnTaskId);
}

export async function getBlockedTasks(): Promise<TaskWithRelations[]> {
  const db = getDb();
  // Get all tasks that have dependencies
  const blockedTaskIds = db
    .prepare(`SELECT DISTINCT task_id FROM task_dependencies`)
    .all()
    .map((r: { task_id: number }) => r.task_id);

  if (blockedTaskIds.length === 0) return [];

  const tasks = await getTasks({ includeCompleted: true });
  return tasks.filter((t) => blockedTaskIds.includes(t.id));
}

// ============================================
// Templates
// ============================================

export async function getTemplates(): Promise<Template[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM templates ORDER BY name ASC").all() as Template[];
}

export async function createTemplate(input: CreateTemplateInput & { subtasks?: string[]; label_ids?: number[] }): Promise<Template> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO templates (name, description, list_id, priority, label_ids, subtasks) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      input.name,
      input.description || null,
      input.list_id || null,
      input.priority || "none",
      input.label_ids ? JSON.stringify(input.label_ids) : null,
      input.subtasks ? JSON.stringify(input.subtasks) : null
    );
  return {
    id: Number(result.lastInsertRowid),
    name: input.name,
    description: input.description || null,
    list_id: input.list_id || null,
    priority: input.priority || "none",
    label_ids: input.label_ids || [],
    subtasks: input.subtasks || [],
    created_at: new Date().toISOString(),
  };
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
}

/**
 * Saves the current task configuration as a template.
 */
export async function saveTemplateFromTask(
  name: string,
  description: string | null,
  listId: number | null,
  priority: Priority,
  labelIds: number[],
  subtasks: string[]
): Promise<Template> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO templates (name, description, list_id, priority, label_ids, subtasks) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(
      name,
      description,
      listId,
      priority,
      JSON.stringify(labelIds),
      JSON.stringify(subtasks)
    );
  return {
    id: Number(result.lastInsertRowid),
    name,
    description,
    list_id: listId,
    priority,
    label_ids: labelIds,
    subtasks,
    created_at: new Date().toISOString(),
  };
}

// ============================================
// Task Comments
// ============================================

export async function addTaskComment(taskId: number, input: CreateCommentInput): Promise<TaskComment> {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO task_comments (task_id, content) VALUES (?, ?)")
    .run(taskId, input.content);
  return {
    id: Number(result.lastInsertRowid),
    task_id: taskId,
    content: input.content,
    created_at: new Date().toISOString(),
  };
}

export async function getTaskComments(taskId: number): Promise<TaskComment[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC")
    .all(taskId) as TaskComment[];
}

// ============================================
// Import/Export
// ============================================

export interface ExportData {
  lists: List[];
  labels: Label[];
  tasks: TaskWithRelations[];
  templates: Template[];
  time_entries: TimeEntry[];
}

// CSV export helpers
function taskToCsvRow(task: TaskWithRelations): string {
  const escape = (val: string | number | null | undefined) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
  };

  return [
    escape(task.id),
    escape(task.name),
    escape(task.description),
    escape(task.date),
    escape(task.deadline),
    escape(task.priority),
    escape(task.completed ? "true" : "false"),
    escape(task.list_id),
  ].join(",");
}

export async function exportData(): Promise<ExportData> {
  const db = getDb();
  const lists = await getLists();
  const labels = await getLabels();
  const tasks = await getTasks({ includeCompleted: true });
  const templates = await getTemplates();
  const time_entries = db
    .prepare("SELECT * FROM time_entries ORDER BY created_at DESC")
    .all() as TimeEntry[];
  return { lists, labels, tasks, templates, time_entries };
}

export async function exportCsv(): Promise<string> {
  const tasks = await getTasks({ includeCompleted: true });
  const header = "id,name,description,date,deadline,priority,completed,list_id";
  const rows = tasks.map(taskToCsvRow);
  return [header, ...rows].join("\n");
}

/**
 * Generates a simple text-based export of tasks.
 * Returns a blob that can be downloaded.
 */
export async function exportPdf(): Promise<Blob> {
  const data = await exportData();

  // Create a simple text-based export
  const lines: string[] = [];
  lines.push("TaskFlow Export");
  lines.push(`Generated: ${new Date().toISOString().split("T")[0]}`);
  lines.push(`Total Tasks: ${data.tasks.length}`);
  lines.push(`Completed: ${data.tasks.filter(t => t.completed).length}`);
  lines.push("");
  lines.push("Tasks:");
  lines.push("-".repeat(50));

  data.tasks.forEach(task => {
    const status = task.completed ? "[✓]" : "[○]";
    lines.push(`${status} ${task.name}`);
    if (task.description) lines.push(`  Description: ${task.description}`);
    if (task.date) lines.push(`  Date: ${task.date}`);
    if (task.priority !== "none") lines.push(`  Priority: ${task.priority}`);
  });

  lines.push("");
  lines.push("Lists:");
  lines.push("-".repeat(50));
  data.lists.forEach(list => {
    lines.push(`${list.emoji} ${list.name}`);
  });

  const content = lines.join("\n");
  return new Blob([content], { type: "text/plain" });
}

export async function importData(data: ExportData): Promise<{ lists: number; labels: number; tasks: number; templates: number; time_entries: number }> {
  const db = getDb();

  // Clear existing data
  db.exec("DELETE FROM time_entries");
  db.exec("DELETE FROM task_comments");
  db.exec("DELETE FROM task_dependencies");
  db.exec("DELETE FROM task_logs");
  db.exec("DELETE FROM reminders");
  db.exec("DELETE FROM subtasks");
  db.exec("DELETE FROM task_labels");
  db.exec("DELETE FROM tasks");
  db.exec("DELETE FROM templates");
  db.exec("DELETE FROM labels");
  db.exec("DELETE FROM lists");

  let listCount = 0;
  let labelCount = 0;
  let taskCount = 0;
  let templateCount = 0;
  let timeEntriesCount = 0;

  // Import lists
  for (const list of data.lists) {
    db.prepare("INSERT INTO lists (id, name, emoji, color, is_inbox, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(list.id, list.name, list.emoji, list.color, list.is_inbox, list.created_at);
    listCount++;
  }

  // Import labels
  for (const label of data.labels) {
    db.prepare("INSERT INTO labels (id, name, icon, color, created_at) VALUES (?, ?, ?, ?, ?)")
      .run(label.id, label.name, label.icon, label.color, label.created_at);
    labelCount++;
  }

  // Import tasks with relations
  for (const task of data.tasks) {
    db.prepare(
      `INSERT INTO tasks (id, name, description, list_id, date, deadline, estimate, actual_time, priority, recurring, recurring_config, completed, completed_at, created_at, updated_at, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
        task.id,
        task.name,
        task.description,
        task.list_id,
        task.date,
        task.deadline,
        task.estimate,
        task.actual_time,
        task.priority,
        task.recurring,
        task.recurring_config,
        task.completed ? 1 : 0,
        task.completed_at,
        task.created_at,
        task.updated_at,
        task.sort_order || 0
      );

    // Import task labels
    for (const label of task.labels || []) {
      db.prepare("INSERT INTO task_labels (task_id, label_id) VALUES (?, ?)").run(task.id, label.id);
    }

    // Import subtasks
    for (const subtask of task.subtasks || []) {
      db.prepare("INSERT INTO subtasks (id, task_id, name, completed, created_at) VALUES (?, ?, ?, ?, ?)")
        .run(subtask.id, task.id, subtask.name, subtask.completed ? 1 : 0, subtask.created_at);
    }

    // Import reminders
    for (const reminder of task.reminders || []) {
      db.prepare("INSERT INTO reminders (id, task_id, remind_at, created_at) VALUES (?, ?, ?, ?)")
        .run(reminder.id, task.id, reminder.remind_at, reminder.created_at);
    }

    taskCount++;
  }

  // Import templates
  for (const template of data.templates) {
    db.prepare("INSERT INTO templates (id, name, description, list_id, priority, label_ids, subtasks, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(template.id, template.name, template.description, template.list_id, template.priority, JSON.stringify(template.label_ids), JSON.stringify(template.subtasks), template.created_at);
    templateCount++;
  }

  // Import time entries
  for (const entry of data.time_entries || []) {
    db.prepare(
      "INSERT INTO time_entries (id, task_id, start_time, end_time, duration_seconds, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(
      entry.id,
      entry.task_id,
      entry.start_time,
      entry.end_time,
      entry.duration_seconds,
      entry.description,
      entry.created_at
    );
    timeEntriesCount++;
  }

  return { lists: listCount, labels: labelCount, tasks: taskCount, templates: templateCount, time_entries: timeEntriesCount };
}

// ============================================
// Task Attachments
// ============================================

export async function getTaskAttachments(taskId: number): Promise<TaskAttachment[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC")
    .all(taskId) as TaskAttachment[];
}

export async function addTaskAttachment(input: CreateAttachmentInput): Promise<TaskAttachment> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO task_attachments (task_id, filename, file_size, mime_type, url) VALUES (?, ?, ?, ?, ?)"
    )
    .run(input.task_id, input.filename, input.file_size, input.mime_type, input.url);
  return {
    id: Number(result.lastInsertRowid),
    task_id: input.task_id,
    filename: input.filename,
    file_size: input.file_size,
    mime_type: input.mime_type,
    url: input.url,
    created_at: new Date().toISOString(),
  };
}

export async function deleteTaskAttachment(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_attachments WHERE id = ?").run(id);
}

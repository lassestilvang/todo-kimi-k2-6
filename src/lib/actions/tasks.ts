"use server";

import { getDb } from "@/lib/db";
import { getTaskRelations } from "@/lib/db/relations";
import { taskCache, cached } from "@/lib/cache";
import {
  type Task,
  type TaskWithRelations,
  type List,
  type Label,
  type Subtask,
  type Reminder,
  type TaskLog,
  type TaskComment,
  type CreateTaskInput,
  type UpdateTaskInput,
  type CreateListInput,
  type CreateLabelInput,
  type TaskDependency,
  type Template,
  type CreateTemplateInput,
  type CreateCommentInput,
  type FilterPreset,
  type TimeEntry,
  type Priority,
  type TaskAttachment,
  type CreateAttachmentInput,
  type TemplateCategory,
  type CreateTemplateCategoryInput,
  type CustomView,
  type CreateCustomViewInput,
  type ViewType,
  type SortField,
  type SortDirection,
  type User,
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
  const [labels, subtasks, reminders, logs, blockers, blockedBy, attachments, comments, timeEntries] = await Promise.all([
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
    // Attachments
    db.prepare("SELECT * FROM task_attachments WHERE task_id = ? ORDER BY created_at DESC").all(id) as TaskAttachment[],
    // Comments
    db.prepare("SELECT * FROM task_comments WHERE task_id = ? ORDER BY created_at ASC").all(id) as TaskComment[],
    // Time entries
    db.prepare("SELECT * FROM time_entries WHERE task_id = ? ORDER BY created_at DESC").all(id) as TimeEntry[],
  ]);

  return {
    ...task,
    labels,
    subtasks,
    reminders,
    logs,
    comments,
    blockers,
    blocked_by: blockedBy,
    attachments,
    time_entries: timeEntries || [],
  };
}

export async function getTasks(options?: {
  view?: "today" | "next7" | "upcoming" | "all" | "blocked";
  listId?: number;
  includeCompleted?: boolean;
  searchQuery?: string;
  filterPreset?: FilterPreset;
  limit?: number;
  offset?: number;
}): Promise<TaskWithRelations[]> {
  const db = getDb();
  // Try cache first (only for non-search queries)
  const cacheKey = JSON.stringify(options);
  if (!options?.searchQuery) {
    const cached = taskCache.tasks.get(cacheKey);
    if (cached) return cached;
  }
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

  // Build pagination clause
  let limitClause = "";
  if (options?.limit !== undefined) {
    limitClause = `LIMIT ${options.limit}`;
    if (options?.offset !== undefined) {
      limitClause += ` OFFSET ${options.offset}`;
    }
  }

  const tasks = db.prepare(`SELECT * FROM tasks ${where} ORDER BY ${orderBy} ${limitClause}`).all(...params) as Task[];
  const taskIds = tasks.map((t) => t.id);

  // Use shared relation-fetching helper
  const relations = await getTaskRelations(db, taskIds);

  const result: TaskWithRelations[] = tasks.map((task) => ({
    ...task,
    ...relations[task.id],
  }));

  if (options?.searchQuery) {
    const Fuse = (await import("fuse.js")).default;
    const fuse = new Fuse(result, {
      keys: ["name", "description"],
      threshold: 0.4,
    });
    return fuse.search(options.searchQuery).map((r) => r.item);
  }

  // Cache the result
  if (!options?.searchQuery) {
    taskCache.tasks.set(cacheKey, result, 5 * 60 * 1000);
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

  // Invalidate task cache
  taskCache.tasks.invalidate();

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

  // Invalidate task cache
  taskCache.tasks.invalidate();

  return getTaskById(id) as Promise<TaskWithRelations>;
}

export async function deleteTask(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  // Invalidate task cache
  taskCache.tasks.invalidate();
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

  // Handle empty array early
  if (taskIds.length === 0) return;

  // Use transaction for atomic bulk operations
  const result = db.transaction(() => {
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
    return true;
  });

  // For Bun compatibility, transaction might return void
  if (result === undefined) {
    // Transaction was already executed
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

export async function getTemplates(includeCategories: boolean = false): Promise<Template[]> {
  const db = getDb();
  if (includeCategories) {
    return db
      .prepare(
        `SELECT t.*, tc.name as category_name, tc.description as category_description
         FROM templates t
         LEFT JOIN template_categories tc ON t.category_id = tc.id
         ORDER BY t.name ASC`
      )
      .all()
      .map((row: any) => ({
        ...row,
        category: row.category_name
          ? { id: row.category_id, name: row.category_name, description: row.category_description, created_at: "" }
          : undefined,
      })) as Template[];
  }
  return db.prepare("SELECT * FROM templates ORDER BY name ASC").all() as Template[];
}

export async function createTemplate(input: CreateTemplateInput & { subtasks?: string[]; label_ids?: number[]; category_id?: number }): Promise<Template> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO templates (name, description, list_id, priority, label_ids, subtasks, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      input.name,
      input.description || null,
      input.list_id || null,
      input.priority || "none",
      input.label_ids ? JSON.stringify(input.label_ids) : null,
      input.subtasks ? JSON.stringify(input.subtasks) : null,
      input.category_id || null
    );
  return {
    id: Number(result.lastInsertRowid),
    name: input.name,
    description: input.description || null,
    list_id: input.list_id || null,
    priority: input.priority || "none",
    label_ids: input.label_ids || [],
    subtasks: input.subtasks || [],
    category_id: input.category_id || null,
    created_at: new Date().toISOString(),
  };
}

export async function deleteTemplate(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM templates WHERE id = ?").run(id);
}

// ============================================
// Template Categories
// ============================================

export async function getTemplateCategories(): Promise<TemplateCategory[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM template_categories ORDER BY name ASC").all() as TemplateCategory[];
}

export async function getTemplateCategoryById(id: number): Promise<TemplateCategory | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM template_categories WHERE id = ?").get(id) as TemplateCategory | undefined;
}

export async function createTemplateCategory(input: CreateTemplateCategoryInput): Promise<TemplateCategory> {
  const db = getDb();
  const result = db
    .prepare("INSERT INTO template_categories (name, description) VALUES (?, ?)")
    .run(input.name, input.description || null);
  return {
    id: Number(result.lastInsertRowid),
    name: input.name,
    description: input.description || null,
    created_at: new Date().toISOString(),
  };
}

export async function deleteTemplateCategory(id: number): Promise<void> {
  const db = getDb();
  // Reassign templates to "Uncategorized" or delete category_id
  db.prepare("UPDATE templates SET category_id = NULL WHERE category_id = ?").run(id);
  db.prepare("DELETE FROM template_categories WHERE id = ?").run(id);
}

export async function getTemplatesByCategory(categoryId: number): Promise<Template[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM templates WHERE category_id = ? ORDER BY name ASC")
    .all(categoryId) as Template[];
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
  subtasks: string[],
  categoryId?: number
): Promise<Template> {
  const db = getDb();
  const result = db
    .prepare(
      "INSERT INTO templates (name, description, list_id, priority, label_ids, subtasks, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      name,
      description,
      listId,
      priority,
      JSON.stringify(labelIds),
      JSON.stringify(subtasks),
      categoryId || null
    );
  return {
    id: Number(result.lastInsertRowid),
    name,
    description,
    list_id: listId,
    priority,
    label_ids: labelIds,
    subtasks,
    category_id: categoryId || null,
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
  users?: User[];
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
  const header = "id,name,description,date,deadline,priority,completed,list_id,estimate,actual_time";
  const rows = tasks.map(taskToCsvRow);
  return [header, ...rows].join("\n");
}

/**
 * Generates a JSON export of all data.
 * Returns a blob that can be downloaded.
 */
export async function exportJson(): Promise<Blob> {
  const data = await exportData();
  return new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
}

/**
 * Generates an iCal export for calendar integration.
 * Returns a blob that can be downloaded.
 */
export async function exportIcal(): Promise<Blob> {
  const tasks = await getTasks({ includeCompleted: true });
  const now = new Date();

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TaskFlow//TaskFlow//EN",
    "CALSCALE:GREGORIAN",
  ];

  for (const task of tasks) {
    if (!task.deadline && !task.date) continue;

    const dateStr = (task.deadline || task.date!).replace(/-/g, "");
    const uid = `${task.id}@taskflow.local`;
    const dtStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtStamp}`);
    lines.push(`DTSTART:${dateStr}`);
    lines.push(`SUMMARY:${task.name}`);
    if (task.description) {
      lines.push(`DESCRIPTION:${task.description.replace(/\n/g, "\\n")}`);
    }
    if (task.priority !== "none") {
      lines.push(`CATEGORIES:${task.priority}`);
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return new Blob([lines.join("\n")], { type: "text/calendar" });
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
// Time Tracking Reports
// ============================================

export interface TimeReport {
  taskId: number;
  taskName: string;
  totalSeconds: number;
  entries: TimeEntry[];
}

export async function getTimeReport(options?: {
  startDate?: string;
  endDate?: string;
  taskId?: number;
}): Promise<TimeReport[]> {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options?.taskId) {
    conditions.push("task_id = ?");
    params.push(options.taskId);
  }
  if (options?.startDate) {
    conditions.push("created_at >= ?");
    params.push(options.startDate);
  }
  if (options?.endDate) {
    conditions.push("created_at <= ?");
    params.push(options.endDate);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const entries = db
    .prepare(`SELECT * FROM time_entries ${where} ORDER BY task_id, created_at`)
    .all(...params) as TimeEntry[];

  // Group by task
  const byTask = entries.reduce((acc, entry) => {
    if (!acc[entry.task_id]) {
      acc[entry.task_id] = [];
    }
    acc[entry.task_id].push(entry);
    return acc;
  }, {} as Record<number, TimeEntry[]>);

  // Get task names
  const taskIds = Object.keys(byTask).map(Number);
  const tasks = taskIds.length > 0
    ? (await db.prepare(`SELECT id, name FROM tasks WHERE id IN (${taskIds.map(() => "?").join(",")})`).all(...taskIds) as { id: number; name: string }[])
    : [];

  const taskNames = new Map(tasks.map(t => [t.id, t.name]));

  return Object.entries(byTask).map(([taskId, entries]) => ({
    taskId: Number(taskId),
    taskName: taskNames.get(Number(taskId)) || "Unknown",
    totalSeconds: entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0),
    entries,
  }));
}

export async function getWeeklyTimeSummary(): Promise<{
  totalSeconds: number;
  byDay: Record<string, number>;
  topTasks: { taskId: number; taskName: string; seconds: number }[];
}> {
  const db = getDb();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const entries = db
    .prepare(`SELECT task_id, duration_seconds, created_at FROM time_entries WHERE created_at >= ? AND duration_seconds IS NOT NULL`)
    .all(weekAgo) as TimeEntry[];

  const totalSeconds = entries.reduce((sum, e) => sum + (e.duration_seconds || 0), 0);

  const byDay: Record<string, number> = {};
  for (const entry of entries) {
    const day = entry.created_at.split("T")[0];
    byDay[day] = (byDay[day] || 0) + (entry.duration_seconds || 0);
  }

  // Top tasks by time
  const byTask = entries.reduce((acc, e) => {
    acc[e.task_id] = (acc[e.task_id] || 0) + (e.duration_seconds || 0);
    return acc;
  }, {} as Record<number, number>);

  const sortedTasks = Object.entries(byTask)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);

  const taskNames = await db
    .prepare(`SELECT id, name FROM tasks WHERE id IN (${sortedTasks.map(([id]) => id).join(",")})`)
    .all(...sortedTasks.map(([id]) => Number(id))) as { id: number; name: string }[];

  const topTasks = sortedTasks.map(([taskId, seconds]) => ({
    taskId: Number(taskId),
    taskName: taskNames.find(t => t.id === Number(taskId))?.name || "Unknown",
    seconds,
  }));

  return { totalSeconds, byDay, topTasks };
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

// ============================================
// Calendar Sync
// ============================================

export interface CalendarSyncConfig {
  provider: "google" | "outlook";
  access_token: string;
  refresh_token?: string | null;
  expires_at?: string | null;
  enabled: boolean;
}

export async function getCalendarSync(userId: number): Promise<CalendarSyncConfig | null> {
  const db = getDb();
  const result = db.prepare(
    "SELECT provider, access_token, refresh_token, expires_at, enabled FROM calendar_sync WHERE user_id = ?"
  ).get(userId) as CalendarSyncConfig | undefined;
  return result ?? null;
}

export async function saveCalendarSync(
  userId: number,
  config: Omit<CalendarSyncConfig, "user_id">
): Promise<CalendarSyncConfig> {
  const db = getDb();

  // Check if already exists
  const existing = db.prepare("SELECT id FROM calendar_sync WHERE user_id = ?").get(userId);

  if (existing) {
    db.prepare(
      `UPDATE calendar_sync
       SET provider = ?, access_token = ?, refresh_token = ?, expires_at = ?, enabled = ?
       WHERE user_id = ?`
    ).run(
      config.provider,
      config.access_token,
      config.refresh_token,
      config.expires_at,
      config.enabled,
      userId
    );
  } else {
    db.prepare(
      "INSERT INTO calendar_sync (user_id, provider, access_token, refresh_token, expires_at, enabled) VALUES (?, ?, ?, ?, ?, ?)"
    ).run(
      userId,
      config.provider,
      config.access_token,
      config.refresh_token,
      config.expires_at,
      config.enabled
    );
  }

  const result = await getCalendarSync(userId);
  if (!result) {
    throw new Error("Failed to save calendar sync config");
  }
  return result;
}

export async function deleteCalendarSync(userId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM calendar_sync WHERE user_id = ?").run(userId);
}

// ============================================
// Task Assignment
// ============================================

export async function getTaskAssignments(taskId: number): Promise<Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT ta.user_id, u.email as user_email, u.name as user_name, ta.permission
       FROM task_shares ta
       JOIN users u ON ta.user_id = u.id
       WHERE ta.task_id = ?`
    )
    .all(taskId) as Array<{ user_id: number; user_email: string; user_name: string | null; permission: "view" | "edit" }>;
}

export async function assignTask(taskId: number, userId: number, permission: "view" | "edit" = "view"): Promise<void> {
  const db = getDb();
  // Use INSERT OR IGNORE to handle duplicates gracefully
  db.prepare("INSERT OR IGNORE INTO task_shares (task_id, user_id, permission) VALUES (?, ?, ?)")
    .run(taskId, userId, permission);
  logTaskAction(taskId, "assigned", `Task assigned to user ${userId} with ${permission} permission`);
}

export async function unassignTask(taskId: number, userId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_shares WHERE task_id = ? AND user_id = ?").run(taskId, userId);
  logTaskAction(taskId, "unassigned", `Task unassigned from user ${userId}`);
}

export async function getTasksAssignedToUser(userId: number): Promise<TaskWithRelations[]> {
  const db = getDb();
  const taskIds = db
    .prepare("SELECT task_id FROM task_shares WHERE user_id = ? AND permission = 'edit'")
    .all(userId)
    .map((r: { task_id: number }) => r.task_id);

  if (taskIds.length === 0) return [];

  // Fetch tasks by their IDs directly
  return getTasksByIds(taskIds);
}

export async function getPendingAssignments(userId: number): Promise<TaskWithRelations[]> {
  const db = getDb();
  const taskIds = db
    .prepare("SELECT task_id FROM task_shares WHERE user_id = ? AND permission = 'edit'")
    .all(userId)
    .map((r: { task_id: number }) => r.task_id);

  if (taskIds.length === 0) return [];

  // Fetch tasks by their IDs directly, excluding completed ones
  const tasks = await getTasksByIds(taskIds);
  return tasks.filter(t => !t.completed);
}

/**
 * Helper function to fetch tasks by their IDs.
 */
async function getTasksByIds(taskIds: number[]): Promise<TaskWithRelations[]> {
  if (taskIds.length === 0) return [];

  const db = getDb();
  const tasks = db.prepare(`SELECT * FROM tasks WHERE id IN (${taskIds.map(() => "?").join(",")})`).all(...taskIds) as Task[];
  const taskIdsFetched = tasks.map((t) => t.id);

  // Use shared relation-fetching helper
  const relations = await getTaskRelations(db, taskIdsFetched);

  return tasks.map((task) => ({
    ...task,
    ...relations[task.id],
  }));
}

// ============================================
// Custom Views
// ============================================

export async function getCustomViews(userId: number): Promise<CustomView[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM custom_views WHERE user_id = ? ORDER BY name ASC")
    .all(userId)
    .map((row: any) => ({
      ...row,
      label_ids: row.label_ids ? JSON.parse(row.label_ids) : [],
    })) as CustomView[];
}

export async function getCustomViewById(id: number, userId: number): Promise<CustomView | undefined> {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM custom_views WHERE id = ? AND user_id = ?")
    .get(id, userId) as any;

  if (!row) return undefined;

  return {
    ...row,
    label_ids: row.label_ids ? JSON.parse(row.label_ids) : [],
  };
}

export async function createCustomView(userId: number, input: CreateCustomViewInput): Promise<CustomView> {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO custom_views (user_id, name, filter_preset, list_id, label_ids, priority, sort_field, sort_direction, view_type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      userId,
      input.name,
      input.filter_preset || null,
      input.list_id || null,
      input.label_ids ? JSON.stringify(input.label_ids) : null,
      input.priority || null,
      input.sort_field || "date",
      input.sort_direction || "asc",
      input.view_type || "today"
    );

  return {
    id: Number(result.lastInsertRowid),
    user_id: userId,
    name: input.name,
    filter_preset: input.filter_preset || null,
    list_id: input.list_id || null,
    label_ids: input.label_ids || [],
    priority: input.priority || null,
    sort_field: (input.sort_field || "date") as SortField,
    sort_direction: (input.sort_direction || "asc") as SortDirection,
    view_type: (input.view_type || "today") as ViewType,
    created_at: new Date().toISOString(),
  };
}

export async function updateCustomView(id: number, userId: number, input: Partial<CreateCustomViewInput>): Promise<CustomView> {
  const db = getDb();
  const existing = await getCustomViewById(id, userId);
  if (!existing) throw new Error("Custom view not found");

  const fields: string[] = [];
  const values: unknown[] = [];

  if (input.name !== undefined) {
    fields.push("name = ?");
    values.push(input.name);
  }
  if (input.filter_preset !== undefined) {
    fields.push("filter_preset = ?");
    values.push(input.filter_preset);
  }
  if (input.list_id !== undefined) {
    fields.push("list_id = ?");
    values.push(input.list_id);
  }
  if (input.label_ids !== undefined) {
    fields.push("label_ids = ?");
    values.push(JSON.stringify(input.label_ids));
  }
  if (input.priority !== undefined) {
    fields.push("priority = ?");
    values.push(input.priority);
  }
  if (input.sort_field !== undefined) {
    fields.push("sort_field = ?");
    values.push(input.sort_field);
  }
  if (input.sort_direction !== undefined) {
    fields.push("sort_direction = ?");
    values.push(input.sort_direction);
  }
  if (input.view_type !== undefined) {
    fields.push("view_type = ?");
    values.push(input.view_type);
  }

  if (fields.length > 0) {
    values.push(id, userId);
    db.prepare(`UPDATE custom_views SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`).run(...values);
  }

  const updated = await getCustomViewById(id, userId);
  if (!updated) throw new Error("Failed to update custom view");
  return updated;
}

export async function deleteCustomView(id: number, userId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM custom_views WHERE id = ? AND user_id = ?").run(id, userId);
}

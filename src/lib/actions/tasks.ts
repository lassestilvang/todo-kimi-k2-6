"use server";

import { getDb } from "@/lib/db";
import {
  type Task,
  type TaskWithRelations,
  type List,
  type Label,
  type Subtask,
  type TaskLog,
  type CreateTaskInput,
  type UpdateTaskInput,
  type CreateListInput,
  type CreateLabelInput,
} from "@/types";

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
  const db = getDb();
  const result = db
    .prepare("INSERT INTO lists (name, emoji, color) VALUES (?, ?, ?)")
    .run(input.name, input.emoji || "📋", input.color || "#6366f1");
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
  const db = getDb();
  const result = db
    .prepare("INSERT INTO labels (name, icon, color) VALUES (?, ?, ?)")
    .run(input.name, input.icon || "🏷️", input.color || "#8b5cf6");
  return (await getLabelById(result.lastInsertRowid as number))!;
}

export async function deleteLabel(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM task_labels WHERE label_id = ?").run(id);
  db.prepare("DELETE FROM labels WHERE id = ?").run(id);
}

function getTaskLabels(db: ReturnType<typeof getDb>, taskId: number): Label[] {
  return db
    .prepare(
      `SELECT l.* FROM labels l
       JOIN task_labels tl ON l.id = tl.label_id
       WHERE tl.task_id = ?
       ORDER BY l.name`
    )
    .all(taskId) as Label[];
}

function getTaskSubtasks(db: ReturnType<typeof getDb>, taskId: number): Subtask[] {
  return db
    .prepare("SELECT * FROM subtasks WHERE task_id = ? ORDER BY id")
    .all(taskId) as Subtask[];
}

function getTaskLogs(db: ReturnType<typeof getDb>, taskId: number): TaskLog[] {
  return db
    .prepare("SELECT * FROM task_logs WHERE task_id = ? ORDER BY created_at DESC")
    .all(taskId) as TaskLog[];
}

export async function getTaskById(id: number): Promise<TaskWithRelations | undefined> {
  const db = getDb();
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id) as Task | undefined;
  if (!task) return undefined;
  return {
    ...task,
    labels: getTaskLabels(db, id),
    subtasks: getTaskSubtasks(db, id),
    reminders: db
      .prepare("SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at")
      .all(id) as any[],
    logs: getTaskLogs(db, id),
  };
}

export async function getTasks(options?: {
  view?: "today" | "next7" | "upcoming" | "all";
  listId?: number;
  includeCompleted?: boolean;
  searchQuery?: string;
}): Promise<TaskWithRelations[]> {
  const db = getDb();
  let whereClauses: string[] = [];
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
    case "all":
    default:
      break;
  }

  const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
  const orderBy = options?.view === "all" ? "updated_at DESC" : "date ASC, deadline ASC, priority DESC";

  const tasks = db.prepare(`SELECT * FROM tasks ${where} ORDER BY ${orderBy}`).all(...params) as Task[];

  const result: TaskWithRelations[] = [];
  for (const task of tasks) {
    result.push({
      ...task,
      labels: getTaskLabels(db, task.id),
      subtasks: getTaskSubtasks(db, task.id),
      reminders: db
        .prepare("SELECT * FROM reminders WHERE task_id = ? ORDER BY remind_at")
        .all(task.id) as any[],
      logs: getTaskLogs(db, task.id),
    });
  }

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

export async function createTask(input: CreateTaskInput): Promise<TaskWithRelations> {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO tasks
       (name, description, list_id, date, deadline, estimate, actual_time, priority, recurring, recurring_config)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
      input.recurring_config || null
    );

  const taskId = result.lastInsertRowid as number;

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

  logTaskAction(taskId, "created", `Task "${input.name}" created`);

  return getTaskById(taskId) as Promise<TaskWithRelations>;
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
    if (input.completed !== existing.completed) {
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

  return getTaskById(id) as Promise<TaskWithRelations>;
}

export async function deleteTask(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
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

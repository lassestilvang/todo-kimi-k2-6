"use server";

import { getDb } from "@/lib/db";
import type { Template, CreateTemplateInput } from "@/types";

export async function getTemplates(includeCategories = false): Promise<Template[]> {
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
      .map((row) => ({
        id: row.id as number,
        name: row.name as string,
        description: row.description as string | null,
        list_id: row.list_id as number | null,
        priority: (row.priority as "critical" | "high" | "medium" | "low" | "none") || "none",
        label_ids: row.label_ids ? JSON.parse(row.label_ids as string) : [],
        subtasks: row.subtasks ? JSON.parse(row.subtasks as string) : [],
        category_id: row.category_id as number | null,
        category: row.category_name
          ? {
              id: row.category_id as number,
              name: row.category_name as string,
              description: row.category_description as string | null,
              created_at: "",
            }
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

/**
 * Save a task as a template
 */
export async function saveTemplateFromTask(
  taskId: number,
  options?: {
    name?: string;
    category_id?: number;
    include_subtasks?: boolean;
  }
): Promise<Template> {
  const db = getDb();

  // Get the task
  const task = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as {
    id: number;
    name: string;
    description: string | null;
    list_id: number | null;
    priority: string;
  } | undefined;

  if (!task) {
    throw new Error("Task not found");
  }

  // Get subtasks if needed
  let subtasks: string[] = [];
  if (options?.include_subtasks) {
    const taskSubtasks = db
      .prepare("SELECT name FROM subtasks WHERE task_id = ?")
      .all(taskId) as Array<{ name: string }>;
    subtasks = taskSubtasks.map((s) => s.name);
  }

  // Create the template
  const result = db
    .prepare(
      "INSERT INTO templates (name, description, list_id, priority, label_ids, subtasks, category_id) VALUES (?, ?, ?, ?, ?, ?, ?)"
    )
    .run(
      options?.name || task.name,
      task.description,
      task.list_id || null,
      task.priority || "none",
      null, // No labels by default
      subtasks.length > 0 ? JSON.stringify(subtasks) : null,
      options?.category_id || null
    );

  return {
    id: Number(result.lastInsertRowid),
    name: options?.name || task.name,
    description: task.description,
    list_id: task.list_id || null,
    priority: (task.priority as "critical" | "high" | "medium" | "low" | "none") || "none",
    label_ids: [],
    subtasks,
    category_id: options?.category_id || null,
    created_at: new Date().toISOString(),
  };
}
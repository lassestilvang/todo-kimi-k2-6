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
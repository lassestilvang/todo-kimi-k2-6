"use server";

import { getDb } from "@/lib/db";
import type { CustomView, CreateCustomViewInput, SortField, SortDirection, ViewType } from "@/types";

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
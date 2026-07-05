"use server";

import { getDb } from "@/lib/db";
import { listSchema } from "@/lib/validation";
import type { List, CreateListInput } from "@/types";

export async function getLists(): Promise<List[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM lists ORDER BY is_inbox DESC, name ASC").all() as List[];
}

export async function getListById(id: number): Promise<List | null> {
  const db = getDb();
  const result = db.prepare("SELECT * FROM lists WHERE id = ?").get(id) as List | undefined;
  return result ?? null;
}

export async function createList(input: CreateListInput): Promise<List> {
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
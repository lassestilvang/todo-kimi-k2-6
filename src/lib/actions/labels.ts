"use server";

import { getDb } from "@/lib/db";
import { labelSchema } from "@/lib/validation";
import type { Label, CreateLabelInput } from "@/types";

export async function getLabels(): Promise<Label[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM labels ORDER BY name ASC").all() as Label[];
}

export async function getLabelById(id: number): Promise<Label | undefined> {
  const db = getDb();
  return db.prepare("SELECT * FROM labels WHERE id = ?").get(id) as Label | undefined;
}

export async function createLabel(input: CreateLabelInput): Promise<Label> {
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
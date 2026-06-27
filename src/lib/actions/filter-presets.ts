"use server";

import { getDb } from "@/lib/db";
import type { SavedFilterPreset } from "@/types";

export interface CreateFilterPresetInput {
  user_id: number;
  name: string;
  filter_type?: string;
  list_id?: number | null;
  label_ids?: number[];
  priority?: "critical" | "high" | "medium" | "low" | "none";
}

export async function getFilterPresets(userId: number): Promise<SavedFilterPreset[]> {
  const db = getDb();
  return db
    .prepare("SELECT * FROM filter_presets WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as SavedFilterPreset[];
}

export async function createFilterPreset(input: CreateFilterPresetInput): Promise<SavedFilterPreset> {
  const db = getDb();
  const result = db
    .prepare(
      `INSERT INTO filter_presets (user_id, name, filter_type, list_id, label_ids, priority)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.user_id,
      input.name,
      input.filter_type || null,
      input.list_id || null,
      input.label_ids ? JSON.stringify(input.label_ids) : null,
      input.priority || null
    );

  return {
    id: Number(result.lastInsertRowid),
    user_id: input.user_id,
    name: input.name,
    filter_type: input.filter_type || null,
    list_id: input.list_id || null,
    label_ids: input.label_ids || [],
    priority: input.priority || null,
    created_at: new Date().toISOString(),
  };
}

export async function deleteFilterPreset(id: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM filter_presets WHERE id = ?").run(id);
}
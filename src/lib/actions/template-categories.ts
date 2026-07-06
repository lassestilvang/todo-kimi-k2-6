"use server";

import { getDb } from "@/lib/db";
import type { TemplateCategory, CreateTemplateCategoryInput } from "@/types";

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
  db.prepare("UPDATE templates SET category_id = NULL WHERE category_id = ?").run(id);
  db.prepare("DELETE FROM template_categories WHERE id = ?").run(id);
}

export async function getTemplatesByCategory(categoryId: number): Promise<TemplateCategory[]> {
  const db = getDb();
  return db.prepare("SELECT * FROM templates WHERE category_id = ? ORDER BY name ASC").all(categoryId) as TemplateCategory[];
}
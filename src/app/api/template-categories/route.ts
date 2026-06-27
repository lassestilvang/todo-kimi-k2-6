"use server";

import { getDb } from "@/lib/db";
import type { TemplateCategory, CreateTemplateCategoryInput } from "@/types";

export async function GET() {
  try {
    const db = getDb();
    const categories = db
      .prepare("SELECT * FROM template_categories ORDER BY name ASC")
      .all() as TemplateCategory[];
    return Response.json(categories);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    return Response.json([], { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input: CreateTemplateCategoryInput = body;

    const db = getDb();
    const result = db
      .prepare("INSERT INTO template_categories (name, description) VALUES (?, ?)")
      .run(input.name, input.description || null);

    const category: TemplateCategory = {
      id: Number(result.lastInsertRowid),
      name: input.name,
      description: input.description || null,
      created_at: new Date().toISOString(),
    };

    return Response.json(category);
  } catch (error) {
    console.error("Failed to create category:", error);
    return Response.json({ error: "Failed to create category" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json({ error: "ID is required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM template_categories WHERE id = ?").run(Number(id));

    return Response.json({ success: true });
  } catch (error) {
    console.error("Failed to delete category:", error);
    return Response.json({ error: "Failed to delete category" }, { status: 500 });
  }
}
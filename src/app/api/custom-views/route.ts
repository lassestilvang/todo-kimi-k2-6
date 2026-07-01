import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { CustomView, CreateCustomViewInput, SortField, SortDirection, ViewType } from "@/types";

interface CustomViewRow {
  id: number;
  user_id: number;
  name: string;
  filter_preset: string | null;
  list_id: number | null;
  label_ids: string | null;
  priority: string | null;
  sort_field: string;
  sort_direction: string;
  view_type: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const db = getDb();
    const views = db
      .prepare("SELECT * FROM custom_views WHERE user_id = ? ORDER BY name ASC")
      .all(Number(userId))
      .map((row: CustomViewRow) => ({
        ...row,
        label_ids: row.label_ids ? JSON.parse(row.label_ids) : [],
      })) as CustomView[];

    return NextResponse.json(views);
  } catch (error) {
    console.error("Failed to fetch custom views:", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const input: CreateCustomViewInput & { userId: number } = body;

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO custom_views (user_id, name, filter_preset, list_id, label_ids, priority, sort_field, sort_direction, view_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        input.userId,
        input.name,
        input.filter_preset || null,
        input.list_id || null,
        input.label_ids ? JSON.stringify(input.label_ids) : null,
        input.priority || null,
        input.sort_field || "date",
        input.sort_direction || "asc",
        input.view_type || "today"
      );

    const view: CustomView = {
      id: Number(result.lastInsertRowid),
      user_id: input.userId,
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

    return NextResponse.json(view);
  } catch (error) {
    console.error("Failed to create custom view:", error);
    return NextResponse.json({ error: "Failed to create custom view" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");

    if (!id || !userId) {
      return NextResponse.json({ error: "ID and userId are required" }, { status: 400 });
    }

    const db = getDb();
    db.prepare("DELETE FROM custom_views WHERE id = ? AND user_id = ?").run(Number(id), Number(userId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete custom view:", error);
    return NextResponse.json({ error: "Failed to delete custom view" }, { status: 500 });
  }
}
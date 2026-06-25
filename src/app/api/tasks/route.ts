import { NextRequest, NextResponse } from "next/server";
import {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  getLists,
  createList,
  deleteList,
  getLabels,
  createLabel,
  deleteLabel,
  getTemplates,
  createTemplate,
  deleteTemplate,
  getOverdueCount,
  generateRecurringTasks,
  exportData,
  importData,
} from "@/lib/actions/tasks";
import type { CreateTaskInput, UpdateTaskInput, CreateListInput, CreateLabelInput } from "@/types";

// GET /api/tasks - Get all tasks with optional filtering
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view") as "today" | "next7" | "upcoming" | "all" | "blocked" | undefined;
    const listId = searchParams.get("listId");
    const includeCompleted = searchParams.get("includeCompleted") === "true";
    const searchQuery = searchParams.get("q");
    const sortBy = searchParams.get("sortBy") as "name" | "date" | "deadline" | "priority" | "created_at" | "updated_at" | null;
    const sortDirection = searchParams.get("sortDirection") as "asc" | "desc" | null;

    const tasks = await getTasks({
      view,
      listId: listId ? Number(listId) : undefined,
      includeCompleted,
      searchQuery: searchQuery || undefined,
    });

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const task = await createTask(body as CreateTaskInput);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

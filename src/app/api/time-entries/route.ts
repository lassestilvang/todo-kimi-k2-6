import { NextRequest, NextResponse } from "next/server";
import { getTimeEntries, addTimeEntry, updateTimeEntry, deleteTimeEntry } from "@/lib/actions/time";
import type { CreateTimeEntryInput } from "@/types";

// GET /api/time-entries - Get time entries for a task
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get("taskId");
    if (!taskId) {
      return NextResponse.json({ error: "Task ID required" }, { status: 400 });
    }
    const entries = await getTimeEntries(Number(taskId));
    return NextResponse.json({ entries });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch time entries";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/time-entries - Create a new time entry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = await addTimeEntry(body as CreateTimeEntryInput);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create time entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// PUT /api/time-entries - Update a time entry
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: "Time entry ID required" }, { status: 400 });
    }
    const entry = await updateTimeEntry(id, updates);
    return NextResponse.json({ entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update time entry";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/time-entries - Delete a time entry
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Time entry ID required" }, { status: 400 });
    }
    await deleteTimeEntry(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete time entry";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
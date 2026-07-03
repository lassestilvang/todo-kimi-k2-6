import { NextRequest, NextResponse } from "next/server";
import { toggleSubtask } from "@/lib/actions";

// PATCH /api/subtasks/[id] - Toggle subtask completion
export async function PATCH(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: "Invalid subtask ID" }, { status: 400 });
    }

    const subtask = await toggleSubtask(id);
    return NextResponse.json({ subtask });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to toggle subtask";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
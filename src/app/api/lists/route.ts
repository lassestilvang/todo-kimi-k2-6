import { NextRequest, NextResponse } from "next/server";
import { getLists, createList, deleteList } from "@/lib/actions/tasks";
import type { CreateListInput } from "@/types";

// GET /api/lists - Get all lists
export async function GET() {
  try {
    const lists = await getLists();
    return NextResponse.json({ lists });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch lists" }, { status: 500 });
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const list = await createList(body as CreateListInput);
    return NextResponse.json({ list }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create list";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/lists - Delete a list
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "List ID required" }, { status: 400 });
    }
    await deleteList(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete list" }, { status: 500 });
  }
}

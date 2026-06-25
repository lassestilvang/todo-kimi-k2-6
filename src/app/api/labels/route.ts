import { NextRequest, NextResponse } from "next/server";
import { getLabels, createLabel, deleteLabel } from "@/lib/actions/tasks";
import type { CreateLabelInput } from "@/types";

// GET /api/labels - Get all labels
export async function GET() {
  try {
    const labels = await getLabels();
    return NextResponse.json({ labels });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch labels" }, { status: 500 });
  }
}

// POST /api/labels - Create a new label
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const label = await createLabel(body as CreateLabelInput);
    return NextResponse.json({ label }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create label";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/labels - Delete a label
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Label ID required" }, { status: 400 });
    }
    await deleteLabel(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete label" }, { status: 500 });
  }
}

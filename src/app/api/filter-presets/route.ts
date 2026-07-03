import { NextRequest, NextResponse } from "next/server";
import { getFilterPresets, createFilterPreset, deleteFilterPreset } from "@/lib/actions/filter-presets";

// GET /api/filter-presets - Get all filter presets for a user
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const presets = await getFilterPresets(Number(userId));
  return NextResponse.json({ presets });
}

// POST /api/filter-presets - Create a new filter preset
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const preset = await createFilterPreset(body);
    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create filter preset";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/filter-presets - Delete a filter preset
export async function DELETE(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  try {
    await deleteFilterPreset(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete filter preset";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
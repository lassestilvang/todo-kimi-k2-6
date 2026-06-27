import { NextRequest, NextResponse } from "next/server";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/actions/tasks";
import type { CreateTemplateInput } from "@/types";

// GET /api/templates - Get all templates
export async function GET() {
  try {
    const templates = await getTemplates();
    return NextResponse.json({ templates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const template = await createTemplate(body as CreateTemplateInput);
    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

// DELETE /api/templates - Delete a template
export async function DELETE(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Template ID required" }, { status: 400 });
    }
    await deleteTemplate(Number(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
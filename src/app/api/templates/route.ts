import { NextRequest } from "next/server";
import { getTemplates, createTemplate, deleteTemplate } from "@/lib/actions";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

// GET /api/templates - Get all templates
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }
  try {
    const templates = await getTemplates();
    return jsonResponse({ templates }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch templates";
    return errorResponse(message, 500);
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }
  try {
    const body = (await request.json()) as {
      name: string;
      description?: string;
      list_id?: number;
      priority?: "critical" | "high" | "medium" | "low" | "none";
      label_ids?: number[];
      subtasks?: string[];
    };
    const template = await createTemplate(body);
    return jsonResponse({ template }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create template";
    return errorResponse(message, 400);
  }
}

// DELETE /api/templates - Delete a template
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }
  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return errorResponse("Template ID required", 400);
    }
    await deleteTemplate(Number(id));
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete template";
    return errorResponse(message, 500);
  }
}
import { NextRequest } from "next/server";
import { getLists, createList, deleteList } from "@/lib/actions/lists";
import { listSchema } from "@/lib/validation";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

// GET /api/lists - Get all lists
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const lists = await getLists();
    return jsonResponse({ lists }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch lists";
    return errorResponse(message, 500);
  }
}

// POST /api/lists - Create a new list
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = listSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    const list = await createList(parsed.data);
    return jsonResponse({ list }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create list";
    return errorResponse(message, 400);
  }
}

// DELETE /api/lists - Delete a list
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return errorResponse("List ID required", 400);
    }

    const parsedId = Number(id);
    if (isNaN(parsedId) || parsedId <= 0) {
      return errorResponse("Invalid list ID", 400);
    }

    await deleteList(parsedId);
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete list";
    return errorResponse(message, 500);
  }
}
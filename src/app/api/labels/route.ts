import { NextRequest } from "next/server";
import { getLabels, createLabel, deleteLabel } from "@/lib/actions/labels";
import { labelSchema } from "@/lib/validation";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

// GET /api/labels - Get all labels
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const labels = await getLabels();
    return jsonResponse({ labels }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch labels";
    return errorResponse(message, 500);
  }
}

// POST /api/labels - Create a new label
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();

    // Validate input
    const parsed = labelSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Validation failed", 400, parsed.error.issues);
    }

    const label = await createLabel(parsed.data);
    return jsonResponse({ label }, 201, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create label";
    return errorResponse(message, 400);
  }
}

// DELETE /api/labels - Delete a label
export async function DELETE(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request);
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    if (!id) {
      return errorResponse("Label ID required", 400);
    }

    const parsedId = Number(id);
    if (isNaN(parsedId) || parsedId <= 0) {
      return errorResponse("Invalid label ID", 400);
    }

    await deleteLabel(parsedId);
    return jsonResponse({ success: true }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete label";
    return errorResponse(message, 500);
  }
}
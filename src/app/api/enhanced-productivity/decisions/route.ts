import { NextRequest, NextResponse } from "next/server";
import { createDecisionShadow, getDecisionAnalysis } from "@/lib/actions/enhanced-productivity";
import { applyMiddleware } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  try {
    const body = await request.json();
    const result = await createDecisionShadow(body);
    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create decision shadow" },
      { status: 400 }
    );
  }
}

export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  const { searchParams } = new URL(request.url);
  const userId = middleware.auth?.userId ?? 1;

  try {
    const limit = parseInt(searchParams.get("limit") || "20");
    const analysis = await getDecisionAnalysis(userId, limit);
    return NextResponse.json(analysis);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get decision analysis" },
      { status: 400 }
    );
  }
}
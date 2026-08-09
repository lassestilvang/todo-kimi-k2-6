import { NextRequest, NextResponse } from "next/server";
import { logMoodContext, getMoodBasedTaskRecommendations } from "@/lib/actions/enhanced-productivity";
import { applyMiddleware } from "@/lib/api-middleware";

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  try {
    const body = await request.json();

    if (body.action === "log") {
      const result = await logMoodContext(body);
      return NextResponse.json({ success: true, id: result.id });
    }

    if (body.action === "recommend") {
      const date = body.date || new Date().toISOString().split("T")[0];
      const userId = middleware.auth?.userId ?? 1;
      const recommendations = await getMoodBasedTaskRecommendations(userId, date);
      return NextResponse.json({
        primary_mood: recommendations.reasoning.includes("High energy") ? "energized" :
                     recommendations.reasoning.includes("Lower energy") ? "tired" : "balanced",
        recommendations: recommendations.reasoning.split(". ").filter((s: string) => s),
        taskIds: recommendations.recommendedTaskIds
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process mood request" },
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
  const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
  const userId = middleware.auth?.userId ?? 1;

  try {
    const recommendations = await getMoodBasedTaskRecommendations(userId, date);
    return NextResponse.json({
      primary_mood: recommendations.reasoning.includes("High energy") ? "energized" :
                   recommendations.reasoning.includes("Lower energy") ? "tired" : "balanced",
      recommendations: recommendations.reasoning.split(". ").filter((s: string) => s),
      taskIds: recommendations.recommendedTaskIds
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to get mood recommendations" },
      { status: 400 }
    );
  }
}
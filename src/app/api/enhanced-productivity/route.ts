import { NextRequest, NextResponse } from "next/server";
import { applyMiddleware } from "@/lib/api-middleware";

// Main entry point for enhanced productivity features
// This serves as a gateway to the various specialized endpoints

export async function GET(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  const { searchParams } = new URL(request.url);
  const feature = searchParams.get("feature");

  switch (feature) {
    case "profile":
      // Return user's energy profile
      const { getEnergyProfile, upsertEnergyProfile } = await import("@/lib/actions/enhanced-productivity");
      try {
        const userId = middleware.auth?.userId ?? 1;
        const profile = await getEnergyProfile();
        return NextResponse.json({ profile });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to get energy profile" },
          { status: 500 }
        );
      }

    case "analysis":
      // Return comprehensive productivity analysis
      const {
        getCognitiveLoadAnalysis,
        getDecisionAnalysis,
        getMoodBasedTaskRecommendations
      } = await import("@/lib/actions/enhanced-productivity");
      try {
        const userId = middleware.auth?.userId ?? 1;
        const [cognitive, decisions, moodRecs] = await Promise.all([
          getCognitiveLoadAnalysis(userId, 7),
          getDecisionAnalysis(userId, 20),
          getMoodBasedTaskRecommendations(userId, new Date().toISOString().split("T")[0])
        ]);
        return NextResponse.json({
          cognitiveLoad: cognitive,
          decisions: decisions,
          moodRecommendations: moodRecs
        });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to get analysis" },
          { status: 500 }
        );
      }

    case "energy-budget":
      // Return today's energy budget
      const { getEnergyBudget } = await import("@/lib/actions/enhanced-productivity");
      try {
        const today = new Date().toISOString().split("T")[0];
        const budget = await getEnergyBudget(today);
        return NextResponse.json({ budget });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to get energy budget" },
          { status: 500 }
        );
      }

    case "persona":
      // Return user persona and recommendations
      const { analyzeUserPersona, getPersonaRecommendations } = await import("@/lib/actions/productivity-personas");
      try {
        const userId = middleware.auth?.userId ?? 1;
        const [persona, recommendations] = await Promise.all([
          analyzeUserPersona(userId),
          getPersonaRecommendations(userId)
        ]);
        return NextResponse.json({ persona, recommendations });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to get persona" },
          { status: 500 }
        );
      }

    default:
      return NextResponse.json({
        message: "Enhanced Productivity API",
        availableFeatures: ["profile", "analysis", "energy-budget", "persona"],
        description: "Use ?feature=<name> to access specific features"
      });
  }
}

export async function POST(request: NextRequest) {
  const middleware = await applyMiddleware(request);
  if (middleware.error) {
    return middleware.error;
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  switch (action) {
    case "sync":
      // Manual sync endpoint
      return NextResponse.json({
        message: "Sync triggered",
        note: "Use specific endpoints for detailed operations"
      });

    case "predict":
      // AI-powered task duration prediction
      try {
        const { getAIManager } = await import("@/lib/ai/providers");
        const aiManager = getAIManager();
        const body = await request.json();
        const result = await aiManager.predictTaskDuration(body.task, body.context);
        return NextResponse.json({ success: true, prediction: result });
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Failed to predict duration" },
          { status: 500 }
        );
      }

    default:
      return NextResponse.json({
        error: "Invalid action. Use: sync, predict"
      }, { status: 400 });
  }
}
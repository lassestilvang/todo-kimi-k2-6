import { NextRequest, NextResponse } from "next/server";
import { applyMiddleware } from "@/lib/api-middleware";
import {
  getDailyEnergyRecommendations,
  getEnergySuggestions,
  optimizeTaskSchedule,
  bulkScheduleTasks,
  type ScheduledTask,
} from "@/lib/actions/energy-scheduling";
import { getCurrentUser } from "@/lib/session";

export async function GET(request: NextRequest) {
  try {
    const middlewareResult = await applyMiddleware(request, { requireAuth: true });
    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action") || "recommendations";

    switch (action) {
      case "recommendations": {
        const recommendations = await getDailyEnergyRecommendations();
        return NextResponse.json(recommendations);
      }

      case "suggestions": {
        const taskId = searchParams.get("taskId");
        if (!taskId) {
          return NextResponse.json({ error: "taskId parameter required" }, { status: 400 });
        }
        const suggestions = await getEnergySuggestions(parseInt(taskId));
        return NextResponse.json(suggestions);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in energy scheduling GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const middlewareResult = await applyMiddleware(request, { requireAuth: true });
    if (middlewareResult.error) {
      return middlewareResult.error;
    }

    const user = await getCurrentUser();

    if (!user?.id) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "schedule": {
        const { taskIds, date } = params as { taskIds: number[]; date: string };
        if (!taskIds || !date) {
          return NextResponse.json({ error: "taskIds and date required" }, { status: 400 });
        }
        const result = await optimizeTaskSchedule(taskIds, date);
        return NextResponse.json(result);
      }

      case "bulk-schedule": {
        const { listId, date } = params as { listId: number; date: string };
        if (!listId) {
          return NextResponse.json({ error: "listId required" }, { status: 400 });
        }
        const result = await bulkScheduleTasks(listId, date || new Date().toISOString().split("T")[0]);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error in energy scheduling POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
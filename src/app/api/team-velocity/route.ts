import { NextRequest } from "next/server";
import { applyMiddleware, errorResponse, jsonResponse } from "@/lib/api-middleware";

interface TeamVelocityParams {
  timeframe?: "week" | "month" | "quarter" | "year";
  workspaceId?: number;
}

interface VelocityReport {
  sprints: SprintData[];
  velocity: number;
  predictedVelocity: number;
  capacity: number;
  burndown: BurndownPoint[];
}

interface SprintData {
  id: number;
  name: string;
  period_start: string;
  period_end: string;
  planned_points: number;
  completed_points: number;
  completion_rate: number;
  burn_rate: number;
}

interface BurndownPoint {
  day: string;
  remaining: number;
  ideal: number;
}

// Get team velocity metrics
export async function GET(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  const url = new URL(request.url);
  const params: TeamVelocityParams = {
    timeframe: url.searchParams.get("timeframe") as "week" | "month" | "quarter" | "year" || "month",
    workspaceId: url.searchParams.get("workspaceId") ? parseInt(url.searchParams.get("workspaceId")!) : undefined,
  };

  try {
    const report = await getTeamVelocityReport(params.timeframe, params.workspaceId);
    return jsonResponse({ report }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch team velocity";
    return errorResponse(message, 500);
  }
}

async function getTeamVelocityReport(timeframe: string, workspaceId?: number): Promise<VelocityReport> {
  const db = (await import("@/lib/db")).getDb();

  // Calculate date range based on timeframe
  const dateRange = getDateRange(timeframe);

  // Get sprint/team period data
  const sprints = await getSprints(db, dateRange.start, dateRange.end, workspaceId);

  // Calculate overall velocity and predictions
  const velocity = calculateVelocity(sprints);
  const predictedVelocity = calculatePredictedVelocity(sprints);

  // Get capacity based on team history
  const capacity = await getTeamCapacity(db, workspaceId);

  // Generate burndown data
  const burndown = generateBurndownData(db, dateRange.start, dateRange.end, workspaceId);

  return {
    sprints,
    velocity,
    predictedVelocity,
    capacity,
    burndown,
  };
}

interface DateRange {
  start: string;
  end: string;
}

function getDateRange(timeframe: string): DateRange {
  const now = new Date();

  switch (timeframe) {
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - (now.getDay() + 6) % 7);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      const start = new Date(now.getFullYear(), quarter * 3, 1);
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
    case "year":
    default: {
      const start = new Date(now.getFullYear(), 0, 1);
      const end = new Date(now.getFullYear(), 11, 31);
      return {
        start: start.toISOString().split("T")[0],
        end: end.toISOString().split("T")[0],
      };
    }
  }
}

async function getSprints(db: ReturnType<typeof import("@/lib/db").getDb>, start: string, end: string, workspaceId?: number): Promise<SprintData[]> {
  // Try to get actual sprints from tasks assigned within the period
  const whereClause = workspaceId
    ? `WHERE (t.workspace_id = ? OR t.user_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?)) AND t.created_at BETWEEN ? AND ?`
    : `WHERE t.created_at BETWEEN ? AND ?`;

  const params = workspaceId
    ? [workspaceId, workspaceId, start, end]
    : [start, end];

  // Group tasks by week to simulate sprints
  const weeklyTasks = await db.prepare(`
    SELECT
      strftime('%Y-%W', t.created_at) as week_id,
      date(t.created_at, 'start of week') as week_start,
      date(t.created_at, 'start of week', '+6 days') as week_end,
      COUNT(*) as planned,
      SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed,
      AVG(CASE WHEN t.estimate IS NOT NULL THEN CAST(t.estimate AS REAL) ELSE 0 END) as avg_estimate
    FROM tasks t
    ${whereClause}
    GROUP BY strftime('%Y-%W', t.created_at)
    ORDER BY week_start
    LIMIT 12
  `).all(...params) as any[];

  return weeklyTasks.map((row: any, index: number) => {
    const planned = row.planned || 0;
    const completed = row.completed || 0;
    const completionRate = planned > 0 ? Math.round((completed / planned) * 100) : 0;

    // Simple burn rate: how quickly tasks are moving to completion
    const burnRate = completionRate > 0 ? completionRate / 2 : 0; // Simplified

    return {
      id: index + 1,
      name: `Week ${index + 1}`,
      period_start: row.week_start,
      period_end: row.week_end,
      planned_points: Math.round(planned),
      completed_points: Math.round(completed),
      completion_rate: completionRate,
      burn_rate: Math.round(burnRate),
    };
  });
}

function calculateVelocity(sprints: SprintData[]): number {
  if (sprints.length === 0) return 0;

  // Average of last 6 sprints' completed points
  const recentSprints = sprints.slice(-6);
  const totalCompleted = recentSprints.reduce((sum, s) => sum + s.completed_points, 0);

  return Math.round(totalCompleted / Math.max(1, recentSprints.length));
}

function calculatePredictedVelocity(sprints: SprintData[]): number {
  if (sprints.length < 3) {
    // Not enough data, use current velocity
    return calculateVelocity(sprints);
  }

  // Predict based on trend (simple linear regression)
  const recentSprints = sprints.slice(-6);
  const velocities = recentSprints.map(s => s.completed_points);

  // Calculate trend
  const firstHalf = velocities.slice(0, Math.ceil(velocities.length / 2));
  const secondHalf = velocities.slice(Math.ceil(velocities.length / 2));

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

  // Predict next sprint as 10% improvement on recent average
  const trend = secondAvg - firstAvg;
  return Math.round(secondAvg + trend * 0.5);
}

async function getTeamCapacity(db: ReturnType<typeof import("@/lib/db").getDb>, workspaceId?: number): Promise<number> {
  // Get user count for capacity calculation
  let userCount = 1;

  if (workspaceId) {
    const workspaceMembers = await db.prepare(
      "SELECT COUNT(*) as count FROM workspace_users WHERE workspace_id = ?"
    ).get(workspaceId) as { count: number };
    userCount = Math.max(1, workspaceMembers.count);
  } else {
    // Try to get all users without workspace
    const users = await db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
    userCount = users.count || 1;
  }

  // Each user contributes ~5 hours/week of productive work
  // Assuming average of 5 hours per user per week
  const hoursPerUser = 5;
  const capacityHours = userCount * hoursPerUser;

  return capacityHours;
}

async function generateBurndownData(db: ReturnType<typeof import("@/lib/db").getDb>, start: string, end: string, workspaceId?: number): Promise<BurndownPoint[]> {
  const whereClause = workspaceId
    ? `WHERE (t.workspace_id = ? OR t.user_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?)) AND t.created_at BETWEEN ? AND ?`
    : `WHERE t.created_at BETWEEN ? AND ?`;

  const params = workspaceId
    ? [workspaceId, workspaceId, start, end]
    : [start, end];

  // Get all tasks in period and their completion dates
  const tasks = await db.prepare(`
    SELECT
      t.id,
      t.completed,
      t.completed_at,
      t.created_at
    FROM tasks t
    ${whereClause}
  `).all(...params) as any[];

  // Calculate daily burndown
  const dailyStats = new Map<string, { remaining: number; created: number }>();

  // Initialize all days in range
  const startDate = new Date(start);
  const endDate = new Date(end);
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dayStr = d.toISOString().split("T")[0];
    dailyStats.set(dayStr, { remaining: tasks.length, created: 0 });
  }

  // Update based on completion
  tasks.forEach((task: any) => {
    const createdAt = task.created_at.split("T")[0];
    const completedAt = task.completed && task.completed_at ? task.completed_at.split("T")[0] : null;

    if (dailyStats.has(createdAt)) {
      const stats = dailyStats.get(createdAt)!;
      stats.created = (stats.created || 0) + 1;
    }

    if (completedAt && dailyStats.has(completedAt)) {
      const stats = dailyStats.get(completedAt)!;
      stats.remaining = (stats.remaining || tasks.length) - 1;
    }
  });

  // Generate burndown points
  const burndown: BurndownPoint[] = [];
  const totalTasks = tasks.length;

  Array.from(dailyStats.entries()).forEach(([day, stats]) => {
    const idealRate = totalTasks > 0 ? totalTasks / (dailyStats.size || 1) : 0;
    const dayIndex = Array.from(dailyStats.keys()).indexOf(day);
    const ideal = totalTasks - (idealRate * (dayIndex + 1));

    burndown.push({
      day,
      remaining: stats.remaining,
      ideal: Math.round(ideal),
    });
  });

  return burndown;
}

// POST: Update team velocity settings
export async function POST(request: NextRequest) {
  const middlewareResult = await applyMiddleware(request, { requireAuth: true });
  if (middlewareResult.error) {
    return middlewareResult.error;
  }

  try {
    const body = await request.json();
    const { setting, value } = body;

    // Validate setting
    const validSettings = ["velocity_target", "capacity_adjustment", "tracking_enabled"];
    if (!validSettings.includes(setting)) {
      return errorResponse("Invalid setting", 400);
    }

    // In a real implementation, this would save to user_settings or a team_settings table
    // For now, just acknowledge the update
    return jsonResponse({ success: true, setting, value }, 200, middlewareResult.headers);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update settings";
    return errorResponse(message, 400);
  }
}
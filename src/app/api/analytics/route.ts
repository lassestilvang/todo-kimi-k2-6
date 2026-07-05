import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// Helper to convert TEXT time strings to Date objects (SQLite stores them as TEXT)
function parseIsoDate(isoString: string): Date {
  return new Date(isoString);
}

export async function GET(_request: Request) {
  try {
    const db = getDb();

    // Get all tasks with status and timing info
    // all() returns an array directly for SQLite
    const tasks = db.prepare("SELECT * FROM tasks").all() as any[];

    // Calculate completion rate
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.completed === 1 || t.completed === true);
    const completionRate = totalTasks > 0 ?completedTasks.length / totalTasks : 0;

    // Calculate overdue tasks (assuming deadline is stored in ISO format)
    const now = new Date();
    const overdueTasks = tasks.filter(t => {
      if (!t.deadline) return false;
      const deadline = parseIsoDate(t.deadline);
      return deadline < now && !completedTasks.some(c => c.id === t.id);
    }).length;

    // Calculate tasks by priority
    const priorityCounts: Record<string, number> = {};
    tasks.forEach((t) => {
      if (t.priority) {
        priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
      }
    });

    // Calculate average estimated duration for tasks that have it
    const durations = tasks
      .filter(t => t.estimated_duration)
      .map(t => t.estimated_duration);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    // Build response
    const analytics = {
      totalTasks,
      completedTasks: completedTasks.length,
      completionRate: Math.round(completionRate * 100), // percentage
      overdueTasks,
      priorityDistribution: priorityCounts,
      averageEstimatedDurationMinutes: avgDuration,
      tasksByStatus: {
        completed: completedTasks.length,
        pending: tasks.length - completedTasks.length,
      },
    };

    return NextResponse.json(analytics);
  } catch (error: unknown) {
    console.error("Analytics error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
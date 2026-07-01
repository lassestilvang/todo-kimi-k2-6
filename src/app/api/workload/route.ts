import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  generateWorkloadSuggestions,
  getUserWorkloadSummary,
  type UserWorkload,
} from "@/lib/ai/workload";

/**
 * Workload API routes.
 *
 * GET /api/workload - Get workload balancing suggestions
 */

export async function GET() {
  try {
    const db = getDb();

    // Get all tasks with assignee info
    const tasks = db
      .prepare(
        `SELECT t.id, t.name, t.assignee_id, t.priority, t.date, t.estimate, t.completed
         FROM tasks t`
      )
      .all() as Array<{
        id: number;
        name: string;
        assignee_id: number | null;
        priority: string;
        date: string | null;
        estimate: string | null;
        completed: number;
      }>;

    // Get all users
    const users = db
      .prepare("SELECT id, name, email FROM users")
      .all() as Array<{ id: number; name: string | null; email: string }>;

    // Calculate workload for each user
    const userWorkloads: UserWorkload[] = users.map((user) => ({
      userId: user.id,
      userName: user.name || user.email,
      email: user.email,
      totalTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      highPriorityTasks: 0,
      avgEstimatedTime: 0,
      totalEstimatedTime: 0,
    }));

    // Get workload summary for each user
    const enrichedUsers = userWorkloads.map((user) =>
      getUserWorkloadSummary(user, tasks.map((t) => ({ ...t, completed: t.completed === 1 })))
    );

    // Generate suggestions
    const suggestions = await generateWorkloadSuggestions(
      tasks.map((t) => ({ ...t, completed: t.completed === 1 })),
      enrichedUsers
    );

    return NextResponse.json({
      workloads: enrichedUsers,
      suggestions,
      averageWorkload: enrichedUsers.reduce((sum, u) => sum + u.totalTasks, 0) /
        (enrichedUsers.length || 1),
    });
  } catch (error) {
    console.error("Error fetching workload:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
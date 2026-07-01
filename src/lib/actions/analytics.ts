"use server";

import { getDb } from "@/lib/db";
import type { Goal } from "@/types";

interface TaskAnalytics {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  completionRate: number;
  tasksByPriority: { critical: number; high: number; medium: number; low: number; none: number };
  tasksByList: Array<{ list_name: string; count: number }>;
  weeklyCompletion: Array<{ date: string; completed: number }>;
}

export async function getTaskAnalytics(userId?: number): Promise<TaskAnalytics> {
  const db = getDb();

  // Build where clause for user filtering
  const whereClause = userId ? "WHERE t.created_by = ? OR t.assignee_id = ?" : "";
  const groupBy = userId ? "" : "";

  // Get basic stats
  const totalResult = db.prepare(`SELECT COUNT(*) as count FROM tasks t ${whereClause}`).get(userId ? [userId, userId] : []) as { count: number };
  const completedResult = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE t.completed = 1 ${userId ? `AND (t.created_by = ? OR t.assignee_id = ?)` : ""}`).get(userId ? [userId, userId] : []) as { count: number };
  const overdueResult = db.prepare(`SELECT COUNT(*) as count FROM tasks t WHERE t.deadline IS NOT NULL AND t.deadline < date('now') AND t.completed = 0 ${userId ? `AND (t.created_by = ? OR t.assignee_id = ?)` : ""}`).get(userId ? [userId, userId] : []) as { count: number };

  // Get tasks by priority
  const priorityResults = db.prepare(`
    SELECT priority, COUNT(*) as count FROM tasks t ${whereClause}
    GROUP BY priority
  `).all(userId ? [userId] : []) as Array<{ priority: string; count: number }>;

  const tasksByPriority = {
    critical: priorityResults.find(r => r.priority === "critical")?.count ?? 0,
    high: priorityResults.find(r => r.priority === "high")?.count ?? 0,
    medium: priorityResults.find(r => r.priority === "medium")?.count ?? 0,
    low: priorityResults.find(r => r.priority === "low")?.count ?? 0,
    none: priorityResults.find(r => r.priority === "none")?.count ?? 0,
  };

  // Get tasks by list
  const tasksByListResult = db.prepare(`
    SELECT l.name as list_name, COUNT(t.id) as count
    FROM tasks t
    LEFT JOIN lists l ON t.list_id = l.id
    ${whereClause}
    GROUP BY l.name
    ORDER BY count DESC
    LIMIT 10
  `).all(userId ? [userId, userId] : []) as Array<{ list_name: string; count: number }>;

  // Get weekly completion data (last 12 weeks)
  const weeklyCompletion = db.prepare(`
    SELECT date(created_at) as date, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed
    FROM tasks t
    ${userId ? "WHERE t.created_by = ? OR t.assignee_id = ?" : ""}
    AND created_at >= date('now', '-12 weeks')
    GROUP BY date(created_at)
    ORDER BY date
  `).all(userId ? [userId, userId] : []) as Array<{ date: string; completed: number }>;

  return {
    totalTasks: totalResult.count,
    completedTasks: completedResult.count,
    overdueTasks: overdueResult.count,
    highPriorityTasks: tasksByPriority.critical + tasksByPriority.high,
    completionRate: totalResult.count > 0 ? Math.round((completedResult.count / totalResult.count) * 100) : 0,
    tasksByPriority,
    tasksByList: tasksByListResult,
    weeklyCompletion,
  };
}

export async function getGoalAnalytics(): Promise<{
  totalGoals: number;
  completedGoals: number;
  averageProgress: number;
  streakGoals: number;
}> {
  const db = getDb();

  const goals = await db.prepare("SELECT * FROM goals").all() as Goal[];

  const totalGoals = goals.length;
  const completedGoals = goals.filter(g => g.current_count >= g.target_count).length;
  const averageProgress = totalGoals > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.target_count > 0 ? (g.current_count / g.target_count) * 100 : 0), 0) / totalGoals)
    : 0;
  const streakGoals = goals.filter(g => g.streak_count > 0).length;

  return {
    totalGoals,
    completedGoals,
    averageProgress,
    streakGoals,
  };
}
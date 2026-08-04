"use server";

import { getDb } from "@/lib/db";
import type { Goal } from "@/types";

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  avatar_url?: string;
  task_count: number;
  completion_rate: number;
  last_active: string;
}

export interface TeamVelocityReport {
  teamMembers: TeamMember[];
  avgCompletionRate: number;
  velocityTrend: number;
  capacityUtilization: number;
  upcomingDeadlines: Array<{
    task_id: number;
    task_name: string;
    assignee: string;
    deadline: string;
    days_until: number;
  }>;
  blockers: Array<{
    task_id: number;
    task_name: string;
    blocked_by: number;
  }>;
}

export async function getTeamVelocityReport(workspaceId?: number, timeframe: "week" | "month" | "quarter" | "year" = "month"): Promise<TeamVelocityReport> {
  const db = getDb();

  // Get team members working on tasks
  const teamMembers = await getTeamMembers(db, workspaceId);

  // Calculate average completion rate
  const avgCompletionRate = teamMembers.reduce((sum, m) => sum + m.completion_rate, 0) / Math.max(1, teamMembers.length);

  // Calculate velocity trend (comparison with previous period)
  const velocityTrend = await getVelocityTrend(db, workspaceId, timeframe);

  // Calculate capacity utilization
  const capacityUtilization = await getCapacityUtilization(db, workspaceId);

  // Get upcoming deadlines
  const upcomingDeadlines = await getUpcomingDeadlines(db, workspaceId, 14);

  // Get blockers
  const blockers = await getBlockers(db, workspaceId);

  return {
    teamMembers,
    avgCompletionRate,
    velocityTrend,
    capacityUtilization,
    upcomingDeadlines,
    blockers,
  };
}

async function getTeamMembers(db: ReturnType<typeof getDb>, workspaceId?: number): Promise<TeamMember[]> {
  if (workspaceId) {
    // Get members of a specific workspace
    const results = await db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        COUNT(t.id) as task_count,
        ROUND(AVG(CAST(t.completed AS REAL)) * 100, 1) as completion_rate,
        MAX(t.updated_at) as last_active
      FROM workspace_users wu
      JOIN users u ON wu.user_id = u.id
      LEFT JOIN tasks t ON (t.assignee_id = u.id OR t.created_by = u.id)
      WHERE wu.workspace_id = ?
      GROUP BY u.id, u.name, u.email, u.avatar_url
      ORDER BY task_count DESC
    `).all(workspaceId) as any[];

    return results.map(r => ({
      id: r.id,
      name: r.name || r.email,
      email: r.email,
      avatar_url: r.avatar_url,
      task_count: r.task_count || 0,
      completion_rate: r.completion_rate || 0,
      last_active: r.last_active || new Date().toISOString(),
    }));
  } else {
    // Get all users with tasks
    const results = await db.prepare(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.avatar_url,
        COUNT(t.id) as task_count,
        ROUND(AVG(CAST(t.completed AS REAL)) * 100, 1) as completion_rate,
        MAX(t.updated_at) as last_active
      FROM users u
      LEFT JOIN tasks t ON t.assignee_id = u.id
      WHERE u.id IS NOT NULL
      GROUP BY u.id, u.name, u.email, u.avatar_url
      ORDER BY task_count DESC
    `).all() as any[];

    return results.map(r => ({
      id: r.id,
      name: r.name || r.email,
      email: r.email,
      avatar_url: r.avatar_url,
      task_count: r.task_count || 0,
      completion_rate: r.completion_rate || 0,
      last_active: r.last_active || new Date().toISOString(),
    }));
  }
}

async function getVelocityTrend(db: ReturnType<typeof getDb>, workspaceId?: number, timeframe: string = "month"): Promise<number> {
  // Compare current period with previous period
  const now = new Date();
  const currentPeriodStart = new Date();

  let previousPeriodStart: Date;
  let previousPeriodEnd: Date;

  switch (timeframe) {
    case "week":
      currentPeriodStart.setDate(now.getDate() - 7);
      previousPeriodStart = new Date(now.getDate() - 14);
      previousPeriodEnd = new Date(now.getDate() - 7);
      break;
    case "month":
      currentPeriodStart.setMonth(now.getMonth() - 1);
      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      previousPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
      break;
    case "quarter":
      currentPeriodStart.setMonth(now.getMonth() - 3);
      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      previousPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 3, 0);
      break;
    default:
      currentPeriodStart.setMonth(now.getMonth() - 1);
      previousPeriodStart = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      previousPeriodEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0);
  }

  // Get current period completions
  const currentWhere = workspaceId
    ? `WHERE (t.workspace_id = ? OR t.assignee_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?)) AND t.completed_at >= ?`
    : `WHERE t.completed_at >= ?`;

  const currentParams = workspaceId ? [workspaceId, workspaceId, currentPeriodStart.toISOString()] : [currentPeriodStart.toISOString()];

  const currentResult = await db.prepare(`
    SELECT COUNT(*) as count FROM tasks t
    ${currentWhere}
  `).get(...currentParams) as { count: number };

  // Get previous period completions
  const previousWhere = workspaceId
    ? `WHERE (t.workspace_id = ? OR t.assignee_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?)) AND t.completed_at >= ? AND t.completed_at < ?`
    : `WHERE t.completed_at >= ? AND t.completed_at < ?`;

  const previousParams = workspaceId ? [workspaceId, workspaceId, previousPeriodStart.toISOString(), previousPeriodEnd.toISOString()] : [previousPeriodStart.toISOString(), previousPeriodEnd.toISOString()];

  const previousResult = await db.prepare(`
    SELECT COUNT(*) as count FROM tasks t
    ${previousWhere}
  `).get(...previousParams) as { count: number };

  // Calculate trend percentage
  if (previousResult.count === 0) return currentResult.count > 0 ? 100 : 0;

  const trend = Math.round(((currentResult.count - previousResult.count) / previousResult.count) * 100);
  return Math.max(-100, Math.min(100, trend)); // Cap between -100% and 100%
}

async function getCapacityUtilization(db: ReturnType<typeof getDb>, workspaceId?: number): Promise<number> {
  // Calculate based on hours available vs hours estimated
  const now = new Date();
  const startOfPeriod = new Date();
  startOfPeriod.setDate(now.getDate() - 7); // Last 7 days

  const whereClause = workspaceId
    ? `WHERE (t.workspace_id = ? OR t.assignee_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?))`
    : "";

  const params = workspaceId ? [workspaceId, workspaceId] : [];

  // Get time tracking data
  const timeResults = await db.prepare(`
    SELECT
      t.deadline,
      te.duration_seconds
    FROM tasks t
    LEFT JOIN time_entries te ON t.id = te.task_id
    ${whereClause ? `WHERE ${whereClause}` : ""}
  `).all(...params) as any[];

  // Get user count
  const userCount = workspaceId
    ? await db.prepare("SELECT COUNT(*) as count FROM workspace_users WHERE workspace_id = ?").get(workspaceId) as { count: number }
    : await db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };

  const userCountNum = userCount.count || 1;

  // Calculate - assume 5 productive hours per person per day = 35 hours/week
  const totalCapacityHours = userCountNum * 35;

  // Get tracked time in hours
  const trackedSeconds = timeResults.reduce((sum, r) => sum + (r.duration_seconds || 0), 0);
  const trackedHours = trackedSeconds / 3600;

  // Calculate utilization (capped at 120% to allow for overtime)
  const utilization = Math.min(120, (trackedHours / totalCapacityHours) * 100);

  return Math.round(utilization);
}

async function getUpcomingDeadlines(db: ReturnType<typeof getDb>, workspaceId?: number, days: number = 14): Promise<Array<{
  task_id: number;
  task_name: string;
  assignee: string;
  deadline: string;
  days_until: number;
}>> {
  const whereClause = workspaceId
    ? `WHERE t.deadline IS NOT NULL
        AND t.deadline <= date('now', '+${days} days')
        AND t.completed = 0
        AND (t.workspace_id = ? OR t.assignee_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?))`
    : `WHERE t.deadline IS NOT NULL
        AND t.deadline <= date('now', '+${days} days')
        AND t.completed = 0`;

  const params = workspaceId ? [workspaceId, workspaceId] : [];

  const results = await db.prepare(`
    SELECT
      t.id as task_id,
      t.name as task_name,
      u.name as assignee,
      t.deadline,
      CAST((julianday(t.deadline) - julianday('now')) AS INTEGER) as days_until
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    ${whereClause ? `WHERE ${whereClause}` : ""}
    ORDER BY t.deadline ASC
    LIMIT 10
  `).all(...params) as any[];

  return results.map(r => ({
    task_id: r.task_id,
    task_name: r.task_name,
    assignee: r.assignee || "Unassigned",
    deadline: r.deadline,
    days_until: r.days_until || 0,
  }));
}

async function getBlockers(db: ReturnType<typeof getDb>, workspaceId?: number): Promise<Array<{
  task_id: number;
  task_name: string;
  blocked_by: number;
}>> {
  const whereClause = workspaceId
    ? `WHERE td.task_id IN (SELECT id FROM tasks WHERE workspace_id = ? OR assignee_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?))`
    : "";

  const params = workspaceId ? [workspaceId, workspaceId] : [];

  const results = await db.prepare(`
    SELECT
      td.task_id,
      t.name as task_name,
      td.depends_on_task_id as blocked_by
    FROM task_dependencies td
    JOIN tasks t ON td.task_id = t.id
    ${whereClause ? `WHERE ${whereClause}` : ""}
    LIMIT 10
  `).all(...params) as any[];

  return results.map(r => ({
    task_id: r.task_id,
    task_name: r.task_name,
    blocked_by: r.blocked_by,
  }));
}

// Get sprint velocity history for burndown chart
export async function getSprintHistory(workspaceId?: number, limit: number = 12): Promise<Array<{
  sprint_id: number;
  name: string;
  start_date: string;
  end_date: string;
  planned: number;
  completed: number;
  completion_rate: number;
}>> {
  const db = getDb();

  const whereClause = workspaceId
    ? `WHERE t.workspace_id = ? OR t.assignee_id IN (SELECT user_id FROM workspace_users WHERE workspace_id = ?)`
    : "";

  const params = workspaceId ? [workspaceId, workspaceId] : [];

  // Group tasks by week to create sprint-like periods
  const results = await db.prepare(`
    SELECT
      strftime('%Y-%W', t.created_at) as sprint_id,
      date(t.created_at, 'start of week') as start_date,
      date(t.created_at, 'start of week', '+6 days') as end_date,
      COUNT(*) as planned,
      SUM(CASE WHEN t.completed = 1 THEN 1 ELSE 0 END) as completed,
      ROUND(AVG(CAST(t.completed AS REAL)) * 100, 1) as completion_rate
    FROM tasks t
    ${whereClause ? `WHERE ${whereClause}` : ""}
    AND t.created_at >= date('now', '-${limit} weeks')
    GROUP BY strftime('%Y-%W', t.created_at)
    ORDER BY start_date DESC
    LIMIT ${limit}
  `).all(...params) as any[];

  return results.map(r => ({
    sprint_id: parseInt(r.sprint_id),
    name: `Sprint ${r.sprint_id}`,
    start_date: r.start_date,
    end_date: r.end_date,
    planned: r.planned,
    completed: r.completed,
    completion_rate: r.completion_rate,
  }));
}
/**
 * Team Command Center - Velocity tracking and team analytics
 */

"use server";

import { getDb } from "@/lib/db";
import { revalidatePath } from "next/cache";

export interface TeamMember {
  id: number;
  user_id: number;
  role: "owner" | "admin" | "member" | "viewer";
  joined_at: string;
  user: {
    name: string;
    email: string;
  };
}

export interface VelocityEntry {
  id: number;
  user_id: number;
  date: string;
  completed_count: number;
  planned_count: number;
  story_points: number;
  notes: string;
  created_at: string;
}

export interface TeamVelocityReport {
  teamId: number;
  periodStart: string;
  periodEnd: string;
  velocity: number;
  velocityTrend: number;
  completionRate: number;
  averageCycleTime: number;
  topContributors: Array<{
    userId: number;
    name: string;
    velocity: number;
    completionRate: number;
  }>;
  blockers: Array<{
    taskId: number;
    taskName: string;
    blockedBy: string;
  }>;
}

export interface TeamActivity {
  date: string;
  actions: number;
  completions: number;
  creations: number;
  comments: number;
}

/**
 * Get team members
 */
export async function getTeamMembers(workspaceId: number): Promise<TeamMember[]> {
  const db = getDb();

  const stmts = db.prepare(`
    SELECT
      wu.id,
      wu.user_id,
      wu.role,
      wu.joined_at,
      u.name,
      u.email
    FROM workspace_users wu
    JOIN users u ON wu.user_id = u.id
    WHERE wu.workspace_id = ?
    ORDER BY wu.joined_at ASC
  `);

  const rows = stmts.all(workspaceId) as any[];

  return rows.map(row => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    user: {
      name: row.name || row.email,
      email: row.email
    }
  }));
}

/**
 * Get team velocity for a period
 */
export async function getTeamVelocity(
  workspaceId: number,
  options?: {
    periodStart?: string;
    periodEnd?: string;
    memberId?: number;
  }
): Promise<TeamVelocityReport> {
  const db = getDb();

  const periodStart = options?.periodStart || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const periodEnd = options?.periodEnd || new Date().toISOString().split('T')[0];
  const memberFilter = options?.memberId;

  // Get tasks in workspace
  const tasks = db.prepare(`
    SELECT
      id, name, completed, completed_at, created_at,
      assignee_id, estimated_minutes, actual_minutes
    FROM tasks
    WHERE workspace_id = ?
    ${memberFilter ? "AND assignee_id = ?" : ""}
  `);

  const allTasks = memberFilter
    ? tasks.all(workspaceId, memberFilter) as any[]
    : tasks.all(workspaceId) as any[];

  // Calculate velocity (completed tasks per day)
  const completedTasks = allTasks.filter(t => t.completed && t.completed_at);
  const completedCount = completedTasks.length;

  // Group by date
  const dailyCompletions = new Map<string, number>();
  completedTasks.forEach(task => {
    const date = task.completed_at.split('T')[0];
    const current = dailyCompletions.get(date) || 0;
    dailyCompletions.set(date, current + 1);
  });

  const daysWithWork = Array.from(dailyCompletions.values());
  const totalDays = new Set(completedTasks.map(t => t.completed_at.split('T')[0])).size;

  const velocity = totalDays > 0
    ? Math.round(completedCount / totalDays * 10) / 10
    : 0;

  // Calculate velocity trend (compare last 7 days to previous 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const lastSeven = completedTasks.filter(t => t.completed_at && t.completed_at >= sevenDaysAgo);
  const prevSeven = completedTasks.filter(t => t.completed_at && t.completed_at < sevenDaysAgo);

  const currentVelocity = lastSeven.length / 7;
  const previousVelocity = prevSeven.length / 7;
  const velocityTrend = previousVelocity > 0
    ? Math.round(((currentVelocity - previousVelocity) / previousVelocity) * 100)
    : 0;

  // Calculate completion rate
  const totalTasks = allTasks.length;
  const completionRate = totalTasks > 0
    ? Math.round((completedCount / totalTasks) * 100)
    : 0;

  // Calculate average cycle time
  const cycleTimes = completedTasks.map(t => {
    const created = new Date(t.created_at);
    const completed = new Date(t.completed_at);
    return (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });
  const averageCycleTime = cycleTimes.length > 0
    ? Math.round(cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length)
    : 0;

  // Get top contributors
  const memberVelocity = new Map<number, { count: number; completions: number }>();

  allTasks.forEach(task => {
    const assigneeId = task.assignee_id;
    if (!assigneeId) return;

    const current = memberVelocity.get(assigneeId) || { count: 0, completions: 0 };
    if (task.completed) {
      current.completions += 1;
    }
    current.count += 1;
    memberVelocity.set(assigneeId, current);
  });

  const members = await getTeamMembers(workspaceId);
  const topContributors = members.map(member => {
    const data = memberVelocity.get(member.user_id) || { count: 0, completions: 0 };
    return {
      userId: member.user_id,
      name: member.user.name,
      velocity: data.completions,
      completionRate: data.count > 0 ? Math.round((data.completions / data.count) * 100) : 0
    };
  }).sort((a, b) => b.velocity - a.velocity).slice(0, 5);

  // Get blockers (tasks with dependencies)
  const blockers = db.prepare(`
    SELECT t.id, t.name
    FROM task_dependencies td
    JOIN tasks t ON td.task_id = t.id
    WHERE t.workspace_id = ? AND td.type = 'hard'
  `).all(workspaceId) as any[];

  return {
    teamId: workspaceId,
    periodStart,
    periodEnd,
    velocity,
    velocityTrend,
    completionRate,
    averageCycleTime,
    topContributors,
    blockers: blockers.map(b => ({
      taskId: b.id,
      taskName: b.name,
      blockedBy: "Task dependency"
    }))
  };
}

/**
 * Get team activity heat map
 */
export async function getTeamActivity(
  workspaceId: number,
  days = 30
): Promise<TeamActivity[]> {
  const db = getDb();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  const startStr = startDate.toISOString().split('T')[0];

  // Get daily activity
  const activities = db.prepare(`
    SELECT
      date(created_at) as date,
      COUNT(*) as actions,
      SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completions,
      SUM(CASE WHEN status = 'todo' OR status IS NULL THEN 1 ELSE 0 END) as creations
    FROM tasks
    WHERE workspace_id = ? AND date >= ?
    GROUP BY date(created_at)
    ORDER BY date
  `).all(workspaceId, startStr) as any[];

  // Get comments count
  const commentCounts = db.prepare(`
    SELECT date(created_at) as date, COUNT(*) as comments
    FROM task_comments
    WHERE workspace_id = ?
    GROUP BY date(created_at)
  `).all(workspaceId) as any[];

  const commentMap = new Map<string, number>();
  commentCounts.forEach((c: any) => {
    commentMap.set(c.date, c.comments);
  });

  const today = new Date();
  const result: TeamActivity[] = [];

  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (days - 1 - i));
    const dateStr = d.toISOString().split('T')[0];

    const activity = activities.find((a: any) => a.date === dateStr);

    result.push({
      date: dateStr,
      actions: activity?.actions || 0,
      completions: activity?.completions || 0,
      creations: activity?.creations || 0,
      comments: commentMap.get(dateStr) || 0
    });
  }

  return result;
}

/**
 * Get team size distribution
 */
export async function getTeamSizeDistribution(workspaceId: number): Promise<{
  junior: number;
  mid: number;
  senior: number;
}> {
  const db = getDb();

  // In a real implementation, this would analyze task complexity and completion patterns
  const members = await getTeamMembers(workspaceId);
  const velocityData = await getTeamVelocityReport(workspaceId);

  const juniorCount = velocityData.topContributors.filter(m => m.velocity < 5).length;
  const seniorCount = velocityData.topContributors.filter(m => m.velocity > 15).length;
  const midCount = members.length - juniorCount - seniorCount;

  return {
    junior: Math.max(0, juniorCount),
    mid: Math.max(0, midCount),
    senior: Math.max(0, seniorCount)
  };
}

/**
 * Get detailed velocity report
 */
export async function getTeamVelocityReport(workspaceId: number): Promise<TeamVelocityReport> {
  return getTeamVelocity(workspaceId, {
    periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0]
  });
}

/**
 * Record team velocity entry
 */
export async function recordVelocityEntry(
  userId: number,
  data: {
    date: string;
    completedCount: number;
    plannedCount: number;
    storyPoints: number;
    notes?: string;
  }
): Promise<{ id: number }> {
  const db = getDb();

  const result = db.prepare(`
    INSERT INTO velocity_entries (user_id, date, completed_count, planned_count, story_points, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    data.date,
    data.completedCount,
    data.plannedCount,
    data.storyPoints,
    data.notes || null
  );

  revalidatePath(`/team`);
  return { id: result.lastInsertRowid as number };
}

/**
 * Get workload distribution across team
 */
export async function getTeamWorkloadDistribution(workspaceId: number): Promise<{
  totalTasks: number;
  completed: number;
  inProgress: number;
  blocked: number;
  distribution: Array<{ userId: number; name: string; taskCount: number; completed: number; completionRate: number }>;
}> {
  const db = getDb();

  const allTasks = db.prepare(`
    SELECT t.*, u.name as user_name
    FROM tasks t
    LEFT JOIN users u ON t.assignee_id = u.id
    WHERE t.workspace_id = ?
  `).all(workspaceId) as any[];

  const totalTasks = allTasks.length;
  const completed = allTasks.filter(t => t.completed).length;
  const inProgress = allTasks.filter(t => !t.completed && t.status !== 'done').length;
  const blocked = allTasks.filter(t => t.status === 'blocked').length;

  // Distribution by user
  const userTasks = new Map<number, { count: number; completed: number; name: string }>();

  allTasks.forEach(task => {
    const assigneeId = task.assignee_id;
    if (!assigneeId) return;

    const current = userTasks.get(assigneeId) || { count: 0, completed: 0, name: task.user_name || 'Unknown' };
    current.count += 1;
    if (task.completed) current.completed += 1;
    current.name = task.user_name || current.name;
    userTasks.set(assigneeId, current);
  });

  const distribution = Array.from(userTasks.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    taskCount: data.count,
    completed: data.completed,
    completionRate: data.count > 0 ? Math.round((data.completed / data.count) * 100) : 0
  })).sort((a, b) => b.taskCount - a.taskCount);

  return {
    totalTasks,
    completed,
    inProgress,
    blocked,
    distribution
  };
}

/**
 * Predict team capacity
 */
export async function predictTeamCapacity(
  workspaceId: number,
  periodWeeks = 4
): Promise<{
  predictedVelocity: number;
  capacityHours: number;
  recommendedTasks: number;
  confidence: number;
}> {
  const report = await getTeamVelocityReport(workspaceId);
  const workload = await getTeamWorkloadDistribution(workspaceId);
  const members = await getTeamMembers(workspaceId);

  // Base velocity
  const predictedVelocity = report.velocity * periodWeeks;

  // Assume 6 hours of productive work per team member per day
  const capacityHours = members.length * 6 * 5 * periodWeeks;

  // Recommended tasks based on velocity
  const recommendedTasks = Math.round(predictedVelocity * 1.2);

  // Confidence based on trend and completion rate
  const confidence = Math.min(100, Math.max(0,
    report.completionRate + Math.abs(report.velocityTrend)
  ));

  return {
    predictedVelocity,
    capacityHours,
    recommendedTasks,
    confidence
  };
}
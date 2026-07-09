/**
 * Workload Balancing AI Suggestions
 * Analyzes task distribution and suggests optimal reassignments
 */

import { getAIManager } from "./providers";

/**
 * Task schedule conflict detection
 */
export interface ScheduleConflict {
  taskId: number;
  taskName: string;
  conflictType: "overlap" | "too_many_tasks" | "missing_deadline";
  conflictingTaskIds?: number[];
  date?: string;
  suggestedResolution?: {
    newDate?: string;
    newTime?: string;
    splitInto?: number;
  };
}

/**
 * Time-based productivity pattern
 */
export interface ProductivityPattern {
  hour: number;
  completionRate: number;
  taskCount: number;
}

/**
 * Detect scheduling conflicts for tasks
 */
export function detectScheduleConflicts(
  tasks: Array<{
    id: number;
    name: string;
    date: string | null;
    deadline: string | null;
    estimate: string | null;
    completed: boolean;
    priority: string;
  }>
): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Group tasks by date
  const tasksByDate = tasks
    .filter((t) => !t.completed && t.date)
    .reduce((acc, task) => {
      const date = task.date!;
      if (!acc[date]) acc[date] = [];
      acc[date].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

  // Check for too many tasks on a single day (>5 tasks)
  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    if (dayTasks.length > 5) {
      conflicts.push({
        taskId: dayTasks[0].id,
        taskName: dayTasks[0].name,
        conflictType: "too_many_tasks",
        date,
        conflictingTaskIds: dayTasks.map((t) => t.id),
        suggestedResolution: {
          newDate: getNextAvailableDay(date, tasksByDate),
        },
      });
    }
  }

  // Check for tasks missing deadlines
  const missingDeadlines = tasks.filter(
    (t) => !t.completed && !t.deadline && t.date && new Date(t.date) < nextWeek && t.priority !== "low"
  );
  for (const task of missingDeadlines) {
    conflicts.push({
      taskId: task.id,
      taskName: task.name,
      conflictType: "missing_deadline",
      date: task.date!,
    });
  }

  return conflicts;
}

/**
 * Find the next day with fewer than 5 tasks
 */
function getNextAvailableDay(
  currentDate: string,
  tasksByDate: Record<string, Array<{ id: number }>>
): string {
  const current = new Date(currentDate);
  for (let i = 1; i <= 14; i++) {
    const next = new Date(current.getTime() + i * 24 * 60 * 60 * 1000);
    const nextDate = next.toISOString().split("T")[0];
    if (!tasksByDate[nextDate] || tasksByDate[nextDate].length < 4) {
      return nextDate;
    }
  }
  return currentDate; // Default to current date if no better option found
}

/**
 * Analyze productivity patterns by hour
 */
export function analyzeProductivityPatterns(
  tasks: Array<{
    id: number;
    date: string | null;
    completed: boolean;
  }>,
  timeEntries: Array<{
    task_id: number;
    start_time: string;
    end_time: string | null;
    duration_seconds: number | null;
  }>
): ProductivityPattern[] {
  const patterns: ProductivityPattern[] = [];

  // Initialize hourly data
  for (let h = 0; h < 24; h++) {
    patterns.push({ hour: h, completionRate: 0, taskCount: 0 });
  }

  // Count completed tasks by hour
  const completedByHour = timeEntries.reduce((acc, entry) => {
    if (entry.end_time) {
      const hour = new Date(entry.start_time).getHours();
      if (!acc[hour]) acc[hour] = { completed: 0, total: 0 };
      acc[hour].completed++;
    }
    return acc;
  }, {} as Record<number, { completed: number; total: number }>);

  // Count total tasks by date and estimate hour
  const tasksByHour = tasks.reduce((acc, task) => {
    if (task.date) {
      const hour = 10; // Default estimated hour
      if (!acc[hour]) acc[hour] = { completed: 0, total: 0 };
      acc[hour].total++;
    }
    return acc;
  }, {} as Record<number, { completed: number; total: number }>);

  // Merge statistics
  for (const hour of Object.keys(completedByHour)) {
    const h = parseInt(hour);
    const pattern = patterns.find((p) => p.hour === h);
    if (pattern) {
      const data = completedByHour[h];
      pattern.taskCount = data.total;
      pattern.completionRate = data.completed / Math.max(1, data.total);
    }
  }

  return patterns.sort((a, b) => b.completionRate - a.completionRate);
}

/**
 * Suggest rescheduling for overloaded days
 */
export function suggestOptimalRescheduling(
  tasks: Array<{
    id: number;
    name: string;
    date: string | null;
    estimate: string | null;
    priority: string;
  }>,
  productivityPatterns: ProductivityPattern[]
): Array<{ taskId: number; taskName: string; currentDate: string; suggestedDate: string; confidence: number }> {
  const suggestions = [];
  const peakHours = productivityPatterns.slice(0, 3).map((p) => p.hour);

  // Find tasks on overloaded days
  const tasksByDate = tasks
    .filter((t) => t.date && !t.estimate) // Tasks without estimates need rescheduling
    .reduce((acc, task) => {
      const date = task.date!;
      if (!acc[date]) acc[date] = [];
      acc[date].push(task);
      return acc;
    }, {} as Record<string, typeof tasks>);

  for (const [date, dayTasks] of Object.entries(tasksByDate)) {
    if (dayTasks.length > 3) {
      // Overloaded day - suggest moving some tasks
      const lowPriority = dayTasks.filter((t) => t.priority === "low" || t.priority === "none");
      for (const task of lowPriority.slice(0, 2)) {
        const nextDay = getNextAvailableSlot(date, tasksByDate, peakHours);
        suggestions.push({
          taskId: task.id,
          taskName: task.name,
          currentDate: date,
          suggestedDate: nextDay,
          confidence: 0.7,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Find next available day near peak productivity hours
 */
function getNextAvailableSlot(
  currentDate: string,
  tasksByDate: Record<string, Array<{ id: number }>>,
  peakHours: number[]
): string {
  const current = new Date(currentDate);
  for (let i = 1; i <= 7; i++) {
    const next = new Date(current.getTime() + i * 24 * 60 * 60 * 1000);
    const nextDate = next.toISOString().split("T")[0];
    const dayOfWeek = next.getDay();
    const isPeakDay = peakHours.includes(dayOfWeek);

    if ((!tasksByDate[nextDate] || tasksByDate[nextDate].length < 4) && isPeakDay) {
      return nextDate;
    }
  }

  // Fallback: just find any day with fewer tasks
  for (let i = 1; i <= 14; i++) {
    const next = new Date(current.getTime() + i * 24 * 60 * 60 * 1000);
    const nextDate = next.toISOString().split("T")[0];
    if (!tasksByDate[nextDate] || tasksByDate[nextDate].length < 4) {
      return nextDate;
    }
  }

  return currentDate;
}

/**
 * Work schedule analysis
 */
export interface ScheduleAnalysis {
  conflicts: ScheduleConflict[];
  productivityPatterns: ProductivityPattern[];
  suggestedReschedule: Array<{
    taskId: number;
    taskName: string;
    currentDate: string;
    suggestedDate: string;
    confidence: number;
  }>;
}

/**
 * Categorize workload levels
 */
export function categorizeWorkload(score: number, avg: number): "underloaded" | "balanced" | "overloaded" {
  if (score < avg * 0.7) return "underloaded";
  if (score > avg * 1.3) return "overloaded";
  return "balanced";
}

/**
 * Calculate balance score for a user
 */
export function calculateBalanceScore(workload: UserWorkload, avgWorkload: number): number {
  const { totalTasks, overdueTasks, highPriorityTasks, totalEstimatedTime } = workload;
  const score = totalTasks * 1 + overdueTasks * 3 + highPriorityTasks * 2 + totalEstimatedTime / 60;
  return Math.max(0, 100 - (score / avgWorkload) * 50);
}

export interface UserWorkload {
  userId: number;
  userName: string;
  email: string;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  highPriorityTasks: number;
  avgEstimatedTime: number;
  totalEstimatedTime: number;
}

export interface WorkloadSuggestion {
  type: "reassign" | "reschedule" | "split";
  taskId: number;
  taskName: string;
  reason: string;
  suggestedAction: {
    reassignTo?: number;
    newDate?: string;
    splitInto?: number;
  };
  confidence: number;
}

/**
 * Calculate workload metrics for all users
 */
export function calculateWorkloads(users: UserWorkload[]): Map<number, number> {
  const workloadMap = new Map<number, number>();

  users.forEach((user) => {
    // Weighted workload score
    const score =
      user.totalTasks * 1 +
      user.overdueTasks * 3 +
      user.highPriorityTasks * 2 +
      user.totalEstimatedTime / 60; // Convert to hours

    workloadMap.set(user.userId, score);
  });

  return workloadMap;
}

/**
 * Generate workload balancing suggestions
 */
export async function generateWorkloadSuggestions(
  tasks: Array<{
    id: number;
    name: string;
    assignee_id: number | null;
    priority: string;
    date: string | null;
    estimate: string | null;
    completed: boolean;
  }>,
  users: UserWorkload[]
): Promise<WorkloadSuggestion[]> {
  const suggestions: WorkloadSuggestion[] = [];

  // Calculate current workloads
  const workloadMap = calculateWorkloads(users);
  const avgWorkload = Array.from(workloadMap.values()).reduce((a, b) => a + b, 0) /
    (workloadMap.size || 1);

  // Find overloaded and underloaded users
  const overloadedUsers = users.filter((u) => workloadMap.get(u.userId)! > avgWorkload * 1.3);
  const underloadedUsers = users.filter((u) => workloadMap.get(u.userId)! < avgWorkload * 0.7);

  // Check for overdue high-priority tasks that could be reassigned
  const overdueHighPriority = tasks.filter(
    (t) => !t.completed && t.priority === "critical" && t.date && new Date(t.date) < new Date()
  );

  for (const task of overdueHighPriority) {
    if (overloadedUsers.length > 0 && underloadedUsers.length > 0) {
      const currentAssignee = users.find((u) => u.userId === task.assignee_id);
      if (currentAssignee && workloadMap.get(currentAssignee.userId)! > avgWorkload) {
        const bestCandidate = underloadedUsers.reduce((best, user) =>
          workloadMap.get(user.userId)! < workloadMap.get(best.userId)!
            ? user
            : best
        );

        suggestions.push({
          type: "reassign",
          taskId: task.id,
          taskName: task.name,
          reason: `Task is overdue and assignee is overloaded (${currentAssignee.totalTasks} tasks)`,
          suggestedAction: {
            reassignTo: bestCandidate.userId,
          },
          confidence: 0.85,
        });
      }
    }
  }

  // Check for tasks that could be rescheduled
  const nearDueTasks = tasks.filter(
    (t) => !t.completed && t.date && new Date(t.date) >= new Date() && new Date(t.date) <= new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  );

  for (const task of nearDueTasks) {
    if (task.estimate) {
      const estimateHours = parseFloat(task.estimate.replace(":", ".")) || 0;
      if (estimateHours > 4) {
        suggestions.push({
          type: "split",
          taskId: task.id,
          taskName: task.name,
          reason: `Large task (${estimateHours}h) near deadline could be broken into smaller subtasks`,
          suggestedAction: {
            splitInto: Math.ceil(estimateHours / 2),
          },
          confidence: 0.7,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Get user workload summary
 */
export function getUserWorkloadSummary(
  user: UserWorkload,
  allTasks: Array<{
    id: number;
    assignee_id: number | null;
    completed: boolean;
    priority: string;
    date: string | null;
    estimate: string | null;
  }>
): UserWorkload {
  const userTasks = allTasks.filter((t) => t.assignee_id === user.userId);
  const completedTasks = userTasks.filter((t) => t.completed);
  const overdueTasks = userTasks.filter(
    (t) => !t.completed && t.date && new Date(t.date) < new Date()
  );
  const highPriorityTasks = userTasks.filter((t) => t.priority === "critical" || t.priority === "high");

  const totalEstimatedTime = userTasks.reduce((sum, t) => {
    if (t.estimate) {
      const hours = parseFloat(t.estimate.replace(":", ".")) || 0;
      return sum + hours;
    }
    return sum;
  }, 0);

  return {
    ...user,
    totalTasks: userTasks.length,
    completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length,
    highPriorityTasks: highPriorityTasks.length,
    totalEstimatedTime,
    avgEstimatedTime: userTasks.length > 0 ? totalEstimatedTime / userTasks.length : 0,
  };
}
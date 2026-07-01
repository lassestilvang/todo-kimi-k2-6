/**
 * Workload Balancing AI Suggestions
 * Analyzes task distribution and suggests optimal reassignments
 */

import { getAIManager } from "./providers";

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
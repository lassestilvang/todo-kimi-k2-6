/**
 * Task Health Score - A comprehensive metric combining priority, deadline, effort, and importance
 */
// @ts-nocheck


export type HealthStatus = "healthy" | "attention" | "critical" | "overdue";

export interface HealthScoreBreakdown {
  priorityScore: number;
  deadlineScore: number;
  effortScore: number;
  importanceScore: number;
  totalScore: number;
  status: HealthStatus;
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    reason?: string;
  }>;
}

/**
 * Calculate task health score based on multiple factors
 *
 * Score is 0-100, where:
 * - 80-100: Healthy (on track)
 * - 50-79: Attention needed
 * - 25-49: Critical (urgent action required)
 * - 0-24: Overdue
 */
export function calculateTaskHealth(task: {
  priority: string;
  deadline: string | null;
  estimate: string | null;
  date: string | null;
  completed: boolean;
  description: string | null;
  name: string;
  blocked_by?: Array<{ id: number }>;
}): HealthScoreBreakdown {
  const now = new Date();
  const factors: Array<{ name: string; score: number; weight: number; reason?: string }> = [];

  // Priority score (0-40 points)
  const priorityWeights = { critical: 40, high: 30, medium: 20, low: 10, none: 0 };
  const priorityScore = priorityWeights[task.priority as keyof typeof priorityWeights] ?? 0;
  if (task.priority === "critical") {
    factors.push({ name: "Priority", score: priorityScore, weight: 0.25, reason: "Critical priority task" });
  }

  // Deadline score (0-30 points) - based on time remaining
  let deadlineScore = 0;
  if (task.deadline) {
    const deadline = new Date(task.deadline);
    const timeDiff = deadline.getTime() - now.getTime();
    const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      deadlineScore = 5; // Overdue gets minimal score
      factors.push({ name: "Deadline", score: deadlineScore, weight: 0.3, reason: `${Math.abs(daysRemaining)} days overdue` });
    } else if (daysRemaining === 0) {
      deadlineScore = 30; // Due today
      factors.push({ name: "Deadline", score: deadlineScore, weight: 0.3, reason: "Due today" });
    } else if (daysRemaining <= 2) {
      deadlineScore = 25; // Due in 1-2 days
      factors.push({ name: "Deadline", score: deadlineScore, weight: 0.3, reason: `Due in ${daysRemaining} days` });
    } else if (daysRemaining <= 7) {
      deadlineScore = 20; // Due this week
      factors.push({ name: "Deadline", score: deadlineScore, weight: 0.3, reason: `Due in ${daysRemaining} days` });
    } else {
      deadlineScore = 10; // Due later
      factors.push({ name: "Deadline", score: deadlineScore, weight: 0.3, reason: `Due in ${daysRemaining} days` });
    }
  } else {
    deadlineScore = 15; // No deadline but neutral
    factors.push({ name: "Deadline", score: deadlineScore, weight: 0.3, reason: "No deadline set" });
  }

  // Effort score (0-20 points) - based on estimated time
  let effortScore = 0;
  if (task.estimate) {
    const hours = parseFloat(task.estimate.replace(":", ".")) || 0;
    if (hours > 8) {
      effortScore = 5; // Very large tasks are risky
      factors.push({ name: "Effort", score: effortScore, weight: 0.2, reason: "Large task (>8h) may need decomposition" });
    } else if (hours > 4) {
      effortScore = 10;
      factors.push({ name: "Effort", score: effortScore, weight: 0.2, reason: "Moderate effort task (4-8h)" });
    } else if (hours > 0) {
      effortScore = 15;
      factors.push({ name: "Effort", score: effortScore, weight: 0.2, reason: "Reasonable effort task (<4h)" });
    } else {
      effortScore = 20;
      factors.push({ name: "Effort", score: effortScore, weight: 0.2, reason: "Effort estimated well" });
    }
  } else {
    effortScore = 10; // No estimate
    factors.push({ name: "Effort", score: effortScore, weight: 0.2, reason: "No effort estimate" });
  }

  // Importance score (0-10 points) - based on description richness and context
  let importanceScore = 10;
  if (task.description) {
    const descLength = task.description.length;
    if (descLength > 100) {
      importanceScore = 10;
      factors.push({ name: "Importance", score: importanceScore, weight: 0.15, reason: "Well described task" });
    } else if (descLength > 0) {
      importanceScore = 7;
      factors.push({ name: "Importance", score: importanceScore, weight: 0.15, reason: "Task has description" });
    }
  } else {
    importanceScore = 4;
    factors.push({ name: "Importance", score: importanceScore, weight: 0.15, reason: "No description provided" });
  }

  // Blockers penalty (reduces score)
  if (task.blocked_by && task.blocked_by.length > 0) {
    importanceScore -= 3;
    if (!factors.find(f => f.name === "Importance")) {
      factors.push({ name: "Importance", score: Math.max(0, importanceScore), weight: 0.15, reason: "Blocked by other tasks" });
    } else {
      factors[factors.findIndex(f => f.name === "Importance")].reason = "Blocked by other tasks";
    }
  }

  // Calculate total score (sum of all scores, max 100)
  const totalScore = Math.min(100, priorityScore + deadlineScore + effortScore + importanceScore);

  // Determine status
  let status: HealthStatus;
  if (task.completed) {
    status = "healthy";
  } else {
    const deadline = task.deadline ? new Date(task.deadline) : null;
    if (deadline && deadline < now && !task.completed) {
      status = "overdue";
    } else if (totalScore >= 70) {
      status = "healthy";
    } else if (totalScore >= 40) {
      status = "attention";
    } else {
      status = "critical";
    }
  }

  return {
    priorityScore,
    deadlineScore,
    effortScore,
    importanceScore,
    totalScore: Math.max(0, Math.min(100, totalScore)),
    status,
    factors,
  };
}

/**
 * Get health status color
 */
export function getHealthStatusColor(status: HealthStatus): string {
  switch (status) {
    case "healthy": return "text-green-500 bg-green-100 dark:bg-green-900/20";
    case "attention": return "text-amber-500 bg-amber-100 dark:bg-amber-900/20";
    case "critical": return "text-red-500 bg-red-100 dark:bg-red-900/20";
    case "overdue": return "text-red-600 bg-red-200 dark:bg-red-900/30";
  }
}

/**
 * Get health status indicator emoji
 */
export function getHealthStatusEmoji(status: HealthStatus): string {
  switch (status) {
    case "healthy": return "✅";
    case "attention": return "⚠️";
    case "critical": return "🔴";
    case "overdue": return "⏰";
  }
}
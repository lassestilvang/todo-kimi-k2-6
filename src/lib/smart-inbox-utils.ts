/**
 * Utility functions for Smart Inbox
 * These are pure helper functions, not server actions
 */

export type InboxSourceType = "calendar" | "email" | "slack" | "github" | "manual" | "integration";

/**
 * Calculate priority score based on various factors
 */
export function calculatePriorityScore(
  priority: string,
  dueDate?: string,
  confidence = 50
): number {
  let score = confidence;

  // Boost for higher priority
  const priorityMultipliers: Record<string, number> = {
    critical: 2.0,
    high: 1.5,
    medium: 1.0,
    low: 0.7,
    none: 0.5,
  };
  score *= priorityMultipliers[priority] || 1.0;

  // Boost for due dates
  if (dueDate) {
    const daysUntil = calculateDaysUntil(dueDate);
    if (daysUntil <= 0) score += 50; // Overdue
    else if (daysUntil <= 3) score += 30; // Due soon
    else if (daysUntil <= 7) score += 15; // Due this week
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}

/**
 * Calculate days until a date
 */
export function calculateDaysUntil(dateString: string): number {
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Get display name for source type
 */
export function getSourceName(type: InboxSourceType): string {
  const names: Record<InboxSourceType, string> = {
    calendar: "Calendar",
    email: "Email",
    slack: "Slack",
    github: "GitHub",
    manual: "Manual",
    integration: "Integration",
  };
  return names[type] || "Unknown";
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-200",
    high: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-200",
    medium: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200",
    low: "bg-green-500/10 text-green-700 dark:text-green-300 border-green-200",
    none: "bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-200",
  };
  return colors[priority] || colors.none;
}
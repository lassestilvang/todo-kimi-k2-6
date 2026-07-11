import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with Tailwind CSS support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a date string for display
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a date and time for display
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";
  return new Date(date).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get relative time string (e.g., "2 hours ago", "tomorrow")
 */
export function getRelativeTime(date: string | Date | null | undefined): string {
  if (!date) return "Never";

  const now = new Date();
  const target = new Date(date);
  const diffMs = target.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;

  return formatDate(target);
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

/**
 * Parse ISO date string to Date object
 */
export function parseISODate(dateString: string): Date {
  return new Date(dateString);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
  return emailRegex.test(email);
}

/**
 * Truncate text to specified length
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

/**
 * Get priority color for styling
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-500 text-white";
    case "high":
      return "bg-orange-500 text-white";
    case "medium":
      return "bg-yellow-500 text-black";
    case "low":
      return "bg-green-500 text-white";
    default:
      return "bg-gray-500 text-white";
  }
}

/**
 * Get priority icon name
 */
export function getPriorityIcon(priority: string): string {
  switch (priority) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
    default:
      return "⚪";
  }
}

/**
 * Sort an array of tasks by a specific field
 */
export function sortTasks<T extends Record<string, unknown>>(
  tasks: T[],
  field: string,
  direction: "asc" | "desc" = "asc"
): T[] {
  return [...tasks].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (aVal == null) return 1;
    if (bVal == null) return -1;

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

/**
 * Filter tasks based on criteria
 */
export function filterTasks(
  tasks: Array<{ id: number; name: string; list_id: number | null; priority: string; completed: boolean | number; description: string | null }>,
  filters: {
    listId?: number;
    priority?: string;
    completed?: boolean;
    search?: string;
  }
) {
  return tasks.filter((task) => {
    if (filters.listId !== undefined && task.list_id !== filters.listId) return false;
    if (filters.priority && task.priority !== filters.priority) return false;
    if (filters.completed !== undefined && task.completed !== filters.completed) return false;
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!task.name.toLowerCase().includes(searchLower) &&
          !(task.description && task.description.toLowerCase().includes(searchLower))) {
        return false;
      }
    }
    return true;
  });
}

// ============================================
// SQL Safety Utilities (for SQL injection prevention)
// ============================================

/**
 * Valid sort fields for tasks table
 */
export const VALID_TASK_SORT_FIELDS = ["sort_order", "date", "deadline", "priority", "created_at", "updated_at", "name"] as const;

/**
 * Valid sort directions
 */
export const VALID_SORT_DIRECTIONS = ["asc", "desc"] as const;

/**
 * Validates and returns a safe sort field, or throws if invalid
 */
export function validateSortField(field: string): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!VALID_TASK_SORT_FIELDS.includes(field as any)) {
    throw new Error(`Invalid sort field: ${field}. Must be one of: ${VALID_TASK_SORT_FIELDS.join(", ")}`);
  }
  return field;
}

/**
 * Validates and returns a safe sort direction, or throws if invalid
 */
export function validateSortDirection(direction: string): "asc" | "desc" {
  if (!VALID_SORT_DIRECTIONS.includes(direction as "asc" | "desc")) {
    throw new Error(`Invalid sort direction: ${direction}. Must be "asc" or "desc"`);
  }
  return direction as "asc" | "desc";
}

/**
 * Builds a safe ORDER BY clause with validated components
 */
export function buildSafeOrderBy(
  field = "sort_order",
  direction: "asc" | "desc" = "asc"
): string {
  const safeField = validateSortField(field);
  const safeDirection = validateSortDirection(direction);
  return `${safeField} ${safeDirection}`;
}

/**
 * Builds IN clause placeholders safely
 */
export function buildInClausePlaceholders(count: number): string {
  if (count <= 0) throw new Error("Count must be positive");
  return Array(count).fill("?").join(",");
}

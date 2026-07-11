import { z } from "zod";

/**
 * Maximum request body size (1MB) to prevent DoS attacks
 */
export const MAX_REQUEST_SIZE = 1024 * 1024;

/**
 * Maximum number of items to return in a single API response
 */
export const MAX_LIMIT = 100;

/**
 * Default pagination limit
 */
export const DEFAULT_LIMIT = 20;

// Check if DOMPurify is available (browser environment)
let dompurify: { sanitize: (input: string) => string } | null = null;
if (typeof window !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    dompurify = require("dompurify");
  } catch {
    // DOMPurify not available, use regex fallback
  }
}

/**
 * Sanitize user input to prevent XSS attacks.
 * Uses DOMPurify in browser, regex fallback for server-side.
 */
export function sanitizeString(input: string | null | undefined): string | null {
  if (!input) return null;

  // Browser: use DOMPurify for robust sanitization
  if (dompurify && typeof window !== "undefined") {
    return dompurify.sanitize(input).trim();
  }

  // Server-side or fallback: strip all HTML tags and dangerous attributes
  return input
    .replace(/<[^>]+>/g, "") // Strip all HTML tags
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "") // Remove event handlers
    .replace(/on\w+=/gi, "") // Remove unquoted event handlers
    .replace(/javascript:/gi, "") // Remove javascript: URLs
    .replace(/vbscript:/gi, "") // Remove vbscript: URLs
    .replace(/data:text\/html/gi, "") // Remove data:text/html URLs
    .trim();
}

/**
 * Sanitizes HTML content while preserving safe formatting tags.
 * Allows basic formatting: b, i, u, strong, em, p, br, ul, ol, li, h1-3, code, pre
 */
export function sanitizeHtml(input: string | null | undefined): string | null {
  if (!input) return null;

  // Browser: use DOMPurify for robust sanitization
  if (dompurify && typeof window !== "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (dompurify.sanitize as any)(input).trim();
  }

  // Fallback: basic sanitization
  let clean = input
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<script/gi, "")
    .replace(/<\/script>/gi, "");

  // Remove dangerous attributes
  clean = clean
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/on\w+=/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/data:text\/html/gi, "");

  // Strip dangerous tags completely (keeping their content)
  clean = clean.replace(/<\/?(iframe|object|embed|form|input|button|select|textarea)[^>]*>/gi, "");

  // Clean up extra whitespace
  clean = clean.replace(/\s+/g, " ").trim();

  return clean;
}

export function isValidSortField(field: string): boolean {
  return ["name", "date", "deadline", "priority", "created_at", "updated_at"].includes(field);
}

export function isValidSortDirection(direction: string): boolean {
  return ["asc", "desc"].includes(direction);
}

/**
 * Validates and parses pagination parameters
 */
export function parsePaginationParams(limit?: string | null, offset?: string | null): { limit: number; offset: number } {
  const parsedLimit = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  return {
    limit: Math.min(Math.max(1, isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit), MAX_LIMIT),
    offset: Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset),
  };
}

export const taskSchema = z.object({
  name: z.string().min(1, "Task name is required").max(500, "Task name must be 500 characters or less"),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  list_id: z.number().optional(),
  date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimate: z.string().optional().nullable(),
  actual_time: z.string().optional().nullable(),
  priority: z.enum(["critical", "high", "medium", "low", "none"]).default("none"),
  recurring: z.enum(["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"]).default("none"),
  recurring_config: z.string().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional(),
  reminders: z.array(z.string()).optional(),
  blocker_ids: z.array(z.number()).optional(),
});

export const listSchema = z.object({
  name: z.string().min(1, "List name is required").max(100, "List name must be 100 characters or less"),
  emoji: z.string().max(2, "Emoji must be 2 characters or less").optional().default("📋"),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format").optional().default("#6366f1"),
});

export const labelSchema = z.object({
  name: z.string().min(1, "Label name is required").max(50, "Label name must be 50 characters or less"),
  icon: z.string().max(2, "Icon must be 2 characters or less").optional().default("🏷️"),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid color format").optional().default("#8b5cf6"),
});

export type TaskFormData = z.infer<typeof taskSchema>;
export type ListFormData = z.infer<typeof listSchema>;
export type LabelFormData = z.infer<typeof labelSchema>;

// Additional validation schemas
export const updateTaskSchema = taskSchema.partial().extend({
  completed: z.boolean().optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().optional().nullable(),
  list_id: z.number().optional(),
  priority: z.enum(["critical", "high", "medium", "low", "none"]).default("none"),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional(),
});

export const customViewSchema = z.object({
  name: z.string().min(1, "View name is required"),
  filter_preset: z.enum(["needs_attention", "this_week", "with_labels", "with_subtasks", "completed"]).optional().nullable(),
  list_id: z.number().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  priority: z.enum(["critical", "high", "medium", "low", "none"]).optional().nullable(),
  sort_field: z.enum(["name", "date", "deadline", "priority", "created_at", "updated_at"]).default("date"),
  sort_direction: z.enum(["asc", "desc"]).default("asc"),
  view_type: z.enum(["today", "next7", "upcoming", "all", "list", "blocked"]).default("today"),
});

export const timeEntrySchema = z.object({
  task_id: z.number().min(1, "Task ID is required"),
  start_time: z.string().min(1, "Start time is required"),
  end_time: z.string().optional().nullable(),
  duration_seconds: z.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

// New validation schemas
export const goalSchema = z.object({
  name: z.string().min(1, "Goal name is required").max(200, "Goal name must be 200 characters or less"),
  description: z.string().optional().nullable(),
  target_count: z.number().min(1, "Target count must be at least 1"),
  target_unit: z.string().min(1, "Target unit is required"),
  period: z.enum(["daily", "weekly", "monthly", "yearly"]),
});

export const workspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required").max(100, "Workspace name must be 100 characters or less"),
  description: z.string().optional().nullable(),
});

export const reminderSchema = z.object({
  task_id: z.number().min(1, "Task ID is required"),
  remind_at: z.string().min(1, "Reminder time is required"),
});

export const subtaskSchema = z.object({
  name: z.string().min(1, "Subtask name is required"),
});

export const searchParamsSchema = z.object({
  query: z.string().optional(),
  view: z.enum(["today", "next7", "upcoming", "all", "blocked"]).optional(),
  listId: z.string().optional(),
  includeCompleted: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priority: z.enum(["critical", "high", "medium", "low", "none"]).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  q: z.string().optional(),
});
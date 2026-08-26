import { z } from 'zod';

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

/**
 * Sanitize user input to prevent XSS attacks.
 * Uses regex-based sanitization for consistent behavior across server and client environments.
 */
export function sanitizeString(
  input: string | null | undefined
): string | null {
  if (!input) return null;

  let clean = input;

  // Remove script tags with their content first (most dangerous)
  clean = clean
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Script with content
    .replace(/<script[^>]*>/gi, '') // Opening script tag
    .replace(/<\/script>/gi, ''); // Closing script tag

  // Strip all remaining HTML tags
  clean = clean.replace(/<[^>]+>/g, '');

  // Remove dangerous attributes and protocols
  clean = clean
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers
    .replace(/on\w+=/gi, '') // Remove unquoted event handlers
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/vbscript:/gi, '') // Remove vbscript: URLs
    .replace(/data:text\/html/gi, '') // Remove data:text/html URLs
    .trim();

  return clean;
}

/**
 * Sanitizes HTML content while preserving safe formatting tags.
 * Uses regex-based sanitization for consistent behavior across environments.
 * Allows basic formatting: b, i, u, strong, em, p, br, ul, ol, li, h1-3, code, pre
 */
export function sanitizeHtml(input: string | null | undefined): string | null {
  if (!input) return null;

  let clean = input;

  // Remove script tags with their content first (most dangerous)
  clean = clean
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<script[^>]*>/gi, '')
    .replace(/<\/script>/gi, '');

  // Strip dangerous tags completely (keeping their content)
  clean = clean.replace(
    /<\/?(iframe|object|embed|form|input|button|select|textarea)[^>]*>/gi,
    ''
  );

  // Remove dangerous attributes and protocols
  clean = clean
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/data:text\/html/gi, '');

  // Clean up extra whitespace
  clean = clean.replace(/\s+/g, ' ').trim();

  return clean;
}

export function isValidSortField(field: string): boolean {
  return [
    'name',
    'date',
    'deadline',
    'priority',
    'created_at',
    'updated_at',
  ].includes(field);
}

export function isValidSortDirection(direction: string): boolean {
  return ['asc', 'desc'].includes(direction);
}

/**
 * Validates and parses pagination parameters
 */
export function parsePaginationParams(
  limit?: string | null,
  offset?: string | null
): { limit: number; offset: number } {
  const parsedLimit = limit ? parseInt(limit, 10) : DEFAULT_LIMIT;
  const parsedOffset = offset ? parseInt(offset, 10) : 0;

  return {
    limit: Math.min(
      Math.max(1, isNaN(parsedLimit) ? DEFAULT_LIMIT : parsedLimit),
      MAX_LIMIT
    ),
    offset: Math.max(0, isNaN(parsedOffset) ? 0 : parsedOffset),
  };
}

export const taskSchema = z.object({
  name: z
    .string()
    .min(1, 'Task name is required')
    .max(500, 'Task name must be 500 characters or less'),
  description: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  list_id: z.number().optional(),
  date: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  estimate: z.string().optional().nullable(),
  actual_time: z.string().optional().nullable(),
  priority: z
    .enum(['critical', 'high', 'medium', 'low', 'none'])
    .default('none'),
  recurring: z
    .enum([
      'none',
      'daily',
      'weekly',
      'weekdays',
      'monthly',
      'yearly',
      'custom',
    ])
    .default('none'),
  recurring_config: z.string().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional(),
  reminders: z.array(z.string()).optional(),
  blocker_ids: z.array(z.number()).optional(),
});

export const listSchema = z.object({
  name: z
    .string()
    .min(1, 'List name is required')
    .max(100, 'List name must be 100 characters or less'),
  emoji: z
    .string()
    .max(2, 'Emoji must be 2 characters or less')
    .optional()
    .default('📋'),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
    .optional()
    .default('#6366f1'),
});

export const labelSchema = z.object({
  name: z
    .string()
    .min(1, 'Label name is required')
    .max(50, 'Label name must be 50 characters or less'),
  icon: z
    .string()
    .max(2, 'Icon must be 2 characters or less')
    .optional()
    .default('🏷️'),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Invalid color format')
    .optional()
    .default('#8b5cf6'),
});

export type TaskFormData = z.infer<typeof taskSchema>;
export type ListFormData = z.infer<typeof listSchema>;
export type LabelFormData = z.infer<typeof labelSchema>;

// Additional validation schemas
export const updateTaskSchema = taskSchema.partial().extend({
  completed: z.boolean().optional(),
});

export const templateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  description: z.string().optional().nullable(),
  list_id: z.number().optional(),
  priority: z
    .enum(['critical', 'high', 'medium', 'low', 'none'])
    .default('none'),
  label_ids: z.array(z.number()).optional(),
  subtasks: z.array(z.string()).optional(),
});

export const customViewSchema = z.object({
  name: z.string().min(1, 'View name is required'),
  filter_preset: z
    .enum([
      'needs_attention',
      'this_week',
      'with_labels',
      'with_subtasks',
      'completed',
    ])
    .optional()
    .nullable(),
  list_id: z.number().optional().nullable(),
  label_ids: z.array(z.number()).optional(),
  priority: z
    .enum(['critical', 'high', 'medium', 'low', 'none'])
    .optional()
    .nullable(),
  sort_field: z
    .enum(['name', 'date', 'deadline', 'priority', 'created_at', 'updated_at'])
    .default('date'),
  sort_direction: z.enum(['asc', 'desc']).default('asc'),
  view_type: z
    .enum(['today', 'next7', 'upcoming', 'all', 'list', 'blocked'])
    .default('today'),
});

export const timeEntrySchema = z.object({
  task_id: z.number().min(1, 'Task ID is required'),
  start_time: z.string().min(1, 'Start time is required'),
  end_time: z.string().optional().nullable(),
  duration_seconds: z.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
});

// New validation schemas
export const goalSchema = z.object({
  name: z
    .string()
    .min(1, 'Goal name is required')
    .max(200, 'Goal name must be 200 characters or less'),
  description: z.string().optional().nullable(),
  target_count: z.number().min(1, 'Target count must be at least 1'),
  target_unit: z.string().min(1, 'Target unit is required'),
  period: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
});

export const workspaceSchema = z.object({
  name: z
    .string()
    .min(1, 'Workspace name is required')
    .max(100, 'Workspace name must be 100 characters or less'),
  description: z.string().optional().nullable(),
});

export const reminderSchema = z.object({
  task_id: z.number().min(1, 'Task ID is required'),
  remind_at: z.string().min(1, 'Reminder time is required'),
});

export const subtaskSchema = z.object({
  name: z.string().min(1, 'Subtask name is required'),
});

export const searchParamsSchema = z.object({
  query: z.string().optional(),
  view: z.enum(['today', 'next7', 'upcoming', 'all', 'blocked']).optional(),
  listId: z.string().optional(),
  includeCompleted: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  priority: z.enum(['critical', 'high', 'medium', 'low', 'none']).optional(),
  limit: z.string().optional(),
  offset: z.string().optional(),
  q: z.string().optional(),
});

// ----- New feature schemas (2026-09-15 expansion) -----

export const cognitiveLoadSchema = z.object({
  cognitive_load: z
    .enum(['deep', 'creative', 'routine', 'social', 'emotional'])
    .optional(),
});

export const operatingPrincipleSchema = z.object({
  rule: z
    .string()
    .min(3, 'Rule must be at least 3 characters')
    .max(500, 'Rule must be 500 characters or less'),
  category: z.enum([
    'scheduling',
    'priority',
    'focus',
    'energy',
    'communication',
    'other',
  ]),
  confidence: z.number().min(0).max(1).optional(),
  active: z.boolean().optional(),
  source: z
    .enum(['inferred', 'user', 'reflection'])
    .optional(),
});

export const asyncWaitSchema = z.object({
  task_id: z.number().min(1),
  waiting_on: z.string().min(1).max(200),
  waiting_on_type: z
    .enum(['person', 'system', 'event', 'payment', 'response'])
    .default('person'),
  expected_response_days: z.number().min(1).max(90).default(3),
  nudge_threshold_days: z.number().min(1).max(90).default(7),
  notes: z.string().max(2000).optional().nullable(),
});

export const reflectionSchema = z.object({
  surprised: z.string().max(2000).optional().nullable(),
  worked: z.string().max(2000).optional().nullable(),
  did_not_work: z.string().max(2000).optional().nullable(),
  should_change: z.string().max(2000).optional().nullable(),
  gratitude: z.string().max(2000).optional().nullable(),
  mood_score: z.number().min(1).max(10).optional().nullable(),
});

export const autopilotDecisionSchema = z.object({
  decision_type: z.string().min(1).max(80),
  question: z.string().min(1).max(500),
  chosen_option: z.string().min(1).max(500),
  rejected_options: z.array(z.string()).optional(),
  rationale: z.string().max(1000).optional().nullable(),
});

export const autopilotGuardrailSchema = z.object({
  scope: z.string().min(1).max(80),
  allowed_values: z.array(z.string()).optional(),
  denied_values: z.array(z.string()).optional(),
});

export const antiGoalSchema = z.object({
  title: z.string().min(1).max(200),
  reason: z.string().max(1000).optional().nullable(),
  valid_until: z.string().optional().nullable(),
});

export const readingQueueSchema = z.object({
  url: z.string().url().optional().nullable(),
  title: z.string().min(1).max(500),
  source: z.string().max(200).optional().nullable(),
  item_type: z
    .enum(['article', 'video', 'podcast', 'paper', 'book', 'thread'])
    .default('article'),
});

export const webhookSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z
    .string()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with dashes'),
  workflow_id: z.number().optional().nullable(),
  secret: z.string().optional().nullable(),
  active: z.boolean().optional(),
});

export const habitTaskBridgeSchema = z.object({
  habit_id: z.number().min(1),
  task_id: z.number().min(1),
  counts_for_both: z.boolean().optional(),
});

export const briefingPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  delivery_hour: z.number().min(0).max(23).optional(),
  include_voice: z.boolean().optional(),
  include_predictions: z.boolean().optional(),
  include_principles: z.boolean().optional(),
  include_overdue: z.boolean().optional(),
  include_recommendations: z.boolean().optional(),
});

export const parkTaskSchema = z.object({
  task_id: z.number().min(1),
  parked_until: z.string().optional().nullable(),
  reason: z.string().max(500).optional().nullable(),
});


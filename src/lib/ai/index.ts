// AI Assistant for task management
// Supports natural language task creation and suggestions

import { z } from "zod";
import { getAIManager } from "./providers";

// Zod schema for validating AI task suggestions
export const taskSuggestionSchema = z.object({
  name: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  priority: z.enum(["critical", "high", "medium", "low", "none"]).nullable().optional(),
  estimated_duration: z.number().int().min(0).nullable().optional(),
  suggested_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  recurring: z.enum(["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"]).nullable().optional(),
  list_name: z.string().nullable().optional(),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  list_id: z.number().int().min(1).nullable().optional(),
  start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  location: z.string().nullable().optional(),
});

export type TaskSuggestion = z.infer<typeof taskSuggestionSchema>;

// Schema for AI insights output
export const aiInsightsSchema = z.object({
  tips: z.array(z.string()),
  suggestions: z.array(z.string()),
  trends: z.array(z.string()),
});

export type AIInsights = z.infer<typeof aiInsightsSchema>;

// Schema for AI task editing commands
export const aiEditCommandSchema = z.object({
  action: z.enum(["edit", "delete", "complete", "prioritize", "schedule", "add_label", "remove_label"]),
  taskId: z.number().optional(),
  taskName: z.string().optional(),
  updates: z.record(z.unknown()).optional(),
  searchQuery: z.string().optional(),
});

export type AIEditCommand = z.infer<typeof aiEditCommandSchema>;

export interface AITaskInput {
  text: string;
  context?: {
    existingTasks?: Array<{ name: string; date?: string | null; deadline?: string | null; priority?: string }>;
    preferences?: {
      workHours?: { start: number; end: number };
      preferredTimes?: string[];
      locations?: Array<{ name: string; keywords: string[] }>;
    };
    lists?: Array<{ id: number; name: string; emoji: string }>;
  };
}

/**
 * Enhanced task suggestion with time range and location support
 */
export interface EnhancedTaskSuggestion extends TaskSuggestion {
  start_time?: string;
  end_time?: string;
  location?: string;
  location_keywords?: string[];
}

// Parse natural language input into task structure
export async function parseTaskInput(input: AITaskInput): Promise<TaskSuggestion & { provider: string }> {
  const ai = getAIManager();
  return ai.parseTask(input);
}

// Smart scheduling - suggest optimal times for tasks
export async function suggestTaskSchedule(
  tasks: Array<{
    name: string;
    priority: string;
    estimated_duration?: number | null;
    date?: string | null;
    deadline?: string | null;
  }>,
  context?: {
    workHours?: { start: number; end: number };
    existingSchedule?: Array<{ name: string; date: string; startTime: string }>;
  }
): Promise<Array<{ name: string; suggested_date: string; suggested_time: string; confidence: number }>> {
  const workHours = context?.workHours || { start: 9, end: 17 };

  return tasks.map((task) => {
    // Calculate suggested time based on priority and workload
    const priorityScore = getPriorityScore(task.priority);
    const duration = task.estimated_duration || 30;

    // Default to working hours
    const hour = Math.floor(workHours.start + (priorityScore * (workHours.end - workHours.start)));
    const minute = Math.floor(Math.random() * 4) * 15; // 0, 15, 30, or 45

    // Determine date based on deadline or availability
    let suggestedDate = new Date().toISOString().split("T")[0];
    if (task.deadline) {
      suggestedDate = task.deadline;
    } else if (task.date) {
      suggestedDate = task.date;
    }

    // Calculate confidence based on task characteristics
    const confidence = calculateScheduleConfidence(task, priorityScore, duration);

    return {
      name: task.name,
      suggested_date: suggestedDate,
      suggested_time: `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      confidence,
    };
  });
}

// Helper function to convert priority to score (0-1)
function getPriorityScore(priority: string): number {
  switch (priority) {
    case "critical": return 0.2;
    case "high": return 0.4;
    case "medium": return 0.6;
    case "low": return 0.8;
    default: return 0.5;
  }
}

// Helper function to calculate confidence score
function calculateScheduleConfidence(task: { estimated_duration?: number | null; deadline?: string | null; priority?: string }, priorityScore: number, duration: number): number {
  let confidence = 0.7; // Base confidence

  // Higher confidence for tasks with more info
  if (task.estimated_duration) confidence += 0.1;
  if (task.deadline) confidence += 0.1;
  if (task.priority) confidence += 0.05;

  // Lower confidence for very long tasks
  if (duration > 120) confidence -= 0.1;

  return Math.max(0.1, Math.min(0.95, confidence));
}

/**
 * Parse time range from text (e.g., "from 2pm to 4pm", "9am-11am")
 */
export function parseTimeRange(text: string): { start_time?: string; end_time?: string } | null {
  // Match "from X to Y" pattern
  const fromToMatch = text.match(/from\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
  if (fromToMatch) {
    const startHour = parseTimeToMinutes(fromToMatch[1]);
    const endHour = parseTimeToMinutes(fromToMatch[2]);
    if (startHour !== null && endHour !== null) {
      return {
        start_time: formatMinutesToTime(startHour),
        end_time: formatMinutesToTime(endHour),
      };
    }
  }

  // Match "X-Y" time range pattern
  const rangeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (rangeMatch) {
    const startHour = parseInt(rangeMatch[1]);
    const startMin = parseInt(rangeMatch[2] || "0");
    const endHour = parseInt(rangeMatch[3]);
    const endMin = parseInt(rangeMatch[4] || "0");
    const period = rangeMatch[5]?.toLowerCase();

    let startTotal = startHour * 60 + startMin;
    let endTotal = endHour * 60 + endMin;

    // Handle AM/PM
    if (period === "pm" && startHour !== 12) startTotal += 12 * 60;
    if (period === "pm" && endHour !== 12) endTotal += 12 * 60;
    if (period === "am" && startHour === 12) startTotal = 0;
    if (period === "am" && endHour === 12) endTotal = 0;

    return {
      start_time: formatMinutesToTime(startTotal),
      end_time: formatMinutesToTime(endTotal),
    };
  }

  return null;
}

/**
 * Parse location context from task text
 */
export function parseLocation(text: string, locations?: Array<{ name: string; keywords: string[] }>): string | null {
  if (!locations) return null;

  const normalizedText = text.toLowerCase();
  for (const location of locations) {
    if (location.keywords.some((k) => normalizedText.includes(k.toLowerCase()))) {
      return location.name;
    }
  }

  // Default location keywords
  const defaultLocations: Record<string, string> = {
    "home": "Home Office",
    "office": "Work Office",
    "gym": "Gym",
    "doctor": "Doctor's Office",
    "store": "Store",
    "restaurant": "Restaurant",
    "meeting": "Meeting Room",
  };

  for (const [keyword, name] of Object.entries(defaultLocations)) {
    if (normalizedText.includes(keyword)) {
      return name;
    }
  }

  return null;
}

/**
 * Convert time string to minutes from midnight
 */
function parseTimeToMinutes(timeStr: string): number | null {
  const match = timeStr.match(/(\d{1,2})(?:[:.]?(\d{2}))?\s*(am|pm)?/i);
  if (!match) return null;

  let hours = parseInt(match[1]);
  const minutes = parseInt(match[2] || "0");
  const period = match[3]?.toLowerCase();

  if (period === "pm" && hours !== 12) hours += 12;
  if (period === "am" && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Convert minutes from midnight to time string (HH:mm)
 */
function formatMinutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
}

// Generate task insights and recommendations
export async function generateTaskInsights(
  tasks: Array<{
    name: string;
    completed: boolean;
    priority: string;
    date?: string | null;
    deadline?: string | null;
  }>
): Promise<{
  productivity_tips: string[];
  suggestions: string[];
  trends: string[];
  provider: string;
}> {
  const ai = getAIManager();
  const result = await ai.generateInsights(tasks);
  return {
    productivity_tips: result.tips,
    suggestions: result.suggestions,
    trends: result.trends,
    provider: result.provider,
  };
}

// Generate tasks from bullet points or notes
export async function generateTasksFromNotes(
  notes: string,
  context?: {
    lists?: Array<{ id: number; name: string; emoji: string }>;
  }
): Promise<Array<TaskSuggestion & { provider: string }>> {
  const ai = getAIManager();

  // Use keyword parser by default since it has the generateTasksFromNotes method
  const result = await ai.generateTasksFromNotes(notes, context);

  return result.map(task => ({
    ...task,
    provider: "keyword-parser",
  }));
}

// Re-export types from providers
export { type AIProvider, getAIManager } from "./providers";

// Re-export workload balancing
export {
  generateWorkloadSuggestions,
  calculateWorkloads,
  getUserWorkloadSummary,
  type UserWorkload,
  type WorkloadSuggestion,
  detectScheduleConflicts,
  analyzeProductivityPatterns,
  suggestOptimalRescheduling,
  type ScheduleConflict,
  type ProductivityPattern,
  type ScheduleAnalysis,
} from "./workload";

// Cache management
export { aiCache } from "./providers";

// AI-powered task editing
export async function parseEditCommand(
  text: string,
  context: { tasks: Array<{ id: number; name: string; completed: boolean; priority: string }> }
): Promise<AIEditCommand & { provider: string }> {
  const ai = getAIManager();
  return ai.parseEditCommand(text, context);
}
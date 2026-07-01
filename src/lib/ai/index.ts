// AI Assistant for task management
// Supports natural language task creation and suggestions

import { getAIManager } from "./providers";

export interface TaskSuggestion {
  name: string;
  description?: string;
  priority?: "critical" | "high" | "medium" | "low" | "none";
  estimated_duration?: number; // in minutes
  suggested_date?: string;
  recurring?: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom";
  list_name?: string;
  deadline?: string;
  list_id?: number;
}

export interface AITaskInput {
  text: string;
  context?: {
    existingTasks?: Array<{ name: string; date?: string | null; deadline?: string | null; priority?: string }>;
    preferences?: {
      workHours?: { start: number; end: number };
      preferredTimes?: string[];
    };
    lists?: Array<{ id: number; name: string; emoji: string }>;
  };
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
function calculateScheduleConfidence(task: any, priorityScore: number, duration: number): number {
  let confidence = 0.7; // Base confidence

  // Higher confidence for tasks with more info
  if (task.estimated_duration) confidence += 0.1;
  if (task.deadline) confidence += 0.1;
  if (task.priority) confidence += 0.05;

  // Lower confidence for very long tasks
  if (duration > 120) confidence -= 0.1;

  return Math.max(0.1, Math.min(0.95, confidence));
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
} from "./workload";
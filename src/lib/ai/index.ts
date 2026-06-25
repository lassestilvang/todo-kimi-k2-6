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
}

export interface AITaskInput {
  text: string;
  context?: {
    existingTasks?: Array<{ name: string; date?: string | null; deadline?: string | null }>;
    preferences?: {
      workHours?: { start: number; end: number };
      preferredTimes?: string[];
    };
  };
}

// Parse natural language input into task structure
export async function parseTaskInput(input: AITaskInput): Promise<TaskSuggestion & { provider: string }> {
  const ai = getAIManager();
  return ai.parseTask(input);
}

// Smart scheduling - suggest optimal times for tasks
export async function suggestTaskSchedule(
  tasks: Array<{ name: string; priority: string; estimated_duration?: number | null }>
): Promise<Array<{ name: string; suggested_date: string; suggested_time: string }>> {
  // This would use AI to analyze workload and suggest optimal scheduling
  return tasks.map((task) => ({
    name: task.name,
    suggested_date: new Date().toISOString().split("T")[0],
    suggested_time: "09:00",
  }));
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

// Re-export types from providers
export { type AIProvider } from "./providers";
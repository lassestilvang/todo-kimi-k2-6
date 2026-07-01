/**
 * AI Provider abstraction for task parsing
 * Supports multiple AI providers with fallback
 */

import type { TaskSuggestion, AITaskInput } from "./index";

export interface AIProvider {
  name: string;
  parseTask(input: AITaskInput): Promise<TaskSuggestion>;
  parseTaskStream?(input: AITaskInput, onChunk: (chunk: string) => void): Promise<TaskSuggestion>;
  generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }>;
}

/**
 * Keyword-based fallback parser (no API required)
 * Works well for basic task parsing
 */
export class KeywordParser implements AIProvider {
  name = "keyword-parser";

  private readonly priorityKeywords = {
    critical: ["urgent", "asap", "critical", "high priority", "deadline"],
    high: ["important", "high priority", "soon", "today", "this week"],
    medium: ["medium priority", "normal", "standard"],
    low: ["low priority", "later", "someday", "optional", "backlog"],
  };

  private readonly durationKeywords: Record<string, number> = {
    meeting: 30,
    call: 30,
    review: 15,
    write: 120,
    report: 120,
    email: 15,
    research: 60,
    coding: 120,
    design: 90,
    planning: 60,
    reading: 30,
    brainstorm: 45,
    presentation: 60,
    interview: 60,
    debugging: 90,
    refactoring: 120,
  };

  private readonly recurringKeywords = {
    daily: ["daily", "every day", "each day"],
    weekly: ["weekly", "every week", "each week"],
    weekdays: ["weekdays", "mon-fri", "monday tuesday wednesday thursday friday"],
    monthly: ["monthly", "every month", "each month"],
    yearly: ["yearly", "every year", "each year"],
  };

  private readonly listKeywords: Record<string, string> = {
    "work": "Work",
    "personal": "Personal",
    "health": "Health",
    "finance": "Finance",
    "home": "Home",
    "family": "Family",
    "travel": "Travel",
    "errand": "Errands",
    "gym": "Health",
    "exercise": "Health",
    "meeting": "Work",
    "call": "Work",
    "email": "Work",
    "review": "Work",
    "project": "Work",
    "study": "Personal",
    "learning": "Personal",
    "grocery": "Shopping",
    "buy": "Shopping",
    "doctor": "Health",
    "appointment": "Health",
    "pay": "Finance",
    "bill": "Finance",
    "budget": "Finance",
    "clean": "Home",
    "chore": "Home",
    "trip": "Travel",
    "vacation": "Travel",
  };

  // Enhanced date/time patterns
  private readonly timePatterns: Array<{ pattern: RegExp; parse: (match: RegExpMatchArray) => { hours: number; minutes: number } }> = [
    {
      pattern: /(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i,
      parse: (match) => {
        let hours = parseInt(match[1]);
        const minutes = parseInt(match[2] || "0");
        if (match[3]?.toLowerCase() === "pm" && hours !== 12) hours += 12;
        if (match[3]?.toLowerCase() === "am" && hours === 12) hours = 0;
        return { hours, minutes };
      },
    },
    {
      pattern: /(\d{1,2})[:\s](\d{2})/,
      parse: (match) => ({ hours: parseInt(match[1]), minutes: parseInt(match[2]) }),
    },
  ];

  private readonly dayKeywords = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    const text = input.text.toLowerCase();

    // Extract priority
    let priority: "critical" | "high" | "medium" | "low" | "none" = "none";
    for (const [p, keywords] of Object.entries(this.priorityKeywords)) {
      if (keywords.some((k) => text.includes(k))) {
        priority = p as any;
        break;
      }
    }

    // Extract duration
    let estimated_duration: number | undefined;
    for (const [keyword, duration] of Object.entries(this.durationKeywords)) {
      if (text.includes(keyword)) {
        estimated_duration = duration;
        break;
      }
    }

    // Extract date patterns
    let suggested_date: string | undefined;
    let deadline: string | undefined;

    // Check for specific dates
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 1000);

    if (text.includes("tomorrow")) {
      suggested_date = tomorrow.toISOString().split("T")[0];
    } else if (text.includes("next week") || text.includes("weekend")) {
      suggested_date = nextWeek.toISOString().split("T")[0];
    } else if (text.includes("today")) {
      suggested_date = today.toISOString().split("T")[0];
    }

    // Check for specific weekdays
    for (const day of this.dayKeywords) {
      if (text.includes(day)) {
        const nextDay = this.getNextDay(day);
        if (!suggested_date) suggested_date = nextDay.toISOString().split("T")[0];
        break;
      }
    }

    // Enhanced date parsing: "in X days/weeks"
    const inMatch = text.match(/in\s+(\d+)\s+(day|week|month)s?/);
    if (inMatch && !suggested_date) {
      const num = parseInt(inMatch[1]);
      const unit = inMatch[2];
      const ms = num * (unit === "day" ? 24 : unit === "week" ? 24 * 7 : 30 * 24) * 60 * 60 * 1000;
      const futureDate = new Date(Date.now() + ms);
      suggested_date = futureDate.toISOString().split("T")[0];
    }

    // Enhanced deadline parsing
    const deadlinePatterns = [
      { pattern: /deadline[:\s]+(\d{4}-\d{2}-\d{2})/i, parse: (m: string[]) => m[1] },
      { pattern: /due[:\s]+(\d{4}-\d{2}-\d{2})/i, parse: (m: string[]) => m[1] },
      { pattern: /by[:\s]+(tomorrow)/i, parse: () => tomorrow.toISOString().split("T")[0] },
      { pattern: /by[:\s]+(next week)/i, parse: () => nextWeek.toISOString().split("T")[0] },
    ];

    for (const { pattern, parse } of deadlinePatterns) {
      const match = text.match(pattern);
      if (match) {
        deadline = parse(match);
        break;
      }
    }

    // Extract recurring pattern
    let recurring: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom" = "none";
    for (const [rec, keywords] of Object.entries(this.recurringKeywords)) {
      if (keywords.some((k) => text.includes(k))) {
        recurring = rec as any;
        break;
      }
    }

    // Extract list/project context - first check explicit list mention, then keywords
    let list_name: string | undefined;
    let list_id: number | undefined;

    // Check for explicit list mention
    const listMatch = text.match(/(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i);
    if (listMatch) {
      list_name = listMatch[1].trim();
    }

    // Check context lists if available
    if (input.context?.lists && !list_name) {
      for (const list of input.context.lists) {
        if (text.includes(list.name.toLowerCase()) || text.includes(list.emoji)) {
          list_name = list.name;
          list_id = list.id;
          break;
        }
      }
    }

    // Check list keywords
    if (!list_name) {
      for (const [keyword, name] of Object.entries(this.listKeywords)) {
        if (text.includes(keyword)) {
          list_name = name;
          break;
        }
      }
    }

    return {
      name: this.cleanTaskName(input.text),
      description: this.generateDescription(input.text, priority, estimated_duration),
      priority,
      estimated_duration,
      suggested_date,
      recurring,
      list_name,
      list_id,
      deadline,
    };
  }

  private cleanTaskName(text: string): string {
    // Remove common prefixes and keywords
    const prefixes = [
      "create a task for",
      "add",
      "schedule",
      "remind me to",
      "i need to",
      "please",
      "don't forget to",
      "remember to",
      "let's",
      "let us",
    ];

    let name = text;
    for (const prefix of prefixes) {
      name = name.replace(new RegExp(`^${prefix}\\s*`, "i"), "");
    }

    // Remove trailing context that's not part of the task name
    name = name.replace(/\s*\(due.*?\)$/i, "");
    name = name.replace(/\s*\binbox\b/i, "");

    return name.trim().charAt(0).toUpperCase() + name.slice(1);
  }

  /**
   * Parse time from text (e.g., "at 2pm", "2:30", "14:00")
   */
  private parseTimeFromText(text: string): { hours: number; minutes: number } | null {
    return this.parseTime(text);
  }

  private generateDescription(text: string, priority: string, duration?: number): string | undefined {
    const desc: string[] = [];

    if (priority === "critical" || text.includes("urgent")) {
      desc.push("High priority task - requires immediate attention");
    }

    if (duration) {
      desc.push(`Estimated time: ${duration} minutes`);
    }

    return desc.length > 0 ? desc.join(". ") : undefined;
  }

  /**
   * Parse time from text (e.g., "at 2pm", "2:30", "14:00")
   */
  private parseTime(text: string): { hours: number; minutes: number } | null {
    for (const { pattern, parse } of this.timePatterns) {
      const match = text.match(pattern);
      if (match) {
        return parse(match);
      }
    }
    return null;
  }

  /**
   * Find the next occurrence of a specific day
   */
  private getNextDay(dayName: string): Date {
    const dayMap: Record<string, number> = {
      "monday": 1, "tuesday": 2, "wednesday": 3, "thursday": 4,
      "friday": 5, "saturday": 6, "sunday": 0
    };
    const targetDay = dayMap[dayName.toLowerCase()] ?? 1;
    const today = new Date();
    const currentDay = today.getDay();
    const daysAhead = (targetDay - currentDay + 7) % 7 || 7;
    const nextDay = new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    return nextDay;
  }

  /**
   * Generate tasks from bullet points or notes
   */
  async generateTasksFromNotes(notes: string): Promise<Array<{
    name: string;
    description?: string;
    priority?: "critical" | "high" | "medium" | "low" | "none";
  }>> {
    const lines = notes.split("\n").filter(line => line.trim());
    const tasks: Array<{ name: string; description?: string; priority?: "critical" | "high" | "medium" | "low" | "none" }> = [];

    for (const line of lines) {
      // Remove markdown bullet characters
      const cleanLine = line.replace(/^[\s]*[-*>\d.\)\s]+/, "").trim();
      if (cleanLine && cleanLine.length > 3) {
        tasks.push({
          name: cleanLine,
          priority: "medium",
        });
      }
    }

    return tasks;
  }

  async generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    const completed = tasks.filter(t => t.completed).length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const now = new Date();

    const tips: string[] = [];
    const suggestions: string[] = [];
    const trends: string[] = [];

    // Productivity tips
    if (completionRate < 50) {
      tips.push("Focus on completing high-priority tasks first to improve your completion rate.");
    } else if (completionRate >= 80) {
      tips.push("Great job! Your completion rate is excellent. Consider taking on more challenging tasks.");
    }

    const criticalTasks = tasks.filter(t => t.priority === "critical" && !t.completed);
    if (criticalTasks.length > 3) {
      suggestions.push(`You have ${criticalTasks.length} critical tasks pending. Consider breaking them into smaller steps.`);
    }

    const overdueTasks = tasks.filter(t => t.deadline && new Date(t.deadline) < now && !t.completed);
    if (overdueTasks.length > 0) {
      suggestions.push(`${overdueTasks.length} task(s) are overdue. Review and update deadlines or prioritize completion.`);
    }

    // Trends analysis
    trends.push(`Current completion rate: ${completionRate}%`);
    trends.push(`${criticalTasks.length} high-priority tasks in progress`);

    const thisWeek = tasks.filter(t => t.date && t.date >= now.toISOString().split("T")[0]);
    trends.push(`${thisWeek.length} tasks scheduled for this week`);

    return { tips, suggestions, trends };
  }
}

/**
 * OpenAI GPT-4 integration for advanced task parsing
 * Requires OPENAI_API_KEY environment variable
 */
export class OpenAIProvider implements AIProvider {
  name = "openai-gpt4";
  private readonly model: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;

  constructor() {
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    this.baseURL = process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.maxRetries = 3;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    throw lastError;
  }

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const prompt = `
Parse the following natural language task input into a structured task object.
Return only valid JSON.

Input: "${input.text}"

Output format:
{
  "name": "Task name (clear and concise)",
  "description": "Brief description or null",
  "priority": "critical|high|medium|low|none",
  "estimated_duration": number in minutes or null,
  "suggested_date": "YYYY-MM-DD" or null,
  "recurring": "none|daily|weekly|weekdays|monthly|yearly|custom",
  "deadline": "YYYY-MM-DD" or null
}
`;

    try {
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.3,
            stream: false,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("OpenAI API error:", response.status, errorBody);
          throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content || "{}";
        return JSON.parse(content) as TaskSuggestion;
      });
    } catch (error) {
      console.error("OpenAI parsing failed:", error);
      throw error;
    }
  }

  async parseTaskStream(input: AITaskInput, onChunk: (chunk: string) => Promise<void> | void): Promise<TaskSuggestion> {
    if (!process.env.OPENAI_API_KEY) {
      return new KeywordParser().parseTask(input);
    }

    const prompt = `
Parse the following natural language task input into a structured task object.
Return only valid JSON.

Input: "${input.text}"

Output format:
{
  "name": "Task name (clear and concise)",
  "description": "Brief description or null",
  "priority": "critical|high|medium|low|none",
  "estimated_duration": number in minutes or null,
  "suggested_date": "YYYY-MM-DD" or null,
  "recurring": "none|daily|weekly|weekdays|monthly|yearly|custom",
  "deadline": "YYYY-MM-DD" or null
}
`;

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        stream: true,
      }),
    });

    if (!response.ok || !response.body) {
      return new KeywordParser().parseTask(input);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices[0]?.delta?.content || "";
              if (content) {
                await onChunk(content);
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Return parsed result from the accumulated content
    try {
      const lastLine = buffer.split("\n").pop();
      if (lastLine?.startsWith("data: ")) {
        const data = JSON.parse(lastLine.slice(6));
        const content = data.choices[0]?.delta?.content || "{}";
        return JSON.parse(content) as TaskSuggestion;
      }
    } catch {
      // Fall back to keyword parser
    }

    return new KeywordParser().parseTask(input);
  }

  async generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
      return { tips: [], suggestions: [], trends: [] };
    }

    const prompt = `
Analyze these tasks and provide productivity insights:

Tasks: ${JSON.stringify(tasks)}

Return JSON:
{
  "tips": ["tip1", "tip2"],
  "suggestions": ["suggestion1"],
  "trends": ["trend1"]
}
`;

    try {
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseURL}/chat/completions`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: this.model,
            messages: [{ role: "user", content: prompt }],
            temperature: 0.5,
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        return JSON.parse(data.choices[0]?.message?.content || '{"tips":[],"suggestions":[],"trends":[]}');
      });
    } catch (error) {
      console.error("OpenAI insights failed:", error);
      return { tips: [], suggestions: [], trends: [] };
    }
  }
}

/**
 * Claude integration via Anthropic API
 * Requires ANTHROPIC_API_KEY environment variable
 */
export class ClaudeProvider implements AIProvider {
  name = "claude-sonnet";
  private readonly model: string;
  private readonly baseURL: string;
  private readonly maxRetries: number;

  constructor() {
    this.model = process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022";
    this.baseURL = process.env.CLAUDE_BASE_URL || "https://api.anthropic.com";
    this.maxRetries = 3;
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < this.maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.maxRetries - 1) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
        }
      }
    }
    throw lastError;
  }

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const prompt = `
Parse this task request into structured JSON:

"${input.text}"

Return only JSON with these fields:
- name: string (clear, concise task name)
- description: string or null
- priority: "critical" | "high" | "medium" | "low" | "none"
- estimated_duration: number (minutes) or null
- suggested_date: "YYYY-MM-DD" or null
- recurring: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom"
- deadline: "YYYY-MM-DD" or null
`;

    try {
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseURL}/v1/messages`, {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.error("Claude API error:", response.status, errorBody);
          throw new Error(`Claude API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.content[0]?.text || "{}";
        return JSON.parse(content) as TaskSuggestion;
      });
    } catch (error) {
      console.error("Claude parsing failed:", error);
      throw error;
    }
  }

  async generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    if (!process.env.ANTHROPIC_API_KEY) {
      return { tips: [], suggestions: [], trends: [] };
    }

    const prompt = `
Analyze these tasks and provide productivity insights:

${JSON.stringify(tasks)}

Return JSON: {"tips":["..."],"suggestions":["..."],"trends":["..."]}
`;

    try {
      return await this.withRetry(async () => {
        const response = await fetch(`${this.baseURL}/v1/messages`, {
          method: "POST",
          headers: {
            "x-api-key": process.env.ANTHROPIC_API_KEY!,
            "Content-Type": "application/json",
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 500,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Claude API error: ${response.status}`);
        }

        const data = await response.json();
        return JSON.parse(data.content[0]?.text || '{"tips":[],"suggestions":[],"trends":[]}');
      });
    } catch (error) {
      console.error("Claude insights failed:", error);
      return { tips: [], suggestions: [], trends: [] };
    }
  }
}

/**
 * Provider manager - selects best available provider
 */
export class AIManager {
  private providers: AIProvider[];

  constructor() {
    this.providers = [];

    // Add keyword parser as fallback
    this.providers.push(new KeywordParser());

    // Add AI providers if configured
    if (process.env.OPENAI_API_KEY) {
      this.providers.push(new OpenAIProvider());
    }

    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.push(new ClaudeProvider());
    }
  }

  async parseTask(input: AITaskInput): Promise<TaskSuggestion & { provider: string }> {
    for (const provider of this.providers) {
      try {
        const result = await provider.parseTask(input);
        return { ...result, provider: provider.name };
      } catch (error) {
        console.warn(`${provider.name} failed, trying next provider`);
        continue;
      }
    }

    // Fallback to keyword parser (should never fail)
    const result = await new KeywordParser().parseTask(input);
    return { ...result, provider: "keyword-parser" };
  }

  async generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[]; provider: string }> {
    // Use the first AI provider, fallback to keyword parser
    for (const provider of this.providers) {
      if (provider.name !== "keyword-parser") {
        try {
          const result = await provider.generateInsights(tasks);
          return { ...result, provider: provider.name };
        } catch (error) {
          console.warn(`${provider.name} insights failed`);
        }
      }
    }

    const result = await new KeywordParser().generateInsights(tasks);
    return { ...result, provider: "keyword-parser" };
  }

  async generateTasksFromNotes(
    notes: string,
    context?: {
      lists?: Array<{ id: number; name: string; emoji: string }>;
    }
  ): Promise<Array<TaskSuggestion & { provider: string }>> {
    // Always use keyword parser for this since it has the implementation
    const parser = new KeywordParser();
    const result = await parser.generateTasksFromNotes(notes);
    return result.map(task => ({
      ...task,
      provider: "keyword-parser",
    }));
  }
}

// Singleton instance
let aiManager: AIManager | null = null;

export function getAIManager(): AIManager {
  if (!aiManager) {
    aiManager = new AIManager();
  }
  return aiManager;
}
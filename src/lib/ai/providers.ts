/**
 * AI Provider abstraction for task parsing
 * Supports multiple AI providers with fallback
 */

import type { TaskSuggestion, AITaskInput } from "./index";

export interface AIProvider {
  name: string;
  parseTask(input: AITaskInput): Promise<TaskSuggestion>;
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
    call: 15,
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
  };

  private readonly recurringKeywords = {
    daily: ["daily", "every day", "each day"],
    weekly: ["weekly", "every week", "each week"],
    weekdays: ["weekdays", "mon-fri", "monday tuesday wednesday thursday friday"],
    monthly: ["monthly", "every month", "each month"],
    yearly: ["yearly", "every year", "each year"],
  };

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    const text = input.text.toLowerCase();
    const words = text.split(/\s+/);

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

    // Check for specific dates
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

    if (text.includes("tomorrow")) {
      suggested_date = tomorrow.toISOString().split("T")[0];
    } else if (text.includes("next week") || text.includes("weekend")) {
      suggested_date = nextWeek.toISOString().split("T")[0];
    } else if (text.includes("today")) {
      suggested_date = today.toISOString().split("T")[0];
    }

    // Extract recurring pattern
    let recurring: "none" | "daily" | "weekly" | "weekdays" | "monthly" | "yearly" | "custom" = "none";
    for (const [rec, keywords] of Object.entries(this.recurringKeywords)) {
      if (keywords.some((k) => text.includes(k))) {
        recurring = rec as any;
        break;
      }
    }

    // Extract list/project context
    const listMatch = text.match(/(?:in|for|under)\s+(?:the\s+)?([a-z][a-z\s]+?)(?:\s+(?:project|list|folder)|$)/i);
    const list_name = listMatch ? listMatch[1].trim() : undefined;

    // Extract deadline
    const deadlineMatch = text.match(/deadline[:\s]+(\d{4}-\d{2}-\d{2}|tomorrow|today|next week)/i);
    let deadline: string | undefined;
    if (deadlineMatch) {
      const d = deadlineMatch[1].toLowerCase();
      if (d === "today") deadline = today.toISOString().split("T")[0];
      else if (d === "tomorrow") deadline = tomorrow.toISOString().split("T")[0];
      else if (d === "next week") deadline = nextWeek.toISOString().split("T")[0];
      else deadline = d;
    }

    return {
      name: this.cleanTaskName(input.text),
      description: this.generateDescription(input.text, priority, estimated_duration),
      priority,
      estimated_duration,
      suggested_date,
      recurring,
      list_name,
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
    ];

    let name = text;
    for (const prefix of prefixes) {
      name = name.replace(new RegExp(`^${prefix}\\s*`, "i"), "");
    }

    return name.trim().charAt(0).toUpperCase() + name.slice(1);
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

  async parseTask(input: AITaskInput): Promise<TaskSuggestion> {
    // Check if API key is available
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
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || "{}";
      return JSON.parse(content) as TaskSuggestion;
    } catch (error) {
      console.error("OpenAI parsing failed:", error);
      throw error;
    }
  }

  async generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY not configured");
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
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        }),
      });

      const data = await response.json();
      return JSON.parse(data.choices[0]?.message?.content || '{"tips":[],"suggestions":[],"trends":[]}');
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
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.content[0]?.text || "{}";
      return JSON.parse(content) as TaskSuggestion;
    } catch (error) {
      console.error("Claude parsing failed:", error);
      throw error;
    }
  }

  async generateInsights(tasks: Array<{ name: string; completed: boolean; priority: string; date?: string | null; deadline?: string | null }>): Promise<{ tips: string[]; suggestions: string[]; trends: string[] }> {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const prompt = `
Analyze these tasks and provide productivity insights:

${JSON.stringify(tasks)}

Return JSON: {"tips":["..."],"suggestions":["..."],"trends":["..."]}
`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "Content-Type": "application/json",
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      return JSON.parse(data.content[0]?.text || '{"tips":[],"suggestions":[],"trends":[]}');
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
}

// Singleton instance
let aiManager: AIManager | null = null;

export function getAIManager(): AIManager {
  if (!aiManager) {
    aiManager = new AIManager();
  }
  return aiManager;
}
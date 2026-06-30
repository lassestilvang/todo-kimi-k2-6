import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI modules
vi.mock("@/lib/ai/providers", () => ({
  KeywordParser: class {
    name = "keyword-parser";
    async parseTask() {
      return { name: "test task", priority: "medium" };
    }
    async generateInsights() {
      return { tips: [], suggestions: [], trends: [] };
    }
  },
  OpenAIProvider: class {
    name = "openai-gpt4";
    async parseTask() {
      throw new Error("OpenAI not configured");
    }
    async generateInsights() {
      return { tips: [], suggestions: [], trends: [] };
    }
  },
  ClaudeProvider: class {
    name = "claude-sonnet";
    async parseTask() {
      throw new Error("Claude not configured");
    }
    async generateInsights() {
      return { tips: [], suggestions: [], trends: [] };
    }
  },
  AIManager: class {
    async parseTask() {
      return { name: "test", provider: "keyword-parser" };
    }
    async generateInsights() {
      return { tips: [], suggestions: [], trends: [], provider: "keyword-parser" };
    }
    async generateTasksFromNotes() {
      return [];
    }
  },
}));

describe("AI Module", () => {
  describe("TaskSuggestion types", () => {
    it("should have correct structure", () => {
      const suggestion = {
        name: "Test Task",
        description: "Test description",
        priority: "high" as const,
        estimated_duration: 30,
        suggested_date: "2024-01-15",
        recurring: "daily" as const,
        list_name: "Work",
        deadline: "2024-01-20",
        list_id: 1,
      };

      expect(suggestion.name).toBe("Test Task");
      expect(suggestion.priority).toBe("high");
      expect(suggestion.recurring).toBe("daily");
    });
  });

  describe("AITaskInput types", () => {
    it("should have correct structure", () => {
      const input = {
        text: "Create a new task",
        context: {
          existingTasks: [{ name: "Existing", date: "2024-01-15", deadline: null, priority: "medium" }],
          preferences: { workHours: { start: 9, end: 17 }, preferredTimes: ["09:00"] },
          lists: [{ id: 1, name: "Work", emoji: "💼" }],
        },
      };

      expect(input.text).toBe("Create a new task");
      expect(input.context?.lists).toHaveLength(1);
    });
  });
});
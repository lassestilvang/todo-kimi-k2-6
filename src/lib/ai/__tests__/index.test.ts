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
    async parseEditCommand() {
      return { action: "complete" as const };
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
    async parseEditCommand() {
      return { action: "complete" as const };
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
    async parseEditCommand() {
      return { action: "prioritize" as const };
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
    async parseEditCommand() {
      return { action: "complete" as const, provider: "keyword-parser" };
    }
    clearCache() {}
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

  describe("AIEditCommand types", () => {
    it("should have correct structure for complete action", () => {
      const command = {
        action: "complete" as const,
        taskId: 123,
        taskName: "Test Task",
      };

      expect(command.action).toBe("complete");
      expect(command.taskId).toBe(123);
    });

    it("should have correct structure for prioritize action", () => {
      const command = {
        action: "prioritize" as const,
        taskId: 456,
        taskName: "Important Task",
        updates: { priority: "high" },
      };

      expect(command.action).toBe("prioritize");
      if (command.updates && "priority" in command.updates) {
        expect(command.updates.priority).toBe("high");
      }
    });

    it("should have correct structure for delete action", () => {
      const command = {
        action: "delete" as const,
        taskId: 789,
      };

      expect(command.action).toBe("delete");
    });

    it("should have all valid action types", () => {
      const validActions = ["edit", "delete", "complete", "prioritize", "schedule", "add_label", "remove_label"] as const;
      const action = "complete";
      expect(validActions).toContain(action);
    });
  });
});
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock environment variables
const originalEnv = process.env;

describe("AI Index Module", () => {
  beforeEach(() => {
    process.env = { ...originalEnv, OPENAI_API_KEY: "test-key", ANTHROPIC_API_KEY: "test-key" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("TaskSuggestion type", () => {
    it("should have correct structure for a task suggestion", () => {
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

  describe("AITaskInput type", () => {
    it("should have correct structure for AI task input", () => {
      const input = {
        text: "Create a new task",
        context: {
          existingTasks: [{ name: "Existing", date: "2024-01-15", deadline: null, priority: "medium" }],
          preferences: { workHours: { start: 9, end: 17 }, preferredTimes: ["09:00"] },
          lists: [{ id: 1, name: "Work", emoji: "💼" }],
        },
      };

      expect(input.text).toBe("Create a new task");
      expect(input.context?.lists).toBeDefined();
    });
  });

  describe("Priority scoring", () => {
    const getPriorityScore = (priority: string): number => {
      switch (priority) {
        case "critical": return 0.2;
        case "high": return 0.4;
        case "medium": return 0.6;
        case "low": return 0.8;
        default: return 0.5;
      }
    };

    it("should return correct score for critical", () => {
      expect(getPriorityScore("critical")).toBe(0.2);
    });

    it("should return correct score for high", () => {
      expect(getPriorityScore("high")).toBe(0.4);
    });

    it("should return correct score for medium", () => {
      expect(getPriorityScore("medium")).toBe(0.6);
    });

    it("should return correct score for low", () => {
      expect(getPriorityScore("low")).toBe(0.8);
    });

    it("should return default score for unknown priority", () => {
      expect(getPriorityScore("unknown")).toBe(0.5);
    });
  });

  describe("Confidence calculation", () => {
    const calculateConfidence = (task: any, priorityScore: number, duration: number): number => {
      let confidence = 0.7;
      if (task.estimated_duration) confidence += 0.1;
      if (task.deadline) confidence += 0.1;
      if (task.priority) confidence += 0.05;
      if (duration > 120) confidence -= 0.1;
      return Math.max(0.1, Math.min(0.95, confidence));
    };

    it("should calculate base confidence", () => {
      expect(calculateConfidence({}, 0.5, 30)).toBeCloseTo(0.7);
    });

    it("should increase confidence with duration", () => {
      expect(calculateConfidence({ estimated_duration: 60 }, 0.5, 60)).toBeCloseTo(0.8);
    });

    it("should increase confidence with deadline", () => {
      expect(calculateConfidence({ deadline: "2024-01-20" }, 0.5, 30)).toBeCloseTo(0.8);
    });

    it("should cap confidence at 0.95", () => {
      // 0.7 + 0.1(due) + 0.05(priority) = 0.85, capped at 0.95
      expect(calculateConfidence({ deadline: "2024-01-20", priority: "high" }, 0.5, 30)).toBeCloseTo(0.85);
    });

    it("should floor confidence at 0.1", () => {
      // Base 0.7 + 0.1(due) + 0.05(priority) - 0.1(duration>120) = 0.75
      expect(calculateConfidence({ deadline: "2024-01-20", priority: "high" }, 0.5, 200)).toBeCloseTo(0.75);
    });
  });
});
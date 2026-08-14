import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  parseLocation,
  suggestTaskSchedule,
  generateTaskInsights,
  parseTaskInput,
  parseNaturalLanguageTask,
} from "@/lib/ai/index";

// Mock AI providers - default to keyword-parser
vi.mock("@/lib/ai/providers", () => ({
  getAIManager: vi.fn(() => ({
    parseEditCommand: vi.fn().mockResolvedValue({
      field: "priority",
      newValue: "high",
      oldValue: "medium",
      provider: "keyword-parser",
    }),
    generateProjectPlan: vi.fn().mockResolvedValue({
      name: "Test Project",
      phases: [],
      total_duration_days: 10,
      provider: "keyword-parser",
    }),
    generateDecisionTemplate: vi.fn().mockResolvedValue({
      name: "Test Template",
      prompt_template: "Template prompt",
      provider: "keyword-parser",
    }),
    generateInsights: vi.fn().mockResolvedValue({
      tips: ["Tip 1", "Tip 2"],
      suggestions: ["Suggestion 1"],
      trends: ["Trend 1"],
      provider: "keyword-parser",
    }),
    parseTask: vi.fn().mockResolvedValue({
      name: "Parsed Task",
      provider: "keyword-parser",
    }),
  })),
}));

describe("AI Module - Uncovered Functions", () => {
  describe("parseLocation", () => {
    it("should return null when no locations provided", () => {
      const result = parseLocation("Meeting at the office", undefined);
      expect(result).toBeNull();
    });

    it("should return default location for 'home' keyword when locations array is empty", () => {
      // This tests line 199 - default location match when empty locations array
      const result = parseLocation("Working from home today", []);
      expect(result).toBe("Home Office");
    });

    it("should match location keyword from provided locations", () => {
      const locations = [
        { name: "Home Office", keywords: ["home", "house"] },
        { name: "Work Office", keywords: ["office", "work"] },
        { name: "Gym", keywords: ["gym", "workout"] },
      ];

      const result = parseLocation("Meeting at the office", locations);
      expect(result).toBe("Work Office");
    });

    it("should return null when no match found in locations array", () => {
      const result = parseLocation("Random activity", [
        { name: "Gym", keywords: ["gym"] },
      ]);
      expect(result).toBeNull();
    });

    it("should be case insensitive", () => {
      const locations = [{ name: "Gym", keywords: ["gym"] }];
      const result = parseLocation("GYM session", locations);
      expect(result).toBe("Gym");
    });

    it("should return matched location for first keyword found", () => {
      const locations = [
        { name: "Home", keywords: ["home"] },
        { name: "Work", keywords: ["work"] },
      ];
      const result = parseLocation("I'll be working from home today", locations);
      expect(result).toBe("Home");
    });

    it("should return null when no default keywords match with empty locations", () => {
      const result = parseLocation("Random activity that doesn't match", []);
      expect(result).toBeNull();
    });

    it("should return default location for 'office' keyword when locations array is empty", () => {
      const result = parseLocation("Meeting at the office", []);
      expect(result).toBe("Work Office");
    });

    it("should return default location for 'gym' keyword when locations array is empty", () => {
      const result = parseLocation("Going to the gym", []);
      expect(result).toBe("Gym");
    });

    it("should return default location for 'doctor' keyword when locations array is empty", () => {
      const result = parseLocation("Visiting the doctor tomorrow", []);
      expect(result).toBe("Doctor's Office");
    });

    it("should return default location for 'store' keyword when locations array is empty", () => {
      const result = parseLocation("Shopping at the store", []);
      expect(result).toBe("Store");
    });

    it("should return default location for 'restaurant' keyword when locations array is empty", () => {
      const result = parseLocation("Dinner at a restaurant", []);
      expect(result).toBe("Restaurant");
    });

    it("should return default location for 'meeting' keyword when locations array is empty", () => {
      const result = parseLocation("Team meeting in the conference room", []);
      expect(result).toBe("Meeting Room");
    });
  });

  describe("suggestTaskSchedule", () => {
    it("should suggest schedule for tasks", async () => {
      const tasks = [
        { name: "Task 1", priority: "high", estimated_duration: 60, deadline: null, date: null },
        { name: "Task 2", priority: "medium", estimated_duration: 30, deadline: null, date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);

      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBe(2);
      expect(suggestions[0]).toHaveProperty("name");
      expect(suggestions[0]).toHaveProperty("suggested_date");
      expect(suggestions[0]).toHaveProperty("suggested_time");
      expect(suggestions[0]).toHaveProperty("confidence");
    });

    it("should use deadline as suggested date", async () => {
      const tasks = [
        { name: "Urgent Task", priority: "critical", estimated_duration: 30, deadline: "2024-12-25", date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);

      expect(suggestions[0].suggested_date).toBe("2024-12-25");
    });

    it("should handle empty task array", async () => {
      const suggestions = await suggestTaskSchedule([]);
      expect(suggestions).toEqual([]);
    });

    it("should prioritize critical tasks first", async () => {
      const tasks = [
        { name: "Critical Task", priority: "critical", estimated_duration: 15, deadline: "2024-01-01", date: null },
        { name: "Medium Task", priority: "medium", estimated_duration: 30, deadline: null, date: null },
        { name: "Low Task", priority: "low", estimated_duration: 60, deadline: null, date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);
      expect(suggestions[0].name).toBe("Critical Task");
    });
  });

  describe("generateTaskInsights", () => {
    it("should generate insights for tasks", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high", date: null, deadline: null },
        { name: "Task 2", completed: false, priority: "medium", date: null, deadline: null },
      ];

      const insights = await generateTaskInsights(tasks);

      expect(insights.productivity_tips).toBeDefined();
      expect(insights.suggestions).toBeDefined();
      expect(insights.trends).toBeDefined();
      expect(insights.provider).toBe("keyword-parser");
    });

    it("should handle empty task array", async () => {
      const insights = await generateTaskInsights([]);

      expect(insights.productivity_tips).toBeDefined();
      expect(insights.suggestions).toBeDefined();
      expect(insights.trends).toBeDefined();
    });
  });

  describe("parseTaskInput", () => {
    it("should parse task input and return provider", async () => {
      const result = await parseTaskInput({ text: "Buy milk" });

      expect(result.name).toBe("Parsed Task");
      expect(result.provider).toBe("keyword-parser");
    });

    it("should handle empty text", async () => {
      const result = await parseTaskInput({ text: "" });

      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("provider");
    });

    it("should return result with provider", async () => {
      const result = await parseTaskInput({ text: "Simple task" });

      expect(result.name).toBeDefined();
      expect(result.provider).toBe("keyword-parser");
    });
  });

  describe("parseEditCommand", () => {
    it("should parse edit command with provider info", async () => {
      const { parseEditCommand } = await import("@/lib/ai/index");

      const result = await parseEditCommand("change priority to high", {
        tasks: [{ id: 1, name: "Task", completed: false, priority: "medium" }],
      });

      expect(result).toHaveProperty("field");
      expect(result).toHaveProperty("newValue");
      expect(result).toHaveProperty("provider");
      expect(result.provider).toBe("keyword-parser");
    });
  });

  describe("generateProjectPlan", () => {
    it("should generate project plan with provider info", async () => {
      const { generateProjectPlan } = await import("@/lib/ai/index");

      const result = await generateProjectPlan({
        projectName: "New Project",
        description: "A test project",
      });

      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("phases");
      expect(result).toHaveProperty("provider");
      expect(result.provider).toBe("keyword-parser");
    });
  });

  describe("generateDecisionTemplate", () => {
    it("should generate decision template with provider info", async () => {
      const { generateDecisionTemplate } = await import("@/lib/ai/index");

      const result = await generateDecisionTemplate(1, {
        decisionType: "priority",
        task: { name: "Task", priority: "high" },
      });

      expect(result).toHaveProperty("name");
      expect(result).toHaveProperty("prompt_template");
      expect(result).toHaveProperty("provider");
      expect(result.provider).toBe("keyword-parser");
    });
  });

  describe("parseNaturalLanguageTask - keyword-parser confidence", () => {
    it("should return confidence 50 for keyword-parser provider", async () => {
      const result = await parseNaturalLanguageTask("Buy milk");

      expect(result.name).toBe("Parsed Task");
      // Note: parseNaturalLanguageTask does not return provider in result
      expect(result.confidence).toBe(50);
    });

    it("should return empty labels when list_name is not set", async () => {
      // Test line 96 - labels: result.list_name ? [result.list_name] : []
      const result = await parseNaturalLanguageTask("Simple task with no list");

      // When list_name is not extracted, labels should be an empty array
      expect(result.labels).toEqual([]);
    });
  });

  describe("parseNaturalLanguageTask - list_name truthy branch", () => {
    it("should return empty labels array when list_name is undefined (line 96 falsy branch)", async () => {
      // The mock parseTask doesn't return list_name, so labels should be empty
      const result = await parseNaturalLanguageTask("Random task");
      expect(Array.isArray(result.labels)).toBe(true);
    });
  });

  describe("suggestTaskSchedule - schedule confidence", () => {
    it("should calculate confidence when priority is not set", async () => {
      // Test line 165 - if (task.priority) confidence += 0.05
      const tasks = [
        { name: "Task without priority", estimated_duration: 30, deadline: null, date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);

      expect(suggestions[0].confidence).toBeDefined();
      // Confidence should be 0.7 (base) + 0.1 (estimated_duration) = 0.8
      // Without priority, no +0.05 is added
    });

    it("should calculate confidence with high priority", async () => {
      const tasks = [
        { name: "Task with priority", priority: "high", estimated_duration: 30, deadline: null, date: null },
      ];

      const suggestions = await suggestTaskSchedule(tasks);

      expect(suggestions[0].confidence).toBeGreaterThan(0.8);
      // With priority, confidence should be 0.7 (base) + 0.1 (estimated_duration) + 0.05 (priority) = 0.85
    });
  });
});
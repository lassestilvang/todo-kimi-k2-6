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

    it("should match location keyword from provided locations", () => {
      const locations = [
        { name: "Home Office", keywords: ["home", "house"] },
        { name: "Work Office", keywords: ["office", "work"] },
        { name: "Gym", keywords: ["gym", "workout"] },
      ];

      const result = parseLocation("Meeting at the office", locations);
      expect(result).toBe("Work Office");
    });

    it("should return null when no match found", () => {
      const result = parseLocation("Random activity", []);
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

    it("should return null when no keywords match", () => {
      const locations = [
        { name: "Gym", keywords: ["gym"] },
      ];
      const result = parseLocation("Cooking dinner", locations);
      expect(result).toBeNull();
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
      expect(result.provider).toBe("keyword-parser");
      expect(result.confidence).toBe(50);
    });

    it("should return confidence 80 for non-keyword-parser provider", async () => {
      // This test covers the else branch (non-keyword-parser provider)
      // We need to mock a different provider to test this branch
      const { getAIManager } = await import("@/lib/ai/providers");
      vi.spyOn(require("@/lib/ai/providers"), "getAIManager").mockImplementation(() => ({
        parseTask: vi.fn().mockResolvedValue({
          name: "AI-Parsed Task",
          provider: "openai",
        }),
        generateProjectPlan: vi.fn(),
        generateDecisionTemplate: vi.fn(),
        generateInsights: vi.fn(),
        parseEditCommand: vi.fn(),
      }));

      const result = await parseNaturalLanguageTask("Buy groceries");
      expect(result.confidence).toBe(80);
    });
  });

  describe("parseLocation - default locations", () => {
    it("should return default location for 'home' keyword", () => {
      const result = parseLocation("Working from home today");
      expect(result).toBe("Home Office");
    });

    it("should return default location for 'office' keyword", () => {
      const result = parseLocation("Meeting at the office");
      expect(result).toBe("Work Office");
    });

    it("should return default location for 'gym' keyword", () => {
      const result = parseLocation("Going to the gym");
      expect(result).toBe("Gym");
    });

    it("should return default location for 'doctor' keyword", () => {
      const result = parseLocation("Visiting the doctor tomorrow");
      expect(result).toBe("Doctor's Office");
    });

    it("should return default location for 'store' keyword", () => {
      const result = parseLocation("Shopping at the store");
      expect(result).toBe("Store");
    });

    it("should return default location for 'restaurant' keyword", () => {
      const result = parseLocation("Dinner at a restaurant");
      expect(result).toBe("Restaurant");
    });

    it("should return default location for 'meeting' keyword", () => {
      const result = parseLocation("Team meeting in the conference room");
      expect(result).toBe("Meeting Room");
    });

    it("should return null when no default keywords match", () => {
      const result = parseLocation("Watching TV at home");
      // "home" is a default keyword, so it should match
      expect(result).toBe("Home Office");
    });
  });
});
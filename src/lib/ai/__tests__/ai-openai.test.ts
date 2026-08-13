import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock AI providers with OpenAI provider (not keyword-parser)
vi.mock("@/lib/ai/providers", () => ({
  getAIManager: vi.fn(() => ({
    parseEditCommand: vi.fn().mockResolvedValue({
      field: "priority",
      newValue: "high",
      oldValue: "medium",
      provider: "openai",
    }),
    generateProjectPlan: vi.fn().mockResolvedValue({
      name: "Test Project",
      phases: [],
      total_duration_days: 10,
      provider: "openai",
    }),
    generateDecisionTemplate: vi.fn().mockResolvedValue({
      name: "Test Template",
      prompt_template: "Template prompt",
      provider: "openai",
    }),
    generateInsights: vi.fn().mockResolvedValue({
      tips: ["Tip 1", "Tip 2"],
      suggestions: ["Suggestion 1"],
      trends: ["Trend 1"],
      provider: "openai",
    }),
    parseTask: vi.fn().mockResolvedValue({
      name: "AI-Parsed Task",
      provider: "openai",
    }),
  })),
}));

describe("AI Module - OpenAI Provider Branch", () => {
  describe("parseTaskInput - OpenAI provider", () => {
    it("should return higher confidence for non-keyword-parser provider", async () => {
      const { parseTaskInput } = await import("@/lib/ai/index");

      const result = await parseTaskInput({ text: "Buy milk" });

      // Should be 80 for OpenAI provider, not 50 for keyword-parser
      expect(result.name).toBe("AI-Parsed Task");
      expect(result.provider).toBe("openai");
    });
  });

  describe("generateTaskInsights - OpenAI provider", () => {
    it("should return insights with openai provider", async () => {
      const { generateTaskInsights } = await import("@/lib/ai/index");

      const tasks = [
        { name: "Task 1", completed: true, priority: "high", date: null, deadline: null },
      ];

      const insights = await generateTaskInsights(tasks);

      expect(insights.provider).toBe("openai");
    });
  });

  describe("parseNaturalLanguageTask - OpenAI provider confidence", () => {
    it("should return confidence 80 for openai provider", async () => {
      const { parseNaturalLanguageTask } = await import("@/lib/ai/index");

      const result = await parseNaturalLanguageTask("Schedule meeting for tomorrow");

      expect(result.name).toBe("AI-Parsed Task");
      expect(result.provider).toBe("openai");
      expect(result.confidence).toBe(80);
    });
  });

  describe("generateProjectPlan - OpenAI provider", () => {
    it("should generate project plan with openai provider", async () => {
      const { generateProjectPlan } = await import("@/lib/ai/index");

      const result = await generateProjectPlan({
        projectName: "Marketing Campaign",
        description: "A marketing campaign for product launch",
      });

      expect(result.name).toBe("Test Project");
      expect(result.provider).toBe("openai");
    });
  });

  describe("generateDecisionTemplate - OpenAI provider", () => {
    it("should generate decision template with openai provider", async () => {
      const { generateDecisionTemplate } = await import("@/lib/ai/index");

      const result = await generateDecisionTemplate(1, {
        decisionType: "priority",
        task: { name: "Task", priority: "high" },
      });

      expect(result.name).toBe("Test Template");
      expect(result.provider).toBe("openai");
    });
  });
});
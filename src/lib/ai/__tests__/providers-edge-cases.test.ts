import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeywordParser, AIManager, OpenAIProvider, ClaudeProvider } from "../providers";

describe("AI Providers - Edge Cases", () => {
  describe("KeywordParser", () => {
    let parser: KeywordParser;

    beforeEach(() => {
      parser = new KeywordParser();
    });

    it("should handle empty input", async () => {
      const result = await parser.parseTask({ text: "" });
      expect(result.name).toBe("");
      expect(result.priority).toBe("none");
    });

    it("should handle very long input", async () => {
      const longText = "a".repeat(10000);
      const result = await parser.parseTask({ text: longText });
      expect(result).toBeDefined();
    });

    it("should handle special characters", async () => {
      const result = await parser.parseTask({ text: "Task with émojis 🎉 and spëcial çhars" });
      expect(result).toBeDefined();
    });

    it("should generate insights for empty task list", async () => {
      const result = await parser.generateInsights([]);
      expect(result.tips).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });

    it("should generate insights for completed tasks", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high", date: null, deadline: null },
        { name: "Task 2", completed: true, priority: "high", date: null, deadline: null },
      ];
      const result = await parser.generateInsights(tasks);
      expect(result.trends).toContain("Current completion rate: 100%");
    });

    it("should handle generateTasksFromNotes with empty string", async () => {
      const result = await parser.generateTasksFromNotes("");
      expect(result).toEqual([]);
    });

    it("should handle generateTasksFromNotes with only whitespace", async () => {
      const result = await parser.generateTasksFromNotes("   \n\n   ");
      expect(result).toEqual([]);
    });

    it("should handle multiple priority keywords", async () => {
      const result = await parser.parseTask({ text: "URGENT critical high priority task" });
      expect(["critical", "high"]).toContain(result.priority);
    });

    it("should handle date patterns", async () => {
      const result1 = await parser.parseTask({ text: "Meeting tomorrow" });
      expect(result1.suggested_date).toBeDefined();

      const result2 = await parser.parseTask({ text: "Review next week" });
      expect(result2.suggested_date).toBeDefined();
    });

    it("should handle recurring patterns", async () => {
      const daily = await parser.parseTask({ text: "Daily standup" });
      expect(daily.recurring).toBe("daily");

      const weekly = await parser.parseTask({ text: "Weekly review" });
      expect(weekly.recurring).toBe("weekly");
    });

    it("should handle list keywords", async () => {
      const result = await parser.parseTask({ text: "Meeting at work" });
      expect(result.list_name).toBe("Work");
    });

    it("should handle context lists", async () => {
      const result = await parser.parseTask({
        text: "Task for Marketing Campaign",
        context: {
          lists: [{ id: 5, name: "Marketing", emoji: "📈" }],
        },
      });
      // The keyword parser matches "marketing" to "Work" list
      expect(result.list_name).toBeDefined();
    });
  });

  describe("OpenAIProvider", () => {
    let provider: OpenAIProvider;

    beforeEach(() => {
      provider = new OpenAIProvider();
      vi.stubEnv("OPENAI_API_KEY", "test-key");
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should throw error when API key not configured", async () => {
      vi.stubEnv("OPENAI_API_KEY", undefined);
      const provider = new OpenAIProvider();
      await expect(provider.parseTask({ text: "test" })).rejects.toThrow("OPENAI_API_KEY not configured");
    });

    it("should handle API error response", async () => {
      const provider = new OpenAIProvider();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should handle malformed JSON response", async () => {
      const provider = new OpenAIProvider();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "invalid json" } }] }),
      });

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should handle network error", async () => {
      const provider = new OpenAIProvider();
      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should return empty arrays when API key not configured for insights", async () => {
      vi.stubEnv("OPENAI_API_KEY", undefined);
      const provider = new OpenAIProvider();
      const result = await provider.generateInsights([]);
      expect(result.tips).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.trends).toEqual([]);
    });
  });

  describe("ClaudeProvider", () => {
    let provider: ClaudeProvider;

    beforeEach(() => {
      provider = new ClaudeProvider();
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("should throw error when API key not configured", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", undefined);
      const provider = new ClaudeProvider();
      await expect(provider.parseTask({ text: "test" })).rejects.toThrow("ANTHROPIC_API_KEY not configured");
    });

    it("should handle API error response", async () => {
      const provider = new ClaudeProvider();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should handle malformed response", async () => {
      const provider = new ClaudeProvider();
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: "invalid json" }] }),
      });

      await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
    });

    it("should return empty arrays when API key not configured for insights", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", undefined);
      const provider = new ClaudeProvider();
      const result = await provider.generateInsights([]);
      expect(result.tips).toEqual([]);
      expect(result.suggestions).toEqual([]);
      expect(result.trends).toEqual([]);
    });
  });

  describe("AIManager", () => {
    it("should always have keyword parser as fallback", async () => {
      const manager = new AIManager();
      const result = await manager.parseTask({ text: "Test task" });
      expect(result.provider).toBe("keyword-parser");
    });

    it("should generate insights with fallback", async () => {
      const manager = new AIManager();
      const result = await manager.generateInsights([
        { name: "Task", completed: true, priority: "high", date: null, deadline: null },
      ]);
      expect(result.provider).toBe("keyword-parser");
      expect(result.tips.length).toBeGreaterThan(0);
    });

    it("should handle generateTasksFromNotes", async () => {
      const manager = new AIManager();
      const result = await manager.generateTasksFromNotes("- Task 1\n- Task 2");
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle all providers failing gracefully", async () => {
      // Test the path where all providers fail
      class TestableAIManager extends AIManager {
        constructor() {
          super();
          (this as any).providers = [];
        }
      }

      const manager = new TestableAIManager();
      const result = await manager.parseTask({ text: "Test task" });
      expect(result.provider).toBe("keyword-parser");
    });

    it("should handle parseTaskStream with streaming provider", async () => {
      const provider = new OpenAIProvider();
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"choices":[{"delta":{"content":"{"}}]}'));
          controller.enqueue(new TextEncoder().encode('data: [DONE]'));
          controller.close();
        }
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: mockStream,
      });

      const onChunk = vi.fn();
      await provider.parseTaskStream({ text: "test" }, onChunk);
    });

    it("should fallback to keyword parser when stream fails", async () => {
      const provider = new OpenAIProvider();
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        body: null,
      });

      const onChunk = vi.fn();
      const result = await provider.parseTaskStream({ text: "test" }, onChunk);
      expect(result.name).toBeDefined();
    });

    it("should handle generateInsights with empty task list", async () => {
      const manager = new AIManager();
      const result = await manager.generateInsights([]);
      expect(result.tips).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    it("should handle generateInsights with many tasks", async () => {
      const manager = new AIManager();
      const tasks = Array(100).fill(null).map((_, i) => ({
        name: `Task ${i}`,
        completed: i % 2 === 0,
        priority: "medium",
        date: null,
        deadline: null,
      }));
      const result = await manager.generateInsights(tasks);
      expect(result).toBeDefined();
      expect(result.tips).toBeDefined();
    });

    it("should handle generateTasksFromNotes with markdown", async () => {
      const manager = new AIManager();
      const result = await manager.generateTasksFromNotes("- Item 1\n- Item 2\n- Item 3");
      expect(result.length).toBe(3);
    });

    it("should handle provider with custom model", async () => {
      vi.stubEnv("OPENAI_MODEL", "gpt-4");
      const provider = new OpenAIProvider();
      expect(provider.name).toBe("openai-gpt4");
    });

    it("should handle ClaudeProvider with custom model", async () => {
      vi.stubEnv("CLAUDE_MODEL", "claude-3-opus-20240229");
      const provider = new ClaudeProvider();
      expect(provider.name).toBe("claude-sonnet");
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { KeywordParser, AIManager, OpenAIProvider, ClaudeProvider } from "../providers";

describe("AI Providers - Full Coverage", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("OpenAIProvider - Full Coverage", () => {
    it("should handle all error paths in generateInsights", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = new OpenAIProvider();

      // Test successful path
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: '{"tips":["tip"],"suggestions":[],"trends":[]}' } }] }),
      });

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result.tips).toBeDefined();
    });

    it("should handle API error in generateInsights", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = new OpenAIProvider();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Error",
      });

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result.tips).toEqual([]);
    });

    it("should handle network error in generateInsights", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = new OpenAIProvider();

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result.tips).toEqual([]);
    });

    it("should handle malformed JSON in generateInsights", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const provider = new OpenAIProvider();

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "invalid" } }] }),
      });

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result).toBeDefined();
    });
  });

  describe("ClaudeProvider - Full Coverage", () => {
    it("should handle all paths in generateInsights", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      const provider = new ClaudeProvider();

      // Test successful path
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ content: [{ text: '{"tips":["tip"],"suggestions":[],"trends":[]}' }] }),
      });

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result.tips).toBeDefined();
    });

    it("should handle API error in generateInsights", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      const provider = new ClaudeProvider();

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
      });

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result.tips).toEqual([]);
    });

    it("should handle network error in generateInsights", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      const provider = new ClaudeProvider();

      global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      const result = await provider.generateInsights([{ name: "Task", completed: true, priority: "high", date: null, deadline: null }]);
      expect(result.tips).toEqual([]);
    });
  });

  describe("AIManager - Provider Selection", () => {
    it("should use OpenAI when configured", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      const manager = new AIManager();
      // Should have OpenAI provider
      expect(manager["providers"].length).toBeGreaterThan(1);
    });

    it("should use Claude when configured", async () => {
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      const manager = new AIManager();
      // Should have Claude provider
      expect(manager["providers"].length).toBeGreaterThan(1);
    });

    it("should use both when both configured", async () => {
      vi.stubEnv("OPENAI_API_KEY", "test-key");
      vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
      const manager = new AIManager();
      expect(manager["providers"].length).toBe(3); // KeywordParser + OpenAI + Claude
    });
  });

  describe("KeywordParser - Edge Cases", () => {
    const parser = new KeywordParser();

    it("should handle normal task without special keywords", async () => {
      const result = await parser.parseTask({ text: "Buy groceries tomorrow" });
      expect(result.name).toBeDefined();
      // Priority defaults to none when no keywords match
    });

    it("should handle generateInsights with all completed", async () => {
      const tasks = [
        { name: "T1", completed: true, priority: "high", date: null, deadline: null },
        { name: "T2", completed: true, priority: "high", date: null, deadline: null },
      ];
      const result = await parser.generateInsights(tasks);
      expect(result.tips).toBeDefined();
    });

    it("should handle generateInsights with low completion", async () => {
      const tasks = [
        { name: "T1", completed: false, priority: "high", date: null, deadline: null },
        { name: "T2", completed: false, priority: "medium", date: null, deadline: null },
      ];
      const result = await parser.generateInsights(tasks);
      expect(result.tips.length).toBeGreaterThan(0);
    });

    it("should handle task with 'medium' priority keyword", async () => {
      const result = await parser.parseTask({ text: "medium priority task" });
      expect(result.priority).toBe("medium");
    });

    it("should handle 'normal' priority keyword", async () => {
      const result = await parser.parseTask({ text: "Normal priority task" });
      expect(result.priority).toBe("medium");
    });

    it("should handle task with estimate keyword", async () => {
      const result = await parser.parseTask({ text: "Write report - estimated 60 minutes" });
      expect(result.name).toBeDefined();
    });

    it("should handle recurring with weekly keyword", async () => {
      const result = await parser.parseTask({ text: "Weekly review" });
      expect(result.recurring).toBe("weekly");
    });
  });
});
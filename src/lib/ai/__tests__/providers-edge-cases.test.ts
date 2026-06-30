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
  });

  describe("AIManager", () => {
    it("should always have keyword parser as fallback", () => {
      const manager = new AIManager();
      // Should never throw even without API keys
      manager.parseTask({ text: "Test task" }).then(result => {
        expect(result.provider).toBe("keyword-parser");
      });
    });

    it("should generate insights with fallback", async () => {
      const manager = new AIManager();
      const result = await manager.generateInsights([
        { name: "Task", completed: true, priority: "high", date: null, deadline: null },
      ]);
      expect(result.provider).toBeDefined();
      expect(result.tips.length).toBeGreaterThan(0);
    });
  });
});
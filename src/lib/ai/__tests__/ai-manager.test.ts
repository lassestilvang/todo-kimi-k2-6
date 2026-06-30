import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { AIManager, KeywordParser, OpenAIProvider, ClaudeProvider } from "../providers";

describe("AI Manager", () => {
  let aiManager: AIManager;

  beforeEach(() => {
    aiManager = new AIManager();
  });

  describe("parseTask", () => {
    it("should parse basic task", async () => {
      const result = await aiManager.parseTask({ text: "Buy groceries" });
      expect(result.name).toBe("Buy groceries");
      expect(result.provider).toBe("keyword-parser");
    });

    it("should include provider in result", async () => {
      const result = await aiManager.parseTask({ text: "Test task" });
      expect(result).toHaveProperty("provider");
    });

    it("should handle empty input", async () => {
      const result = await aiManager.parseTask({ text: "" });
      expect(result).toHaveProperty("name");
    });

    it("should handle special characters", async () => {
      const result = await aiManager.parseTask({ text: "Task with émojis 🎉" });
      expect(result).toHaveProperty("name");
    });
  });

  describe("generateInsights", () => {
    it("should generate insights with fallback", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high", date: null, deadline: null },
        { name: "Task 2", completed: false, priority: "medium", date: null, deadline: null },
      ];

      const result = await aiManager.generateInsights(tasks);
      expect(result).toHaveProperty("tips");
      expect(result).toHaveProperty("suggestions");
      expect(result).toHaveProperty("trends");
      expect(result.provider).toBe("keyword-parser");
    });

    it("should handle empty tasks array", async () => {
      const result = await aiManager.generateInsights([]);
      expect(result.tips).toBeDefined();
      expect(result.suggestions).toBeDefined();
    });
  });

  describe("generateTasksFromNotes", () => {
    it("should generate tasks from bullet points", async () => {
      const notes = "- Task 1\n- Task 2\n- Task 3";
      const result = await aiManager.generateTasksFromNotes(notes);
      expect(result.length).toBe(3);
      expect(result[0].name).toBe("Task 1");
    });

    it("should handle empty notes", async () => {
      const result = await aiManager.generateTasksFromNotes("");
      expect(result).toEqual([]);
    });

    it("should handle notes with no bullet points", async () => {
      const result = await aiManager.generateTasksFromNotes("Just some text without bullets");
      expect(result.length).toBe(1);
    });
  });
});

describe("KeywordParser", () => {
  let parser: KeywordParser;

  beforeEach(() => {
    parser = new KeywordParser();
  });

  it("should parse task with priority keywords", async () => {
    const result = await parser.parseTask({ text: "URGENT: Fix the bug" });
    expect(result.priority).toBe("critical");
  });

  it("should parse recurring patterns", async () => {
    const result = await parser.parseTask({ text: "Daily standup meeting" });
    expect(result.recurring).toBe("daily");
  });

  it("should parse dates", async () => {
    const result = await parser.parseTask({ text: "Meeting tomorrow" });
    expect(result.suggested_date).toBeDefined();
  });

  it("should clean task name", async () => {
    const result = await parser.parseTask({ text: "Create a task for testing" });
    expect(result.name).not.toContain("Create a task for");
  });
});

describe("OpenAIProvider", () => {
  it("should throw error without API key", async () => {
    const provider = new OpenAIProvider();
    await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
  });
});

describe("ClaudeProvider", () => {
  it("should throw error without API key", async () => {
    const provider = new ClaudeProvider();
    await expect(provider.parseTask({ text: "test" })).rejects.toThrow();
  });
});
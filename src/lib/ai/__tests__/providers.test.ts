import { describe, it, expect, beforeEach } from "vitest";
import { KeywordParser, AIManager } from "../providers";
import type { AITaskInput } from "../index";

describe("AI Providers", () => {
  let keywordParser: KeywordParser;
  let aiManager: AIManager;

  beforeEach(() => {
    keywordParser = new KeywordParser();
    aiManager = new AIManager();
  });

  describe("KeywordParser", () => {
    it("should parse basic task name", async () => {
      const input: AITaskInput = { text: "Buy groceries" };
      const result = await keywordParser.parseTask(input);
      expect(result.name).toBe("Buy groceries");
    });

    it("should extract priority from text", async () => {
      const input: AITaskInput = { text: "URGENT: Fix the bug" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("critical");
    });

    it("should extract high priority from text", async () => {
      const input: AITaskInput = { text: "This is important and needs to be done soon" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("high");
    });

    it("should extract medium priority from text", async () => {
      const input: AITaskInput = { text: "This is a medium priority task" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("medium");
    });

    it("should extract low priority from text", async () => {
      const input: AITaskInput = { text: "This can be done later or someday" };
      const result = await keywordParser.parseTask(input);
      expect(result.priority).toBe("low");
    });

    it("should extract recurring patterns", async () => {
      const input: AITaskInput = { text: "Walk the dog daily" };
      const result = await keywordParser.parseTask(input);
      expect(result.recurring).toBe("daily");
    });

    it("should extract weekly recurring", async () => {
      const input: AITaskInput = { text: "Review reports weekly" };
      const result = await keywordParser.parseTask(input);
      expect(result.recurring).toBe("weekly");
    });

    it("should extract estimated duration", async () => {
      const input: AITaskInput = { text: "Write a report - estimated 120 minutes" };
      const result = await keywordParser.parseTask(input);
      expect(result.estimated_duration).toBe(120);
    });

    it("should extract deadline from text", async () => {
      const input: AITaskInput = { text: "Submit project with deadline 2024-12-31" };
      const result = await keywordParser.parseTask(input);
      expect(result.deadline).toBe("2024-12-31");
    });

    it("should extract date patterns", async () => {
      const input: AITaskInput = { text: "Meeting tomorrow" };
      const result = await keywordParser.parseTask(input);
      expect(result.suggested_date).toBeDefined();
    });

    it("should extract list context", async () => {
      const input: AITaskInput = { text: "Work on project at work" };
      const result = await keywordParser.parseTask(input);
      expect(result.list_name).toBe("Work");
    });

    it("should handle complex task text", async () => {
      const input: AITaskInput = {
        text: "URGENT: Complete the quarterly review report by Friday with high priority",
      };
      const result = await keywordParser.parseTask(input);
      expect(result.name).toBeDefined();
      expect(result.priority).toBe("critical");
    });
  });

  describe("AIManager", () => {
    it("should parse task with fallback", async () => {
      const input: AITaskInput = { text: "Buy milk" };
      const result = await aiManager.parseTask(input);
      expect(result.name).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    it("should generate insights", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high" },
        { name: "Task 2", completed: false, priority: "medium" },
      ];
      const result = await aiManager.generateInsights(tasks);
      expect(result.tips).toBeDefined();
      expect(result.suggestions).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    it("should handle empty tasks array", async () => {
      const result = await aiManager.generateInsights([]);
      expect(result.tips).toBeDefined();
      expect(result.trends).toBeDefined();
    });
  });
});

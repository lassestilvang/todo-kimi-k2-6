import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KeywordParser, AIManager } from "./providers";

describe("KeywordParser", () => {
  let parser: KeywordParser;

  beforeEach(() => {
    parser = new KeywordParser();
  });

  describe("parseTask", () => {
    it("should parse basic task name", async () => {
      const result = await parser.parseTask({ text: "Buy groceries" });
      expect(result.name).toBe("Buy groceries");
      expect(result.priority).toBe("none");
    });

    it("should detect critical priority", async () => {
      const result = await parser.parseTask({ text: "URGENT: Fix the production bug" });
      expect(result.priority).toBe("critical");
    });

    it("should detect high priority", async () => {
      const result = await parser.parseTask({ text: "This is a soon task" });
      expect(result.priority).toBe("high");
    });

    it("should detect low priority", async () => {
      const result = await parser.parseTask({ text: "Low priority: Update documentation" });
      expect(result.priority).toBe("low");
    });

    it("should extract estimated duration", async () => {
      const result = await parser.parseTask({ text: "Schedule a meeting with the team" });
      expect(result.estimated_duration).toBe(30);
    });

    it("should extract todo date", async () => {
      const result = await parser.parseTask({ text: "Complete the report tomorrow" });
      expect(result.suggested_date).toBeDefined();
    });

    it("should detect recurring patterns", async () => {
      const result = await parser.parseTask({ text: "Daily standup" });
      expect(result.recurring).toBe("daily");
    });
  });

  describe("generateInsights", () => {
    it("should generate productivity tips", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high" },
        { name: "Task 2", completed: false, priority: "critical" },
      ];
      const result = await parser.generateInsights(tasks);
      expect(result.tips).toBeDefined();
      expect(result.trends).toBeDefined();
    });
  });
});

describe("AIManager", () => {
  let manager: AIManager;

  beforeEach(() => {
    manager = new AIManager();
  });

  it("should parse task with fallback", async () => {
    const result = await manager.parseTask({ text: "Test task" });
    expect(result.name).toBeDefined();
    expect(result.provider).toBeDefined();
  });

  it("should generate insights with fallback", async () => {
    const tasks = [{ name: "Test", completed: false, priority: "high" }];
    const result = await manager.generateInsights(tasks);
    expect(result.provider).toBeDefined();
  });
});
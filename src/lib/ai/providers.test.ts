 
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { KeywordParser, AIManager, OpenAIProvider, ClaudeProvider } from "./providers";

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

    it("should extract deadline", async () => {
      const result = await parser.parseTask({ text: "Submit report deadline: 2024-12-31" });
      expect(result.deadline).toBe("2024-12-31");
    });

    it("should extract list context from context lists", async () => {
      const result = await parser.parseTask({
        text: "Shopping: Buy milk",
        context: {
          lists: [{ id: 1, name: "Shopping", emoji: "🛒" }],
        },
      });
      expect(result.list_name).toBe("Shopping");
      expect(result.list_id).toBe(1);
    });

    it("should extract list context from emoji", async () => {
      const result = await parser.parseTask({
        text: "Buy milk 🛒",
        context: {
          lists: [{ id: 1, name: "Shopping", emoji: "🛒" }],
        },
      });
      expect(result.list_name).toBe("Shopping");
      expect(result.list_id).toBe(1);
    });

    it("should extract list context from keywords", async () => {
      const result = await parser.parseTask({ text: "Work on the quarterly report" });
      expect(result.list_name).toBe("Work");
    });

    it("should clean task name prefixes", async () => {
      const result = await parser.parseTask({ text: "Create a task for team meeting" });
      expect(result.name).toBe("Team meeting");
    });

    it("should handle empty context", async () => {
      const result = await parser.parseTask({ text: "Simple task" });
      expect(result.name).toBe("Simple task");
      expect(result.list_name).toBeUndefined();
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

    it("should suggest breaking down critical tasks", async () => {
      const tasks = [
        { name: "Task 1", completed: false, priority: "critical" },
        { name: "Task 2", completed: false, priority: "critical" },
        { name: "Task 3", completed: false, priority: "critical" },
        { name: "Task 4", completed: false, priority: "critical" },
      ];
      const result = await parser.generateInsights(tasks);
      expect(result.suggestions.some(s => s.includes("critical tasks"))).toBe(true);
    });

    it("should calculate completion rate", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high" },
        { name: "Task 2", completed: false, priority: "high" },
      ];
      const result = await parser.generateInsights(tasks);
      expect(result.trends.some(t => t.includes("50%"))).toBe(true);
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

  it("should always use keyword parser as fallback", async () => {
    // This will always succeed since KeywordParser is the fallback
    const result = await manager.parseTask({ text: "Another test task" });
    expect(result.provider).toBe("keyword-parser");
  });
});

describe("OpenAIProvider", () => {
  it("should throw error when API key is missing", async () => {
    const provider = new OpenAIProvider();
    const originalKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    let errorThrown = false;
    try {
      await provider.parseTask({ text: "Test" });
    } catch (e: any) {
      errorThrown = e.message?.includes("OPENAI_API_KEY not configured");
    }
    expect(errorThrown).toBe(true);

    process.env.OPENAI_API_KEY = originalKey;
  });
});

describe("ClaudeProvider", () => {
  it("should throw error when API key is missing", async () => {
    const provider = new ClaudeProvider();
    const originalKey = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;

    let errorThrown = false;
    try {
      await provider.parseTask({ text: "Test" });
    } catch (e: any) {
      errorThrown = e.message?.includes("ANTHROPIC_API_KEY not configured");
    }
    expect(errorThrown).toBe(true);

    process.env.ANTHROPIC_API_KEY = originalKey;
  });
});
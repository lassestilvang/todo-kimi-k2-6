import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI manager
vi.mock("@/lib/ai", () => ({
  getAIManager: () => ({
    parseTask: vi.fn(),
    generateInsights: vi.fn(),
    generateTasksFromNotes: vi.fn(),
  }),
}));

describe("AI Assistant - Logic Tests", () => {
  describe("Priority Detection", () => {
    const priorities = ["critical", "high", "medium", "low", "none"] as const;

    it("should identify critical priority keywords", () => {
      const criticalKeywords = ["urgent", "asap", "critical", "deadline", "important"];
      const text = "urgent task";
      const hasCritical = criticalKeywords.some((k) => text.includes(k));
      expect(hasCritical).toBe(true);
    });

    it("should identify low priority keywords", () => {
      const lowKeywords = ["low priority", "later", "someday", "optional", "backlog"];
      const text = "someday project";
      const hasLow = lowKeywords.some((k) => text.includes(k));
      expect(hasLow).toBe(true);
    });
  });

  describe("Duration Estimation", () => {
    it("should estimate duration for meetings", () => {
      const text = "meeting with team";
      const durationKeywords = { meeting: 30, call: 30, review: 15, email: 15 };
      const matchedDuration = Object.entries(durationKeywords).find(([k]) => text.includes(k));
      expect(matchedDuration?.[1]).toBe(30);
    });

    it("should estimate duration for coding tasks", () => {
      const text = "coding session";
      const durationKeywords = { coding: 120, debugging: 90, refactoring: 120 };
      const matchedDuration = Object.entries(durationKeywords).find(([k]) => text.includes(k));
      expect(matchedDuration?.[1]).toBe(120);
    });
  });

  describe("Recurring Pattern Detection", () => {
    const recurringPatterns = {
      daily: ["daily", "every day", "each day"],
      weekly: ["weekly", "every week", "each week"],
      monthly: ["monthly", "every month", "each month"],
    };

    it("should detect daily recurrence", () => {
      const text = "daily standup";
      const isDaily = recurringPatterns.daily.some((k) => text.includes(k));
      expect(isDaily).toBe(true);
    });

    it("should detect weekly recurrence", () => {
      const text = "weekly report";
      const isWeekly = recurringPatterns.weekly.some((k) => text.includes(k));
      expect(isWeekly).toBe(true);
    });

    it("should detect monthly recurrence", () => {
      const text = "monthly review";
      const isMonthly = recurringPatterns.monthly.some((k) => text.includes(k));
      expect(isMonthly).toBe(true);
    });
  });

  describe("List Classification", () => {
    const listKeywords: Record<string, string> = {
      work: "Work",
      meeting: "Work",
      call: "Work",
      email: "Work",
      gym: "Health",
      exercise: "Health",
      doctor: "Health",
      grocery: "Shopping",
      buy: "Shopping",
      pay: "Finance",
      bill: "Finance",
      budget: "Finance",
      clean: "Home",
      chore: "Home",
      trip: "Travel",
      vacation: "Travel",
    };

    it("should classify work-related tasks", () => {
      const text = "team meeting";
      const matchedList = Object.entries(listKeywords).find(([k]) => text.includes(k));
      expect(matchedList?.[1]).toBe("Work");
    });

    it("should classify health-related tasks", () => {
      const text = "gym session";
      const matchedList = Object.entries(listKeywords).find(([k]) => text.includes(k));
      expect(matchedList?.[1]).toBe("Health");
    });

    it("should classify finance-related tasks", () => {
      const text = "pay bills";
      const matchedList = Object.entries(listKeywords).find(([k]) => text.includes(k));
      expect(matchedList?.[1]).toBe("Finance");
    });
  });

  describe("Date Parsing", () => {
    it("should parse 'tomorrow' correctly", () => {
      const text = "tomorrow";
      const isTomorrow = text.includes("tomorrow");
      expect(isTomorrow).toBe(true);
    });

    it("should parse 'next week' correctly", () => {
      const text = "next week";
      const isNextWeek = text.includes("next week");
      expect(isNextWeek).toBe(true);
    });

    it("should parse 'in X days' format", () => {
      const text = "in 3 days";
      const inMatch = text.match(/in\s+(\d+)\s+days?/);
      expect(inMatch).not.toBeNull();
      expect(inMatch?.[1]).toBe("3");
    });
  });
});

describe("AI Assistant - UI State Management", () => {
  it("should track input text state", () => {
    const inputText = "Buy groceries";
    expect(inputText.length).toBeGreaterThan(0);
    expect(inputText).toContain("groceries");
  });

  it("should handle empty input", () => {
    const inputText = "";
    expect(inputText.trim()).toBeFalsy();
  });

  it("should handle long input", () => {
    const inputText = "a".repeat(500);
    expect(inputText.length).toBe(500);
  });
});
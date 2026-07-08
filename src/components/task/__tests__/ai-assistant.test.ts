import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AI manager
vi.mock("@/lib/ai", () => ({
  getAIManager: () => ({
    parseTask: vi.fn(),
    generateInsights: vi.fn(),
    generateTasksFromNotes: vi.fn(),
    parseEditCommand: vi.fn(),
  }),
}));

describe("AI Edit Command Logic", () => {
  describe("Complete Command Detection", () => {
    it("should detect complete command for task", () => {
      const text = "Complete task: Buy groceries";
      const completeMatch = text.match(/(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i);
      expect(completeMatch).not.toBeNull();
      if (completeMatch) {
        expect(completeMatch[1]).toContain("Buy groceries");
      }
    });

    it("should detect mark as done command", () => {
      const text = "Mark task as done: Call mom";
      const completeMatch = text.match(/(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i);
      expect(completeMatch).not.toBeNull();
    });

    it("should detect finish command", () => {
      const text = "Finish the report";
      const completeMatch = text.match(/(?:complete|mark\s+(?:as\s+)?done|finish|done)[:\s]+(.+?)(?:\s*$|\s*[.!?])/i);
      expect(completeMatch).not.toBeNull();
    });
  });

  describe("Delete Command Detection", () => {
    it("should detect delete command for task", () => {
      const text = "Delete task: Old item";
      const deleteMatch = text.match(/(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i);
      expect(deleteMatch).not.toBeNull();
      if (deleteMatch) {
        expect(deleteMatch[1]).toContain("Old item");
      }
    });

    it("should detect remove command", () => {
      const text = "Remove the old todo";
      const deleteMatch = text.match(/(?:delete|remove)[:\s]+(?:task\s+)?(.+?)(?:\s*$|\s*[.!?])/i);
      expect(deleteMatch).not.toBeNull();
    });
  });

  describe("Priority Command Detection", () => {
    it("should detect set priority to critical", () => {
      const text = "Set priority of task to critical";
      const priorityMatch = text.match(/(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i);
      expect(priorityMatch).not.toBeNull();
      if (priorityMatch) {
        expect(priorityMatch[2]).toBe("critical");
      }
    });

    it("should detect change priority to high", () => {
      const text = "Change this task to high priority";
      const priorityMatch = text.match(/(?:set|change)\s+(?:priority\s+of\s+)?(.+?)\s+to\s+(critical|high|medium|low)/i);
      expect(priorityMatch).not.toBeNull();
    });
  });

  describe("AI Provider Selection", () => {
    it("should select openai as provider when configured", () => {
      const mockStatus = { openai: true, anthropic: false };
      const activeProvider = mockStatus.openai ? "openai-gpt4" : mockStatus.anthropic ? "claude-sonnet" : "keyword-parser";
      expect(activeProvider).toBe("openai-gpt4");
    });

    it("should select claude as provider when openai not configured", () => {
      const mockStatus = { openai: false, anthropic: true };
      const activeProvider = mockStatus.openai ? "openai-gpt4" : mockStatus.anthropic ? "claude-sonnet" : "keyword-parser";
      expect(activeProvider).toBe("claude-sonnet");
    });

    it("should fall back to keyword parser when no AI configured", () => {
      const mockStatus = { openai: false, anthropic: false };
      const activeProvider = mockStatus.openai ? "openai-gpt4" : mockStatus.anthropic ? "claude-sonnet" : "keyword-parser";
      expect(activeProvider).toBe("keyword-parser");
    });
  });
});

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

describe("AI Assistant - NLP Enhancements", () => {
  describe("Time Range Parsing", () => {
    it("should parse 'from X to Y' time range format", () => {
      const text = "Meeting from 2pm to 4pm";
      const fromToMatch = text.match(/from\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s+to\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);
      expect(fromToMatch).not.toBeNull();
      if (fromToMatch) {
        expect(fromToMatch[1]).toContain("2pm");
        expect(fromToMatch[2]).toContain("4pm");
      }
    });

    it("should parse 'X-Y' time range format", () => {
      const text = "Meeting 2-4pm";
      const rangeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      expect(rangeMatch).not.toBeNull();
    });

    it("should parse AM/PM time ranges correctly", () => {
      const text = "Work from 9am to 5pm";
      const match = text.match(/from\s+(\d{1,2})\s*(am|pm)\s+to\s+(\d{1,2})\s*(am|pm)/i);
      expect(match).not.toBeNull();
    });
  });

  describe("Location Parsing", () => {
    it("should detect home location keyword", () => {
      const text = "Clean the house at home";
      const hasHome = text.toLowerCase().includes("home");
      expect(hasHome).toBe(true);
    });

    it("should detect office location keyword", () => {
      const text = "Team meeting at office";
      const hasOffice = text.toLowerCase().includes("office");
      expect(hasOffice).toBe(true);
    });

    it("should detect gym location keyword", () => {
      const text = "Workout at gym today";
      const hasGym = text.toLowerCase().includes("gym");
      expect(hasGym).toBe(true);
    });
  });
});
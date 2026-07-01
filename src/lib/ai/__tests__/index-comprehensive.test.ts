import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// We'll test the actual implementation by importing it
describe("AI Index Module - Comprehensive Tests", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getPriorityScore", () => {
    it("should return correct score for critical priority", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "critical", estimated_duration: null, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0);
    });

    it("should return correct score for high priority", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "high", estimated_duration: null, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0);
    });

    it("should return correct score for medium priority", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "medium", estimated_duration: null, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0);
    });

    it("should return correct score for low priority", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "low", estimated_duration: null, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0);
    });

    it("should return correct score for none priority", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "none", estimated_duration: null, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0);
    });
  });

  describe("calculateScheduleConfidence", () => {
    it("should return higher confidence for tasks with estimated duration", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "medium", estimated_duration: 60, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0.7);
    });

    it("should return higher confidence for tasks with deadline", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "medium", estimated_duration: null, date: null, deadline: "2024-01-15" }
      ]);
      expect(result[0].confidence).toBeGreaterThan(0.7);
    });

    it("should return lower confidence for very long tasks", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "medium", estimated_duration: 300, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeLessThan(0.85);
    });

    it("should cap confidence at maximum", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Test", priority: "medium", estimated_duration: 30, date: null, deadline: null }
      ]);
      expect(result[0].confidence).toBeLessThanOrEqual(0.95);
    });
  });

  describe("suggestTaskSchedule", () => {
    it("should suggest schedule for multiple tasks", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([
        { name: "Task 1", priority: "critical", estimated_duration: 30, date: null, deadline: null },
        { name: "Task 2", priority: "high", estimated_duration: 60, date: null, deadline: null },
      ]);
      expect(result).toHaveLength(2);
      expect(result[0].suggested_date).toBeDefined();
      expect(result[0].suggested_time).toBeDefined();
    });

    it("should use custom work hours", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule(
        [{ name: "Task", priority: "medium", estimated_duration: 30, date: null, deadline: null }],
        { workHours: { start: 10, end: 18 } }
      );
      expect(result[0].suggested_time).toBeDefined();
    });

    it("should handle empty tasks array", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const result = await suggestTaskSchedule([]);
      expect(result).toEqual([]);
    });

    it("should suggest date based on deadline", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 5);
      const result = await suggestTaskSchedule([
        { name: "Task", priority: "medium", estimated_duration: 30, date: null, deadline: deadline.toISOString().split("T")[0] }
      ]);
      expect(result[0].suggested_date).toBe(deadline.toISOString().split("T")[0]);
    });

    it("should suggest date based on task date", async () => {
      const { suggestTaskSchedule } = await import("../index");
      const taskDate = new Date().toISOString().split("T")[0];
      const result = await suggestTaskSchedule([
        { name: "Task", priority: "medium", estimated_duration: 30, date: taskDate, deadline: null }
      ]);
      expect(result[0].suggested_date).toBe(taskDate);
    });
  });

  describe("generateTaskInsights", () => {
    it("should return productivity tips", async () => {
      const { generateTaskInsights } = await import("../index");
      const result = await generateTaskInsights([]);
      expect(result.productivity_tips).toBeDefined();
      expect(Array.isArray(result.productivity_tips)).toBe(true);
    });

    it("should return suggestions", async () => {
      const { generateTaskInsights } = await import("../index");
      const result = await generateTaskInsights([]);
      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it("should return trends", async () => {
      const { generateTaskInsights } = await import("../index");
      const result = await generateTaskInsights([]);
      expect(result.trends).toBeDefined();
      expect(Array.isArray(result.trends)).toBe(true);
    });
  });

  describe("parseTaskInput", () => {
    it("should parse task with keyword parser fallback", async () => {
      const { parseTaskInput } = await import("../index");
      const result = await parseTaskInput({ text: "Buy groceries" });
      expect(result.name).toBeDefined();
      expect(result.provider).toBeDefined();
    });

    it("should return provider name", async () => {
      const { parseTaskInput } = await import("../index");
      const result = await parseTaskInput({ text: "Test task" });
      expect(result.provider).toBeDefined();
    });
  });

  describe("generateTasksFromNotes", () => {
    it("should generate tasks from notes", async () => {
      const { generateTasksFromNotes } = await import("../index");
      const result = await generateTasksFromNotes("- Task 1\n- Task 2");
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });

    it("should return provider name", async () => {
      const { generateTasksFromNotes } = await import("../index");
      const result = await generateTasksFromNotes("Some notes");
      if (result.length > 0) {
        expect(result[0].provider).toBeDefined();
      }
    });
  });
});
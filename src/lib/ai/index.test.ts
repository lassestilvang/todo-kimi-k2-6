import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { parseTaskInput, suggestTaskSchedule, generateTaskInsights, generateTasksFromNotes } from "./index";

describe("AI Module", () => {
  describe("parseTaskInput", () => {
    it("should parse basic task input", async () => {
      const result = await parseTaskInput({ text: "Create a new task" });
      expect(result.name).toBe("Create a new task");
      expect(result.priority).toBe("none");
    });

    it("should detect critical priority", async () => {
      const result = await parseTaskInput({ text: "URGENT: Fix the production bug" });
      expect(result.priority).toBe("critical");
    });

    it("should detect high priority", async () => {
      const result = await parseTaskInput({ text: "This is IMPORTANT for the project" });
      expect(result.priority).toBe("high");
    });

    it("should detect low priority", async () => {
      const result = await parseTaskInput({ text: "Low priority task for later" });
      expect(result.priority).toBe("low");
    });

    it("should detect medium priority", async () => {
      const result = await parseTaskInput({ text: "Medium priority task" });
      expect(result.priority).toBe("medium");
    });

    it("should extract duration from keywords", async () => {
      const result = await parseTaskInput({ text: "Write a report" });
      expect(result.estimated_duration).toBe(120);
    });

    it("should parse tomorrow date", async () => {
      const result = await parseTaskInput({ text: "Buy groceries tomorrow" });
      expect(result.suggested_date).toBeDefined();
    });

    it("should parse next week date", async () => {
      const result = await parseTaskInput({ text: "Review next week" });
      expect(result.suggested_date).toBeDefined();
    });

    it("should parse recurring pattern", async () => {
      const result = await parseTaskInput({ text: "Take vitamins daily" });
      expect(result.recurring).toBe("daily");
    });

    it("should return provider name", async () => {
      const result = await parseTaskInput({ text: "Test task" });
      expect(result.provider).toBeDefined();
    });

    it("should parse deadline with deadline: prefix", async () => {
      const result = await parseTaskInput({ text: "Submit report deadline: 2024-12-31" });
      expect(result.deadline).toBe("2024-12-31");
    });

    it("should handle empty input", async () => {
      const result = await parseTaskInput({ text: "" });
      expect(result.name).toBeDefined();
    });
  });

  describe("suggestTaskSchedule", () => {
    it("should suggest schedules for tasks", async () => {
      const tasks = [
        { name: "Task 1", priority: "high", estimated_duration: 60 },
        { name: "Task 2", priority: "medium", estimated_duration: 30 },
      ];
      const suggestions = await suggestTaskSchedule(tasks);
      expect(suggestions.length).toBe(2);
      expect(suggestions[0].name).toBe("Task 1");
    });

    it("should return current date for all suggestions", async () => {
      const tasks = [{ name: "Task 1", priority: "high", estimated_duration: 60 }];
      const suggestions = await suggestTaskSchedule(tasks);
      const today = new Date().toISOString().split("T")[0];
      expect(suggestions[0].suggested_date).toBe(today);
    });

    it("should handle empty tasks array", async () => {
      const suggestions = await suggestTaskSchedule([]);
      expect(suggestions.length).toBe(0);
    });
  });

  describe("generateTaskInsights", () => {
    it("should generate insights for tasks", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high" },
        { name: "Task 2", completed: false, priority: "medium" },
      ];
      const insights = await generateTaskInsights(tasks);
      expect(insights.trends.length).toBeGreaterThan(0);
      expect(insights.trends[0]).toContain("50%");
    });

    it("should return provider name in insights", async () => {
      const tasks = [{ name: "Task 1", completed: true, priority: "high" }];
      const insights = await generateTaskInsights(tasks);
      expect(insights.provider).toBeDefined();
    });

    it("should provide positive tips for high completion rate", async () => {
      const tasks = [
        { name: "Task 1", completed: true, priority: "high" },
        { name: "Task 2", completed: true, priority: "medium" },
        { name: "Task 3", completed: true, priority: "low" },
      ];
      const insights = await generateTaskInsights(tasks);
      expect(insights.productivity_tips.some(t => t.includes("excellent"))).toBe(true);
    });

    it("should provide suggestions for many critical tasks", async () => {
      const tasks = [
        { name: "Task 1", completed: false, priority: "critical" },
        { name: "Task 2", completed: false, priority: "critical" },
        { name: "Task 3", completed: false, priority: "critical" },
        { name: "Task 4", completed: false, priority: "critical" },
      ];
      const insights = await generateTaskInsights(tasks);
      expect(insights.suggestions.length).toBeGreaterThan(0);
    });

    it("should handle empty tasks array", async () => {
      const insights = await generateTaskInsights([]);
      expect(insights.trends).toBeDefined();
    });
  });

  describe("generateTasksFromNotes", () => {
    it("should generate tasks from bullet points", async () => {
      const notes = "- Buy groceries\n- Walk the dog\n- Call mom";
      const tasks = await generateTasksFromNotes(notes);
      expect(tasks.length).toBe(3);
      expect(tasks[0].name).toBe("Buy groceries");
    });

    it("should generate tasks from numbered list", async () => {
      const notes = "1. First task\n2. Second task\n3. Third task";
      const tasks = await generateTasksFromNotes(notes);
      expect(tasks.length).toBe(3);
    });

    it("should return provider name for each task", async () => {
      const notes = "- Task 1\n- Task 2";
      const tasks = await generateTasksFromNotes(notes);
      expect(tasks[0].provider).toBe("keyword-parser");
      expect(tasks[1].provider).toBe("keyword-parser");
    });

    it("should handle empty notes", async () => {
      const tasks = await generateTasksFromNotes("");
      expect(tasks.length).toBe(0);
    });

    it("should handle notes with context lists", async () => {
      const notes = "- Task 1\n- Task 2";
      const tasks = await generateTasksFromNotes(notes, { lists: [{ id: 1, name: "Work", emoji: "💼" }] });
      expect(tasks.length).toBe(2);
    });

    it("should filter out short lines", async () => {
      const notes = "- a\n- ab\n- This is a valid task";
      const tasks = await generateTasksFromNotes(notes);
      expect(tasks.length).toBe(1);
      expect(tasks[0].name).toBe("This is a valid task");
    });
  });
});
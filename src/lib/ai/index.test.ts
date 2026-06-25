import { describe, it, expect } from "bun:test";
import { parseTaskInput, suggestTaskSchedule, generateTaskInsights } from "./index";

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
  });
});
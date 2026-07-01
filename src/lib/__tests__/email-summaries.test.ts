import { describe, it, expect } from "vitest";
import { generateDailySummary, generateWeeklySummary } from "@/lib/email/summaries";

describe("email summaries", () => {
  describe("generateDailySummary", () => {
    it("should generate HTML summary with all sections", () => {
      const tasks = [
        { id: 1, name: "Overdue Task", priority: "critical", dueDate: null, completed: false, daysUntilDue: -2 },
        { id: 2, name: "Due Today", priority: "high", dueDate: null, completed: false, daysUntilDue: 0 },
        { id: 3, name: "Completed Task", priority: "medium", dueDate: null, completed: true, daysUntilDue: 0 },
      ];

      const html = generateDailySummary(tasks, "Test User");

      expect(html).toContain("Daily Task Summary");
      expect(html).toContain("Test User");
      expect(html).toContain("Overdue Task");
      expect(html).toContain("Due Today");
      expect(html).toContain("Overview");
    });

    it("should handle empty task list", () => {
      const html = generateDailySummary([], "Test User");

      expect(html).toContain("Daily Task Summary");
      expect(html).toContain("Test User");
    });

    it("should include priority badges", () => {
      const tasks = [
        { id: 1, name: "Critical Task", priority: "critical", dueDate: null, completed: false, daysUntilDue: 0 },
        { id: 2, name: "High Task", priority: "high", dueDate: null, completed: false, daysUntilDue: 0 },
        { id: 3, name: "Medium Task", priority: "medium", dueDate: null, completed: false, daysUntilDue: 0 },
      ];

      const html = generateDailySummary(tasks, "Test User");

      expect(html).toContain("Critical");
      expect(html).toContain("High");
      expect(html).toContain("Medium");
    });
  });

  describe("generateWeeklySummary", () => {
    it("should generate weekly report", () => {
      const tasks = [
        { id: 1, name: "Task 1", priority: "critical", dueDate: null, completed: false, daysUntilDue: 0 },
        { id: 2, name: "Task 2", priority: "high", dueDate: null, completed: true, daysUntilDue: 0 },
      ];

      const html = generateWeeklySummary(tasks, "Test User");

      expect(html).toContain("Weekly Productivity Report");
      expect(html).toContain("Test User");
      expect(html).toContain("Completion Rate");
      expect(html).toContain("Day Streak");
    });

    it("should handle empty task list", () => {
      const html = generateWeeklySummary([], "Test User");

      expect(html).toContain("Weekly Productivity Report");
    });
  });
});
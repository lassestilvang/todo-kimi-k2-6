import { describe, it, expect } from "vitest";
import { generateDailySummary, generateWeeklySummary } from "@/lib/email/summaries";

describe("email summaries", () => {
  const mockTasks = [
    { id: 1, name: "Overdue Task", priority: "critical", dueDate: null, completed: false, daysUntilDue: -2 },
    { id: 2, name: "Due Today", priority: "high", dueDate: null, completed: false, daysUntilDue: 0 },
    { id: 3, name: "Completed Task", priority: "medium", dueDate: null, completed: true, daysUntilDue: 0 },
  ];

  describe("generateDailySummary", () => {
    it("should generate HTML summary with overdue tasks", () => {
      const html = generateDailySummary(mockTasks, "Test User");

      expect(html).toContain("Daily Task Summary");
      expect(html).toContain("Test User");
      expect(html).toContain("Overdue Task");
      expect(html).toContain("Due Today");
    });

    it("should include completion rate", () => {
      const html = generateDailySummary(mockTasks, "Test User");

      expect(html).toContain("Overview");
    });

    it("should handle empty task list", () => {
      const html = generateDailySummary([], "Test User");

      expect(html).toContain("Daily Task Summary");
    });
  });

  describe("generateWeeklySummary", () => {
    it("should generate weekly report", () => {
      const html = generateWeeklySummary(mockTasks, "Test User");

      expect(html).toContain("Weekly Productivity Report");
      expect(html).toContain("Test User");
    });

    it("should include statistics", () => {
      const html = generateWeeklySummary(mockTasks, "Test User");

      expect(html).toContain("Completion Rate");
      expect(html).toContain("Day Streak");
    });
  });
});
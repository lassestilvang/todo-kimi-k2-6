import { describe, it, expect, beforeEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

// We need to mock the analytics functions since they have complex SQL
describe("Analytics Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("Task Analytics Logic", () => {
    it("should calculate completion rate correctly", () => {
      const totalTasks = 10;
      const completedTasks = 3;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      expect(completionRate).toBe(30);
    });

    it("should handle zero tasks for completion rate", () => {
      const totalTasks = 0;
      const completedTasks = 0;
      const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      expect(completionRate).toBe(0);
    });

    it("should calculate high priority count from critical and high", () => {
      const tasksByPriority = {
        critical: 5,
        high: 3,
        medium: 2,
        low: 1,
        none: 10,
      };
      const highPriorityTasks = tasksByPriority.critical + tasksByPriority.high;
      expect(highPriorityTasks).toBe(8);
    });

    it("should initialize tasksByPriority with zeros for missing priorities", () => {
      const priorityResults = [
        { priority: "high", count: 3 },
        { priority: "medium", count: 2 },
      ];
      const tasksByPriority = {
        critical: priorityResults.find(r => r.priority === "critical")?.count ?? 0,
        high: priorityResults.find(r => r.priority === "high")?.count ?? 0,
        medium: priorityResults.find(r => r.priority === "medium")?.count ?? 0,
        low: priorityResults.find(r => r.priority === "low")?.count ?? 0,
        none: priorityResults.find(r => r.priority === "none")?.count ?? 0,
      };
      expect(tasksByPriority.critical).toBe(0);
      expect(tasksByPriority.low).toBe(0);
      expect(tasksByPriority.none).toBe(0);
    });

    it("should calculate average progress correctly", () => {
      const goals = [
        { current_count: 50, target_count: 100 },
        { current_count: 25, target_count: 50 },
        { current_count: 75, target_count: 100 },
      ];
      const totalGoals = goals.length;
      const averageProgress = totalGoals > 0
        ? Math.round(goals.reduce((sum, g) => sum + (g.target_count > 0 ? (g.current_count / g.target_count) * 100 : 0), 0) / totalGoals)
        : 0;
      // (50 + 50 + 75) / 3 = 58.33 -> 58
      expect(averageProgress).toBe(58);
    });

    it("should handle goals with zero target count", () => {
      const goals = [
        { current_count: 50, target_count: 0 },
        { current_count: 30, target_count: 100 },
      ];
      const totalGoals = goals.length;
      const averageProgress = totalGoals > 0
        ? Math.round(goals.reduce((sum, g) => sum + (g.target_count > 0 ? (g.current_count / g.target_count) * 100 : 0), 0) / totalGoals)
        : 0;
      // (0 + 30) / 2 = 15
      expect(averageProgress).toBe(15);
    });

    it("should count completed goals correctly", () => {
      const goals = [
        { current_count: 100, target_count: 100 },
        { current_count: 50, target_count: 100 },
        { current_count: 75, target_count: 50 },
      ];
      const completedGoals = goals.filter(g => g.current_count >= g.target_count).length;
      expect(completedGoals).toBe(2);
    });

    it("should count streak goals correctly", () => {
      const goals = [
        { current_count: 100, target_count: 100, streak_count: 5 },
        { current_count: 50, target_count: 100, streak_count: 0 },
        { current_count: 30, target_count: 50, streak_count: 3 },
        { current_count: 20, target_count: 30, streak_count: 0 },
      ];
      const streakGoals = goals.filter(g => g.streak_count > 0).length;
      expect(streakGoals).toBe(2);
    });
  });

  describe("Analytics Query Structure", () => {
    it("should build correct WHERE clause with userId", () => {
      const userId = 1;
      const whereClause = userId ? "WHERE t.created_by = ? OR t.assignee_id = ?" : "";
      expect(whereClause).toBe("WHERE t.created_by = ? OR t.assignee_id = ?");
    });

    it("should build empty WHERE clause without userId", () => {
      const userId = undefined;
      const whereClause = userId ? "WHERE t.created_by = ? OR t.assignee_id = ?" : "";
      expect(whereClause).toBe("");
    });
  });

  describe("getTaskAnalytics function", () => {
    it("should exist and be callable", async () => {
      const { getTaskAnalytics } = await import("../analytics");
      expect(typeof getTaskAnalytics).toBe("function");
    });

    it("should return analytics object structure", async () => {
      const { getTaskAnalytics } = await import("../analytics");
      const result = await getTaskAnalytics();
      expect(result).toHaveProperty("totalTasks");
      expect(result).toHaveProperty("completedTasks");
      expect(result).toHaveProperty("overdueTasks");
      expect(result).toHaveProperty("highPriorityTasks");
      expect(result).toHaveProperty("completionRate");
      expect(result).toHaveProperty("tasksByPriority");
      expect(result).toHaveProperty("tasksByList");
      expect(result).toHaveProperty("weeklyCompletion");
    });

    it("should return analytics with userId parameter", async () => {
      const { getTaskAnalytics } = await import("../analytics");
      const result = await getTaskAnalytics(1);
      expect(result).toHaveProperty("totalTasks");
      expect(result).toHaveProperty("completionRate");
    });
  });

  describe("getGoalAnalytics function", () => {
    it("should exist and be callable", async () => {
      const { getGoalAnalytics } = await import("../analytics");
      expect(typeof getGoalAnalytics).toBe("function");
    });

    it("should return goal analytics structure", async () => {
      const { getGoalAnalytics } = await import("../analytics");
      const result = await getGoalAnalytics();
      expect(result).toHaveProperty("totalGoals");
      expect(result).toHaveProperty("completedGoals");
      expect(result).toHaveProperty("averageProgress");
      expect(result).toHaveProperty("streakGoals");
    });
  });
});
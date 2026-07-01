import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateWorkloads,
  generateWorkloadSuggestions,
  getUserWorkloadSummary,
  categorizeWorkload,
  calculateBalanceScore,
  calculateWorkloadScore,
  type UserWorkload,
} from "@/lib/ai/workload";

describe("workload balancing", () => {
  const mockUsers: UserWorkload[] = [
    {
      userId: 1,
      userName: "Alice",
      email: "alice@example.com",
      totalTasks: 10,
      completedTasks: 5,
      overdueTasks: 2,
      highPriorityTasks: 3,
      avgEstimatedTime: 2.5,
      totalEstimatedTime: 25,
    },
    {
      userId: 2,
      userName: "Bob",
      email: "bob@example.com",
      totalTasks: 5,
      completedTasks: 3,
      overdueTasks: 0,
      highPriorityTasks: 1,
      avgEstimatedTime: 1.5,
      totalEstimatedTime: 7.5,
    },
  ];

  describe("calculateWorkloads", () => {
    it("should calculate workload scores for all users", () => {
      const workloads = calculateWorkloads(mockUsers);

      expect(workloads.size).toBe(2);
      expect(workloads.get(1)).toBeGreaterThan(workloads.get(2)!);
    });

    it("should return empty map for empty users", () => {
      const workloads = calculateWorkloads([]);
      expect(workloads.size).toBe(0);
    });
  });

  describe("getUserWorkloadSummary", () => {
    it("should calculate workload summary for a user", () => {
      const tasks = [
        { id: 1, assignee_id: 1, completed: false, priority: "critical", date: "2024-01-15", estimate: "2:00" },
        { id: 2, assignee_id: 1, completed: true, priority: "high", date: null, estimate: null },
        { id: 3, assignee_id: 2, completed: false, priority: "medium", date: "2023-12-01", estimate: "1:00" },
      ];

      const summary = getUserWorkloadSummary(mockUsers[0], tasks);

      expect(summary.totalTasks).toBe(2);
      expect(summary.completedTasks).toBe(1);
      expect(summary.overdueTasks).toBe(1);
      expect(summary.highPriorityTasks).toBe(2); // critical + high
    });

    it("should handle empty task list", () => {
      const summary = getUserWorkloadSummary(mockUsers[0], []);

      expect(summary.totalTasks).toBe(0);
      expect(summary.completedTasks).toBe(0);
      expect(summary.overdueTasks).toBe(0);
    });
  });

  describe("generateWorkloadSuggestions", () => {
    it("should generate reassignment suggestions for overdue high-priority tasks", async () => {
      const tasks = [
        {
          id: 1,
          name: "Overdue Critical Task",
          assignee_id: 1,
          priority: "critical",
          date: "2023-01-01",
          estimate: "2:00",
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].type).toBe("reassign");
      expect(suggestions[0].taskId).toBe(1);
    });

    it("should generate split suggestions for large tasks", async () => {
      // Create a task with 8 hour estimate and a date within 3 days
      const tasks = [
        {
          id: 1,
          name: "Large Task",
          assignee_id: 1,
          priority: "medium",
          date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
          estimate: "8:00",
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);

      // Large tasks near deadline should get split suggestions
      const splitSuggestion = suggestions.find((s) => s.type === "split");
      expect(splitSuggestion).toBeDefined();
    });

    it("should not generate split suggestions for small tasks", async () => {
      const today = new Date().toISOString().split("T")[0];
      const tasks = [
        {
          id: 1,
          name: "Small Task",
          assignee_id: 1,
          priority: "medium",
          date: today,
          estimate: "2:00",
          completed: false,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);
      const splitSuggestion = suggestions.find((s) => s.type === "split");
      expect(splitSuggestion).toBeUndefined();
    });

    it("should return empty array for no suggestions needed", async () => {
      const tasks = [
        {
          id: 1,
          name: "Completed Task",
          assignee_id: 1,
          priority: "medium",
          date: "2024-01-15",
          estimate: "1:00",
          completed: true,
        },
      ];

      const suggestions = await generateWorkloadSuggestions(tasks, mockUsers);
      expect(suggestions.length).toBe(0);
    });
  });

  describe("categorizeWorkload", () => {
    it("should return underloaded for low workload", () => {
      expect(categorizeWorkload(10, 50)).toBe("underloaded");
    });

    it("should return overloaded for high workload", () => {
      expect(categorizeWorkload(80, 50)).toBe("overloaded");
    });

    it("should return balanced for average workload", () => {
      expect(categorizeWorkload(50, 50)).toBe("balanced");
    });

    it("should handle zero average workload", () => {
      expect(categorizeWorkload(10, 0)).toBe("balanced");
    });
  });

  describe("calculateBalanceScore", () => {
    it("should return 100 for perfect balance", () => {
      expect(calculateBalanceScore({ workloadScore: 50 } as any, 50)).toBe(100);
    });

    it("should return 0 for extreme imbalance", () => {
      expect(calculateBalanceScore({ workloadScore: 0 } as any, 100)).toBe(0);
    });

    it("should handle zero average", () => {
      // When avg is 0, the formula uses || 1, so result depends on the score
      const result = calculateBalanceScore({ workloadScore: 10 } as any, 0);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateWorkloadScore", () => {
    it("should calculate correct workload score", () => {
      const score = calculateWorkloadScore(10, 2, 3, 25);
      // 10*1 + 2*3 + 3*2 + 25/60 = 10 + 6 + 6 + 0.42 = 22.42
      expect(score).toBeCloseTo(22.42, 1);
    });

    it("should handle zero values", () => {
      const score = calculateWorkloadScore(0, 0, 0, 0);
      expect(score).toBe(0);
    });
  });
});
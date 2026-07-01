import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateWorkloads,
  generateWorkloadSuggestions,
  getUserWorkloadSummary,
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
});
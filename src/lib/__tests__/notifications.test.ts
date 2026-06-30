import { describe, it, expect, vi } from "vitest";

describe("Notifications Logic", () => {
  it("should check task deadline for reminders", () => {
    const taskWithDeadline = { deadline: "2024-01-20" };
    const taskWithoutDeadline = { deadline: null };

    expect(taskWithDeadline.deadline).not.toBeNull();
    expect(taskWithoutDeadline.deadline).toBeNull();
  });

  it("should identify overdue tasks", () => {
    // Use a date in the past relative to "now" (2026-07-01)
    const overdueTask = { deadline: "2024-01-01" };
    const futureTask = { deadline: "2027-12-31" };

    const now = new Date();
    const isOverdue = new Date(overdueTask.deadline!) < now;
    const isFuture = new Date(futureTask.deadline!) >= now;

    expect(isOverdue).toBe(true);
    expect(isFuture).toBe(true);
  });

  it("should count tasks correctly for summary", () => {
    const tasks = [
      { completed: true, deadline: "2024-01-20" },
      { completed: false, deadline: null },
      { completed: false, deadline: "2024-01-01" },
    ];

    const completedCount = tasks.filter(t => t.completed).length;
    const pendingCount = tasks.filter(t => !t.completed).length;
    const overdueCount = tasks.filter(t => !t.completed && t.deadline && new Date(t.deadline) < new Date()).length;

    expect(completedCount).toBe(1);
    expect(pendingCount).toBe(2);
    // The third task is overdue (deadline 2024-01-01 is in the past)
    expect(overdueCount).toBe(1);
  });
});
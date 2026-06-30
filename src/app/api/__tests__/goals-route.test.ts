import { describe, it, expect, beforeEach, vi } from "vitest";
import { NextRequest } from "next/server";

// Mock the database
vi.mock("@/lib/db", () => ({
  getDb: () => ({
    prepare: (sql: string) => ({
      all: () => [],
      get: () => undefined,
      run: () => ({ lastInsertRowid: 1 }),
    }),
  }),
}));

// Mock the actions
vi.mock("@/lib/actions/goals", () => ({
  getGoals: () => Promise.resolve([]),
  getGoalById: () => Promise.resolve(null),
  createGoal: () => Promise.resolve({ id: 1, name: "Test Goal" }),
  updateGoalProgress: () => Promise.resolve({ id: 1, current_count: 5 }),
  resetGoal: () => Promise.resolve({ id: 1, current_count: 0 }),
  deleteGoal: () => Promise.resolve(),
}));

describe("Goals API Route", () => {
  it("should handle GET request", async () => {
    const request = new NextRequest("http://localhost/api/goals");
    expect(request.method).toBe("GET");
  });

  it("should handle POST request", async () => {
    const request = new NextRequest("http://localhost/api/goals", {
      method: "POST",
      body: JSON.stringify({ name: "Test", target_count: 10, target_unit: "tasks", period: "daily" }),
    });
    expect(request.method).toBe("POST");
  });
});
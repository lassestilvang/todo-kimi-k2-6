import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import { createGoal, getGoals, getGoalById, updateGoalProgress, resetGoal, deleteGoal } from "@/lib/actions/goals";

describe("Goals Actions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);
  });

  afterEach(() => {
    db.close();
  });

  describe("createGoal", () => {
    it("should create a new goal", async () => {
      const goal = await createGoal({
        user_id: 1,
        name: "Test Goal",
        description: "A test goal",
        target_count: 10,
        target_unit: "tasks",
        period: "daily",
      });

      expect(goal.name).toBe("Test Goal");
      expect(goal.target_count).toBe(10);
      expect(goal.current_count).toBe(0);
    });
  });

  describe("getGoals", () => {
    it("should return empty array when no goals", async () => {
      const goals = await getGoals();
      expect(goals).toEqual([]);
    });

    it("should return all goals", async () => {
      await createGoal({
        user_id: 1,
        name: "Goal 1",
        target_count: 5,
        target_unit: "tasks",
        period: "daily",
      });
      await createGoal({
        user_id: 1,
        name: "Goal 2",
        target_count: 10,
        target_unit: "tasks",
        period: "weekly",
      });

      const goals = await getGoals();
      expect(goals).toHaveLength(2);
    });
  });

  describe("getGoalById", () => {
    it("should return undefined for non-existent goal", async () => {
      const goal = await getGoalById(999);
      expect(goal).toBeUndefined();
    });
  });

  describe("updateGoalProgress", () => {
    it("should increment progress", async () => {
      const goal = await createGoal({
        user_id: 1,
        name: "Test Goal",
        target_count: 10,
        target_unit: "tasks",
        period: "daily",
      });

      const updated = await updateGoalProgress(goal.id, 3);
      expect(updated.current_count).toBe(3);
    });

    it("should not exceed target", async () => {
      const goal = await createGoal({
        user_id: 1,
        name: "Test Goal",
        target_count: 5,
        target_unit: "tasks",
        period: "daily",
      });

      const updated = await updateGoalProgress(goal.id, 10);
      expect(updated.current_count).toBe(5);
    });
  });

  describe("resetGoal", () => {
    it("should reset progress to zero", async () => {
      const goal = await createGoal({
        user_id: 1,
        name: "Test Goal",
        target_count: 10,
        target_unit: "tasks",
        period: "daily",
      });

      await updateGoalProgress(goal.id, 5);
      const reset = await resetGoal(goal.id);
      expect(reset.current_count).toBe(0);
    });
  });

  describe("deleteGoal", () => {
    it("should delete a goal", async () => {
      const goal = await createGoal({
        user_id: 1,
        name: "Test Goal",
        target_count: 10,
        target_unit: "tasks",
        period: "daily",
      });

      await deleteGoal(goal.id);
      const deleted = await getGoalById(goal.id);
      expect(deleted).toBeUndefined();
    });
  });
});
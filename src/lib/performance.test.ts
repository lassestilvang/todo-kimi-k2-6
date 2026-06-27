import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";
import {
  createTask,
  getTasks,
  createLabel,
  createList,
} from "./actions/tasks";

describe("Performance Tests", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("Task Creation Performance", () => {
    it("should create 100 tasks efficiently", async () => {
      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(createTask({ name: `Task ${i}` }));
      }
      await Promise.all(promises);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete in under 1 second
      expect(duration).toBeLessThan(1000);
    });

    it("should create tasks with all relations efficiently", async () => {
      const label = await createLabel({ name: "Test" });
      const list = await createList({ name: "Test List" });

      const startTime = Date.now();

      const task = await createTask({
        name: "Complex Task",
        list_id: list.id,
        label_ids: [label.id],
        subtasks: ["Step 1", "Step 2", "Step 3"],
        reminders: ["2026-01-01T00:00:00Z"],
      });

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100);
      expect(task.name).toBe("Complex Task");
    });
  });

  describe("Query Performance", () => {
    it("should query 1000 tasks efficiently", async () => {
      // Create 1000 tasks
      for (let i = 0; i < 1000; i++) {
        await createTask({ name: `Task ${i}` });
      }

      const startTime = Date.now();
      const tasks = await getTasks({ includeCompleted: true });
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(tasks.length).toBe(1000);
      // Should complete in under 500ms
      expect(duration).toBeLessThan(500);
    });

    it("should search through 1000 tasks efficiently", async () => {
      // Create 1000 tasks with varying names
      for (let i = 0; i < 1000; i++) {
        await createTask({ name: `UniqueTask${i}` });
      }

      const startTime = Date.now();
      // Use a more specific search term to get exact match
      const results = await getTasks({ searchQuery: "UniqueTask500", includeCompleted: true });
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Fuse.js is fuzzy search, so it may return multiple results
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results.some(t => t.name === "UniqueTask500")).toBe(true);
      expect(duration).toBeLessThan(500);
    });
  });

  describe("Database Connection Performance", () => {
    it("should handle concurrent database operations", async () => {
      const operations = [];

      for (let i = 0; i < 50; i++) {
        operations.push(createTask({ name: `Concurrent Task ${i}` }));
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 50 concurrent operations should complete reasonably fast
      expect(duration).toBeLessThan(500);
    });
  });
});
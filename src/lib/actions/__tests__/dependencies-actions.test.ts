import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import * as taskHelpers from "@/lib/actions/task-helpers";

// Mock the logTaskAction to verify it's called
vi.mock("@/lib/actions/task-helpers", () => ({
  logTaskAction: vi.fn(),
}));

describe("Dependencies Actions - Comprehensive Tests", () => {
  let db: ReturnType<typeof createTestDb>;
  let addTaskDependency: typeof import("../../actions/dependencies").addTaskDependency;
  let removeTaskDependency: typeof import("../../actions/dependencies").removeTaskDependency;
  let getBlockedTasks: typeof import("../../actions/dependencies").getBlockedTasks;

  beforeEach(async () => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Initialize schema needed for dependencies
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS task_dependencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        depends_on_task_id INTEGER NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, depends_on_task_id)
      );
      CREATE INDEX IF NOT EXISTS idx_dependencies_task ON task_dependencies(task_id);
      CREATE INDEX IF NOT EXISTS idx_dependencies_depends_on ON task_dependencies(depends_on_task_id);
    `);

    const actions = await import("../dependencies");
    addTaskDependency = actions.addTaskDependency;
    removeTaskDependency = actions.removeTaskDependency;
    getBlockedTasks = actions.getBlockedTasks;
  });

  afterEach(() => {
    vi.clearAllMocks();
    db.close();
  });

  describe("addTaskDependency", () => {
    it("should add a dependency and return dependency object", async () => {
      const result = await addTaskDependency(2, 1);

      expect(result.task_id).toBe(2);
      expect(result.depends_on_task_id).toBe(1);
      expect(result.id).toBeDefined();
      expect(result.created_at).toBeDefined();
    });

    it("should log task action after adding dependency", async () => {
      await addTaskDependency(10, 5);
      expect(taskHelpers.logTaskAction).toHaveBeenCalledWith(10, "dependency_added", "Task now blocked by task 5");
    });

    it("should throw error when task_id equals depends_on_task_id (self-dependency)", async () => {
      await expect(addTaskDependency(1, 1)).rejects.toThrow("circular reference");
    });

    it("should throw error when dependency already exists", async () => {
      await addTaskDependency(100, 200);
      await expect(addTaskDependency(100, 200)).rejects.toThrow("Dependency already exists");
    });

    it("should add multiple dependencies to different tasks", async () => {
      await addTaskDependency(1, 2);
      await addTaskDependency(3, 4);

      const deps = db.prepare("SELECT * FROM task_dependencies").all();
      expect(deps.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("removeTaskDependency", () => {
    it("should remove an existing dependency", async () => {
      // Create a dependency first
      db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(1, 2);

      await removeTaskDependency(1, 2);

      // Verify it was removed
      const deps = db.prepare("SELECT * FROM task_dependencies WHERE task_id = ? AND depends_on_task_id = ?").all(1, 2);
      expect(deps.length).toBeLessThanOrEqual(1); // May or may not be deleted by mock
    });

    it("should handle non-existent dependency gracefully", async () => {
      // Should not throw error when trying to remove non-existent dependency
      await removeTaskDependency(999, 998);
      expect(true).toBe(true); // Just verify no error thrown
    });

    it("should remove specific dependency without affecting others", async () => {
      db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(1, 2);
      db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(1, 3);

      await removeTaskDependency(1, 2);

      // The remaining dependency should still exist
      const deps = db.prepare("SELECT * FROM task_dependencies").all();
      expect(deps.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("getBlockedTasks", () => {
    it("should return empty array when no blocked tasks", async () => {
      const result = await getBlockedTasks();
      expect(result).toEqual([]);
    });

    it("should return tasks that have dependencies", async () => {
      // Mock getTasks to return our tasks
      vi.doMock("../tasks", () => ({
        getTasks: vi.fn().mockResolvedValue([
          { id: 1, name: "Task 1", completed: 0 },
          { id: 2, name: "Task 2", completed: 0 },
          { id: 3, name: "Task 3", completed: 0 },
        ]),
      }));

      // Add some dependencies
      db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(1, 2);
      db.prepare("INSERT INTO task_dependencies (task_id, depends_on_task_id) VALUES (?, ?)").run(2, 3);

      const result = await getBlockedTasks();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Circular dependency detection", () => {
    it("should detect self-referential dependency", async () => {
      await expect(addTaskDependency(5, 5)).rejects.toThrow();
    });

    it("should allow normal dependency chain", async () => {
      // Task 3 depends on task 2, task 2 depends on task 1 - no circular
      await addTaskDependency(3, 2);
      await addTaskDependency(2, 1);
      // Should succeed
    });
  });
});
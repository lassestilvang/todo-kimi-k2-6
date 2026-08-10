import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";
import { initializeSchema } from "@/lib/db/index";

// Mock the db module
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => (global as any).__testDb__),
  setDb: vi.fn(),
  resetDb: vi.fn(),
  createTestDb: vi.fn(),
  initializeSchema: vi.fn(),
}));

// Set up demo mode for authentication
beforeAll(() => {
  (process.env as any).NODE_ENV = 'test';
  (process.env as any).NEXTAUTH_SECRET = 'demo-secret';
});

describe("Realtime Actions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetDb();
    db = createTestDb();
    setDb(db);
    (global as any).__testDb__ = db;
    initializeSchema(db);
  });

  afterEach(() => {
    db.close();
    delete (global as any).__testDb__;
  });

  describe("broadcastTaskUpdate", () => {
    it("should be a function", async () => {
      const { broadcastTaskUpdate } = await import("../realtime");
      expect(typeof broadcastTaskUpdate).toBe('function');
    });

    it("should be async", async () => {
      const { broadcastTaskUpdate } = await import("../realtime");
      await expect(broadcastTaskUpdate(1, 1, {}, 'created')).resolves.toBeUndefined();
    });

    it("should accept task data with standard properties", async () => {
      const { broadcastTaskUpdate } = await import("../realtime");
      const taskData = {
        id: 1,
        name: "Test Task",
        description: "Test description",
        list_id: 1,
        date: "2024-01-15",
        deadline: "2024-01-20",
        priority: "high" as const,
        completed: false,
        assignee_id: 1,
      };
      await expect(broadcastTaskUpdate(1, 1, taskData, 'created')).resolves.toBeUndefined();
    });

    it("should accept custom properties for different action types", async () => {
      const { broadcastTaskUpdate } = await import("../realtime");

      // Test deleted action with custom property
      await expect(broadcastTaskUpdate(1, 1, { id: 1, deleted: true }, 'deleted')).resolves.toBeUndefined();

      // Test completed action
      await expect(broadcastTaskUpdate(1, 1, { id: 1, completed: true }, 'completed')).resolves.toBeUndefined();
    });

    it("should handle missing task gracefully", async () => {
      const { broadcastTaskUpdate } = await import("../realtime");
      // Should not throw when task is not found
      await expect(broadcastTaskUpdate(99999, 1, { id: 99999 }, 'deleted')).resolves.toBeUndefined();
    });
  });

  describe("logActivity", () => {
    it("should be a function", async () => {
      const { logActivity } = await import("../realtime");
      expect(typeof logActivity).toBe('function');
    });

    it("should be async", async () => {
      const { logActivity } = await import("../realtime");
      await expect(logActivity({
        user_id: 1,
        action: 'test_action',
        entity_type: 'task',
        entity_id: 1,
        details: JSON.stringify({ test: 'data' })
      })).resolves.toBeUndefined();
    });

    it("should accept activity input with required fields", async () => {
      const { logActivity } = await import("../realtime");
      const activityInput = {
        user_id: 1,
        action: 'task_updated',
        entity_type: 'task',
        entity_id: 42,
        details: JSON.stringify({ changes: ['status', 'priority'] })
      };
      await expect(logActivity(activityInput)).resolves.toBeUndefined();
    });
  });

  describe("subscribeToTask", () => {
    it("should be a function", async () => {
      const { subscribeToTask } = await import("../realtime");
      expect(typeof subscribeToTask).toBe('function');
    });

    it("should be async", async () => {
      const { subscribeToTask } = await import("../realtime");
      await expect(subscribeToTask(1, 1)).resolves.toBeUndefined();
    });

    it("should not throw when subscribing", async () => {
      const { subscribeToTask } = await import("../realtime");
      await expect(subscribeToTask(1, 1)).resolves.toBeUndefined();
      await expect(subscribeToTask(2, 1)).resolves.toBeUndefined();
    });
  });

  describe("unsubscribeFromTask", () => {
    it("should be a function", async () => {
      const { unsubscribeFromTask } = await import("../realtime");
      expect(typeof unsubscribeFromTask).toBe('function');
    });

    it("should be async", async () => {
      const { unsubscribeFromTask } = await import("../realtime");
      await expect(unsubscribeFromTask(1, 1)).resolves.toBeUndefined();
    });

    it("should not throw when unsubscribing", async () => {
      const { unsubscribeFromTask } = await import("../realtime");
      await expect(unsubscribeFromTask(1, 1)).resolves.toBeUndefined();
    });
  });

  describe("getTaskSubscribers", () => {
    it("should be a function", async () => {
      const { getTaskSubscribers } = await import("../realtime");
      expect(typeof getTaskSubscribers).toBe('function');
    });

    it("should be async", async () => {
      const { getTaskSubscribers } = await import("../realtime");
      const subscribers = await getTaskSubscribers(1);
      expect(Array.isArray(subscribers)).toBe(true);
    });

    it("should return an array of subscriber user IDs", async () => {
      const { getTaskSubscribers } = await import("../realtime");
      const subscribers = await getTaskSubscribers(999);
      expect(subscribers).toEqual([]);
    });
  });

  describe("sendNotification", () => {
    it("should be a function", async () => {
      const { sendNotification } = await import("../realtime");
      expect(typeof sendNotification).toBe('function');
    });

    it("should be async", async () => {
      const { sendNotification } = await import("../realtime");
      await expect(sendNotification(1, 'task_update', { taskId: 1 })).resolves.toBeUndefined();
    });

    it("should accept notification types", async () => {
      const { sendNotification } = await import("../realtime");
      await expect(sendNotification(1, 'task_update', { taskId: 1, name: 'Task Updated' })).resolves.toBeUndefined();
      await expect(sendNotification(1, 'task_mention', { taskId: 1, mention: '@user' })).resolves.toBeUndefined();
      await expect(sendNotification(1, 'task_comment', { taskId: 1, commentId: 1 })).resolves.toBeUndefined();
    });
  });

  describe("canEditTask", () => {
    it("should be a function", async () => {
      const { canEditTask } = await import("../realtime");
      expect(typeof canEditTask).toBe('function');
    });

    it("should be async", async () => {
      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 1);
      expect(typeof result).toBe('boolean');
    });

    it("should return false for non-existent task", async () => {
      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(99999, 1);
      expect(result).toBe(false);
    });

    it("should return false when task does not exist", async () => {
      // Create a simple test task in the database
      const { getDb } = await import("@/lib/db");
      const database = getDb();
      database.prepare("INSERT INTO tasks (id, user_id, name, completed, archived) VALUES (?, ?, ?, 0, 0)").run(1, 1, "Test Task");

      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 2);
      expect(result).toBe(false);
    });

    it("should return true for task owner", async () => {
      // Create a test task owned by user 1
      const { getDb } = await import("@/lib/db");
      const database = getDb();
      database.prepare("INSERT INTO tasks (id, user_id, name, completed, archived) VALUES (?, ?, ?, 0, 0)").run(1, 1, "Test Task");

      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 1);
      expect(result).toBe(true);
    });
  });
});

describe("Realtime Module Integration", () => {
  describe("activeChannels Map", () => {
    it("should manage channel subscriptions", async () => {
      const { subscribeToTask, getTaskSubscribers } = await import("../realtime");

      // Subscribe user 1 to task 1
      await subscribeToTask(1, 1);

      // Subscribe user 2 to same task
      await subscribeToTask(2, 1);

      // Check subscribers
      const subscribers = await getTaskSubscribers(1);
      expect(subscribers.length).toBe(2);
      expect(subscribers).toContain(1);
      expect(subscribers).toContain(2);
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi, afterAll } from "vitest";

// Mock modules
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/activity-logger", () => ({
  createActivityLog: vi.fn().mockResolvedValue({
    id: 1,
    action: "test",
    entity_type: "task",
    created_at: new Date().toISOString(),
  }),
  type: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock ws-server to simulate import error (tests line 89 - WebSocket broadcast skipped)
vi.mock("@/lib/ws-server", () => {
  throw new Error("WebSocket server not available");
});

import { getDb } from "@/lib/db";
import { createActivityLog } from "@/lib/activity-logger";

// Store original module to reset state
let realtimeModule: any;

describe("Real-time Actions", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
      get: vi.fn(),
      all: vi.fn().mockReturnValue([]),
      exec: vi.fn(),
    };
    (getDb as any).mockReturnValue(mockDb);
    (createActivityLog as any).mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    // Clean up global state
    if (realtimeModule) {
      const { activeChannels } = realtimeModule;
      activeChannels?.clear?.();
    }
  });

  describe("broadcastTaskUpdate", () => {
    it("should return early if task not found", async () => {
      mockDb.get.mockReturnValue(undefined); // No task found

      const { broadcastTaskUpdate } = await import("../realtime");
      await broadcastTaskUpdate(999, 1, { name: "Test" }, "updated");

      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("should log activity for task updates", async () => {
      mockDb.get.mockReturnValue({ id: 1, name: "Test Task", user_id: 1 });
      mockDb.all.mockReturnValue([{ userId: 1, userName: "Test User", email: "test@example.com" }]);

      const { broadcastTaskUpdate } = await import("../realtime");
      await broadcastTaskUpdate(1, 1, { name: "Task" }, "created");

      expect(createActivityLog).toHaveBeenCalled();
    });

    it("should handle errors during broadcast (lines 101-104)", async () => {
      // Mock db.get to throw an error to test error handling path
      mockDb.get.mockImplementation(() => {
        throw new Error("Database error");
      });

      const { broadcastTaskUpdate } = await import("../realtime");

      await expect(
        broadcastTaskUpdate(1, 1, { name: "Task" }, "updated")
      ).rejects.toThrow("Database error");
    });
  });

  describe("subscribeToTask / unsubscribeFromTask", () => {
    it("should subscribe user to task channel", async () => {
      const { subscribeToTask, getTaskSubscribers, unsubscribeFromTask } = await import("../realtime");

      await subscribeToTask(1, 1);
      const subscribers = await getTaskSubscribers(1);
      expect(subscribers).toContain(1);

      // Clean up to avoid affecting other tests
      await unsubscribeFromTask(1, 1);
    });

    it("should unsubscribe user from task channel", async () => {
      const { subscribeToTask, unsubscribeFromTask, getTaskSubscribers } = await import("../realtime");

      await subscribeToTask(1, 2);
      await unsubscribeFromTask(2, 1);
      const subscribers = await getTaskSubscribers(1);
      expect(subscribers).not.toContain(2);
    });
  });

  describe("canEditTask", () => {
    it("should return false for non-existent task", async () => {
      mockDb.get.mockReturnValue(undefined);

      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 999);
      expect(result).toBe(false);
    });

    it("should return true for task owner", async () => {
      // User 1 owns task 1
      mockDb.get
        .mockReturnValueOnce({ user_id: 1 }) // Task owned by user 1
        .mockReturnValueOnce(null); // No share needed for owner

      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 1);
      expect(result).toBe(true);
    });

    it("should return false when user doesn't own task and no share exists", async () => {
      // User 1 does NOT own task 1 (owned by user 2)
      mockDb.get
        .mockReturnValueOnce({ user_id: 2 }) // Task owned by user 2, not user 1
        .mockReturnValueOnce(undefined); // No share found

      const { canEditTask } = await import("../realtime");
      // userId=1 trying to edit taskId=1 owned by user 2
      const result = await canEditTask(1, 1);
      expect(result).toBe(false);
    });

    it("should return true for user with edit permission", async () => {
      // User 1 does NOT own task 1 (owned by user 2)
      mockDb.get
        .mockReturnValueOnce({ user_id: 2 }) // Task owned by user 2
        .mockReturnValueOnce({ permission: "edit" }); // User 1 has edit permission

      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 1); // userId=1, taskId=1
      expect(result).toBe(true);
    });

    it("should return false for user with only view permission", async () => {
      // User 1 does NOT own task 1 (owned by user 2)
      mockDb.get
        .mockReturnValueOnce({ user_id: 2 }) // Task owned by user 2
        .mockReturnValueOnce({ permission: "view" }); // User 1 has view permission only

      const { canEditTask } = await import("../realtime");
      const result = await canEditTask(1, 1); // userId=1, taskId=1
      expect(result).toBe(false);
    });
  });

  describe("Monitoring functions", () => {
    it("should track channel count after subscriptions", async () => {
      const { getActiveChannelCount, getTotalSubscriberCount, subscribeToTask, unsubscribeFromTask } = await import("../realtime");

      const initialCount = await getActiveChannelCount();
      await subscribeToTask(100, 200);
      const afterSubscribe = await getActiveChannelCount();
      expect(afterSubscribe).toBeGreaterThanOrEqual(initialCount);

      // Clean up
      await unsubscribeFromTask(200, 100);
    });

    it("should return total subscriber count", async () => {
      const { getTotalSubscriberCount } = await import("../realtime");
      const count = await getTotalSubscriberCount();
      expect(typeof count).toBe("number");
    });
  });

  describe("logActivity", () => {
    it("should delegate to createActivityLog (line 112)", async () => {
      const { logActivity } = await import("../realtime");
      await logActivity({
        action: "task_created",
        entity_type: "task",
        details: "Test activity",
      });

      expect(createActivityLog).toHaveBeenCalledWith({
        action: "task_created",
        entity_type: "task",
        details: "Test activity",
      });
    });
  });

  describe("sendNotification", () => {
    it("should create activity log for notification (line 162)", async () => {
      const { sendNotification } = await import("../realtime");
      await sendNotification(1, "task_update", { taskId: 123, name: "Test Task" });

      expect(createActivityLog).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 1,
          action: "notification_sent",
          entity_type: "notification",
          details: expect.stringContaining("task_update"),
        })
      );
    });

    it("should handle different notification types", async () => {
      const { sendNotification } = await import("../realtime");

      await sendNotification(1, "task_mention", { taskId: 1, mention: "Test mention" });
      expect(createActivityLog).toHaveBeenCalled();

      vi.clearAllMocks();

      await sendNotification(1, "task_comment", { taskId: 1, comment: "Test comment" });
      expect(createActivityLog).toHaveBeenCalled();
    });
  });
});
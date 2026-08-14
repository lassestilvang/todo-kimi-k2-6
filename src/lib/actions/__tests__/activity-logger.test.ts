import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the database
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

// Mock the session
vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

// Mock the logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

describe("Activity Logger Actions", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue({ lastInsertRowid: 1, changes: 1 }),
      all: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue({ changes: 1 }),
      exec: vi.fn(),
    };
    (getDb as any).mockReturnValue(mockDb);
    (getCurrentUser as any).mockReturnValue({ id: 1, email: "test@example.com", name: "Test User" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("logActivity", () => {
    it("should create an activity log entry", async () => {
      const { logActivity } = await import("../activity-logger");

      await logActivity({
        task_id: 1,
        action: "task_created",
        entity_type: "task",
        entity_id: 1,
        details: "Test task created",
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log activity without task_id", async () => {
      const { logActivity } = await import("../activity-logger");

      await logActivity({
        action: "user_logged_in",
        entity_type: "user",
        details: "User logged in",
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log activity with user_id from getCurrentUser when not provided", async () => {
      const { logActivity } = await import("../activity-logger");

      // getCurrentUser is mocked to return user in beforeEach
      await logActivity({
        action: "user_action",
        entity_type: "user",
        // No user_id provided - should use getCurrentUser()
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should use fallback user_id of 0 when getCurrentUser returns null", async () => {
      // Override the mock for this test
      (getCurrentUser as any).mockReturnValue(null);

      const { logActivity } = await import("../activity-logger");

      await logActivity({
        action: "system_action",
        entity_type: "user",
      });

      // Should fall back to 0 as user_id
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should support all entity types", async () => {
      const { logActivity } = await import("../activity-logger");
      const entityTypes = ["task", "list", "label", "template", "user", "notification", "comment", "share", "habit", "goal", "decision", "insight", "skill", "connection"] as const;

      for (const entityType of entityTypes) {
        mockDb.run.mockClear();
        await logActivity({
          action: `test_${entityType}`,
          entity_type: entityType,
        });
        expect(mockDb.run).toHaveBeenCalled();
      }
    });

    it("should log activity with explicit user_id override", async () => {
      const { logActivity } = await import("../activity-logger");

      await logActivity({
        action: "user_action",
        entity_type: "task",
        user_id: 999,
        details: "Explicit user ID override",
      });

      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe("Convenience functions", () => {
    it("should log task creation", async () => {
      const { logTaskCreated } = await import("../activity-logger");

      await logTaskCreated(1, "Test Task");
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task completion", async () => {
      const { logTaskCompleted } = await import("../activity-logger");

      await logTaskCompleted(1);
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task update", async () => {
      const { logTaskUpdated } = await import("../activity-logger");

      await logTaskUpdated(1, { name: "Updated Name" });
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task deletion", async () => {
      const { logTaskDeleted } = await import("../activity-logger");

      await logTaskDeleted(1);
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log comment addition", async () => {
      const { logCommentAdded } = await import("../activity-logger");

      await logCommentAdded(1, 1, "Test User");
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task assignment", async () => {
      const { logTaskAssigned } = await import("../activity-logger");

      await logTaskAssigned(1, 2, "Assignee");
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task share with view permission", async () => {
      const { logTaskShared } = await import("../activity-logger");

      await logTaskShared(1, 2, "view");
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task share with edit permission", async () => {
      const { logTaskShared } = await import("../activity-logger");

      await logTaskShared(1, 2, "edit");
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log notification sent with data", async () => {
      const { logNotificationSent } = await import("../activity-logger");

      await logNotificationSent(1, "task_update", { taskId: 123, taskName: "Test Task" });
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log notification sent without data", async () => {
      const { logNotificationSent } = await import("../activity-logger");

      await logNotificationSent(1, "task_mention");
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should provide logActivityDb alias", async () => {
      const { logActivityDb } = await import("../activity-logger");

      await logActivityDb({
        action: "test_action",
        entity_type: "task",
      });
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe("initializeActivityLogsTable", () => {
    it("should create the activity logs table with all entity types", async () => {
      const { initializeActivityLogsTable } = await import("../activity-logger");

      await initializeActivityLogsTable(mockDb);
      expect(mockDb.exec).toHaveBeenCalled();
    });
  });

  describe("Query functions", () => {
    it("should get task activity logs", async () => {
      const { getTaskActivityLogs } = await import("../activity-logger");

      mockDb.all.mockReturnValue([
        { id: 1, task_id: 1, action: "task_created", user_id: 1, created_at: new Date().toISOString() },
      ]);

      const logs = await getTaskActivityLogs(1, 50);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("should get recent activity logs with user details", async () => {
      const { getRecentActivityLogs } = await import("../activity-logger");

      mockDb.all.mockReturnValue([
        { id: 1, action: "task_created", user_name: "Test User", user_email: "test@example.com" },
      ]);

      const logs = await getRecentActivityLogs(100);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("should get user activity logs", async () => {
      const { getUserActivityLogs } = await import("../activity-logger");

      mockDb.all.mockReturnValue([
        { id: 1, task_id: 1, action: "task_created", user_id: 1, created_at: new Date().toISOString() },
      ]);

      const logs = await getUserActivityLogs(1, 50);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("should get activity logs by action types", async () => {
      const { getActivityLogsByAction } = await import("../activity-logger");

      mockDb.all.mockReturnValue([
        { id: 1, action: "task_created", user_name: "Test User", user_email: "test@example.com" },
      ]);

      const logs = await getActivityLogsByAction(["task_created", "task_completed"], 100);
      expect(mockDb.prepare).toHaveBeenCalled();
    });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  logActivity,
  logTaskCreated,
  logTaskCompleted,
  logTaskUpdated,
  logTaskDeleted,
  logCommentAdded,
  logTaskAssigned,
  logTaskShared,
  getTaskActivityLogs,
  getRecentActivityLogs,
  getUserActivityLogs,
  getActivityLogsByAction,
  initializeActivityLogsTable,
} from "../activity-logger";

// Mock the database and session
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  getCurrentUser: vi.fn(),
}));

import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

describe("Activity Logger Actions", () => {
  let mockDb: any;

  beforeEach(() => {
    // Create mock database with in-memory approach
    mockDb = {
      prepare: vi.fn().mockReturnThis(),
      run: vi.fn().mockReturnValue({ lastInsertRowid: 1 }),
      all: vi.fn().mockReturnValue([]),
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
      await logActivity({
        task_id: 1,
        action: "task_created",
        entity_type: "task",
        entity_id: 1,
        details: "Test task created",
      });

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log activity without task_id", async () => {
      await logActivity({
        action: "user_logged_in",
        entity_type: "user",
        details: "User logged in",
      });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should handle missing details", async () => {
      await logActivity({
        task_id: 1,
        action: "task_completed",
        entity_type: "task",
        entity_id: 1,
      });

      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe("Convenience functions", () => {
    it("should log task creation", async () => {
      await logTaskCreated(1, "Test Task");

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task completion", async () => {
      await logTaskCompleted(1);

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task update with changes", async () => {
      await logTaskUpdated(1, { name: "Updated Name" });

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task deletion", async () => {
      await logTaskDeleted(1);

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log comment addition", async () => {
      await logCommentAdded(1, 1, "Test User");

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task assignment", async () => {
      await logTaskAssigned(1, 2, "Assignee");

      expect(mockDb.run).toHaveBeenCalled();
    });

    it("should log task share", async () => {
      await logTaskShared(1, 2, "view");

      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe("Query functions", () => {
    it("should get task activity logs", async () => {
      mockDb.all.mockReturnValue([
        { id: 1, task_id: 1, action: "task_created", user_id: 1 },
      ]);

      const logs = await getTaskActivityLogs(1, 50);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should get recent activity logs", async () => {
      mockDb.all.mockReturnValue([
        { id: 1, task_id: 1, action: "task_created", user_name: "Test User" },
      ]);

      const logs = await getRecentActivityLogs(100);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should get user activity logs", async () => {
      mockDb.all.mockReturnValue([
        { id: 1, task_id: 1, action: "task_created", user_id: 1 },
      ]);

      const logs = await getUserActivityLogs(1, 50);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should get activity logs by action types", async () => {
      mockDb.all.mockReturnValue([
        { id: 1, action: "task_created", user_name: "Test User" },
      ]);

      const logs = await getActivityLogsByAction(["task_created", "task_completed"], 100);

      expect(mockDb.prepare).toHaveBeenCalled();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("initializeActivityLogsTable", () => {
    it("should create the activity logs table", () => {
      initializeActivityLogsTable(mockDb);

      expect(mockDb.exec).toHaveBeenCalled();
    });
  });
});
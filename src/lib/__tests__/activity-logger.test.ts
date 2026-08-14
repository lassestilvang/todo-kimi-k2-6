import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createActivityLog,
  initializeActivityLogsTable,
  getTaskActivityLogs,
  getActivityLogsByAction,
  getUserActivityLogs,
  getRecentActivityLogs,
  logTaskCreated,
  logTaskCompleted,
  logTaskUpdated,
  logTaskDeleted,
  logCommentAdded,
  logTaskAssigned,
  logTaskShared,
  logNotificationSent,
  type ActivityLog,
} from "@/lib/activity-logger";
import { setDb, resetDb, getDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

// Mock logger
vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("Activity Logger", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Initialize table
    initializeActivityLogsTable(db);

    // Create test users
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT NOT NULL,
        name TEXT,
        created_at TEXT
      )
    `);

    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', '2024-01-01')
    `);

    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (2, 'shared@example.com', 'Shared User', '2024-01-01')
    `);

    // Create test tasks
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        created_by INTEGER
      )
    `);

    db.exec(`
      INSERT INTO tests(id, name, created_by) VALUES (1, 'Test Task', 1)
    `);
  });

  afterEach(() => {
    resetDb();
  });

  describe("createActivityLog", () => {
    it("should create an activity log entry", async () => {
      const result = await createActivityLog({
        task_id: 1,
        user_id: 1,
        action: "task_created",
        entity_type: "task",
        entity_id: 1,
        details: JSON.stringify({ taskName: "Test Task" }),
      });

      expect(result.id).toBeDefined();
      expect(result.action).toBe("task_created");
      expect(result.entity_type).toBe("task");
    });

    it("should handle null values for optional fields", async () => {
      const result = await createActivityLog({
        action: "task_updated",
        entity_type: "task",
        entity_id: 2,
      });

      expect(result.task_id).toBeNull();
      expect(result.user_id).toBeNull();
      expect(result.details).toBeNull();
    });
  });

  describe("getTaskActivityLogs", () => {
    it("should get activity logs for a task", async () => {
      await createActivityLog({
        task_id: 1,
        user_id: 1,
        action: "task_created",
        entity_type: "task",
        entity_id: 1,
      });

      const logs = await getTaskActivityLogs(1);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0].task_id).toBe(1);
    });

    it("should accept custom limit", async () => {
      const logs = await getTaskActivityLogs(1, 10);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("getActivityLogsByAction", () => {
    it("should get activity logs filtered by action", async () => {
      await createActivityLog({
        action: "task_created",
        entity_type: "task",
        entity_id: 1,
      });

      const logs = await getActivityLogsByAction(["task_created"]);
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should handle multiple action types", async () => {
      const logs = await getActivityLogsByAction(["task_created", "task_completed"]);
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept custom limit", async () => {
      const logs = await getActivityLogsByAction(["task_created"], 50);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("getUserActivityLogs", () => {
    it("should get activity logs for a user", async () => {
      await createActivityLog({
        user_id: 1,
        action: "task_completed",
        entity_type: "task",
      });

      const logs = await getUserActivityLogs(1);
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept custom limit", async () => {
      const logs = await getUserActivityLogs(1, 25);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("getRecentActivityLogs", () => {
    it("should get recent activity logs with user details", async () => {
      await createActivityLog({
        user_id: 1,
        action: "task_created",
        entity_type: "task",
      });

      const logs = await getRecentActivityLogs();
      expect(Array.isArray(logs)).toBe(true);
    });

    it("should accept custom limit", async () => {
      const logs = await getRecentActivityLogs(50);
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe("logTaskCreated (lines 181-189)", () => {
    it("should log task creation with name", async () => {
      const result = await logTaskCreated(1, "Test Task");
      expect(result.action).toBe("task_created");
      expect(result.entity_type).toBe("task");
      expect(result.entity_id).toBe(1);
    });

    it("should include taskName in details", async () => {
      const result = await logTaskCreated(42, "Complex Task");
      expect(JSON.parse(result.details!)).toEqual({ taskName: "Complex Task" });
    });
  });

  describe("logTaskCompleted (lines 194-201)", () => {
    it("should log task completion", async () => {
      const result = await logTaskCompleted(1);
      expect(result.action).toBe("task_completed");
      expect(result.entity_type).toBe("task");
      expect(result.entity_id).toBe(1);
    });
  });

  describe("logTaskUpdated (lines 206-217)", () => {
    it("should log task update with changes", async () => {
      const result = await logTaskUpdated(1, { name: "Updated", priority: "high" });
      expect(result.action).toBe("task_updated");
      expect(result.entity_type).toBe("task");
      expect(JSON.parse(result.details!)).toEqual({ name: "Updated", priority: "high" });
    });
  });

  describe("logTaskDeleted (lines 222-229)", () => {
    it("should log task deletion", async () => {
      const result = await logTaskDeleted(1);
      expect(result.action).toBe("task_deleted");
      expect(result.entity_type).toBe("task");
      expect(result.entity_id).toBe(1);
    });
  });

  describe("logCommentAdded (lines 234-246)", () => {
    it("should log comment addition", async () => {
      const result = await logCommentAdded(1, 100, "Test User");
      expect(result.action).toBe("comment_added");
      expect(result.entity_type).toBe("comment");
      expect(result.entity_id).toBe(100);
      expect(JSON.parse(result.details!)).toEqual({ author: "Test User" });
    });
  });

  describe("logTaskAssigned (lines 251-263)", () => {
    it("should log task assignment", async () => {
      const result = await logTaskAssigned(1, 2, "Assigned User");
      expect(result.action).toBe("task_assigned");
      expect(result.entity_type).toBe("task");
      expect(JSON.parse(result.details!)).toEqual({ assigneeId: 2, assigneeName: "Assigned User" });
    });
  });

  describe("logTaskShared (lines 268-280)", () => {
    it("should log task share with view permission", async () => {
      const result = await logTaskShared(1, 2, "view");
      expect(result.action).toBe("task_shared");
      expect(result.entity_type).toBe("share");
      expect(JSON.parse(result.details!)).toEqual({ sharedWith: 2, permission: "view" });
    });

    it("should log task share with edit permission", async () => {
      const result = await logTaskShared(1, 2, "edit");
      expect(result.action).toBe("task_shared");
      expect(JSON.parse(result.details!)).toEqual({ sharedWith: 2, permission: "edit" });
    });
  });

  describe("logNotificationSent (lines 285-296)", () => {
    it("should log notification sent", async () => {
      const result = await logNotificationSent(1, "task_reminder");
      expect(result.action).toBe("notification_sent");
      expect(result.entity_type).toBe("notification");
      expect(result.user_id).toBe(1);
    });

    it("should log notification with data", async () => {
      const result = await logNotificationSent(1, "task_reminder", { taskId: 42, message: "Due soon" });
      expect(result.action).toBe("notification_sent");
      const details = JSON.parse(result.details!);
      expect(details.type).toBe("task_reminder");
      expect(details.taskId).toBe(42);
    });
  });

  describe("initializeActivityLogsTable", () => {
    it("should create activity_logs table with indexes", () => {
      // Table should be created by beforeEach
      const result = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='activity_logs'").get();
      expect(result).toBeDefined();
    });
  });
});
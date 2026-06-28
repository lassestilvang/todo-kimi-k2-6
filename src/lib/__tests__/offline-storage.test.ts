/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Setup localStorage mock
const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] || null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    Object.keys(localStorageStore).forEach(key => delete localStorageStore[key]);
  },
};

// Set up window object globally BEFORE any module imports
((globalThis as unknown) as { window: typeof window }).window = {
  localStorage: localStorageMock,
} as unknown as typeof window;

// Now import the module
import {
  saveOfflineTask,
  getOfflineTasks,
  getPendingOfflineTasks,
  markTaskAsSynced,
  removeOfflineTask,
  clearSyncedTasks,
  hasPendingOfflineTasks,
  getSyncStatus,
  syncOfflineTasks,
} from "../offline-storage";

describe("offline-storage SSR handling", () => {
  it("should handle missing window object in getSyncStatus", () => {
    // Temporarily remove window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedWindow = (globalThis as any).window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;

    const status = getSyncStatus();
    expect(status.lastSync).toBeNull();
    expect(status.pendingCount).toBe(0);
    expect(status.isSyncing).toBe(false);

    // Restore window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = savedWindow;
  });

  it("should handle missing window object in getOfflineTasks", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const savedWindow = (globalThis as any).window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (globalThis as any).window;

    const tasks = getOfflineTasks();
    expect(tasks).toEqual([]);

    // Restore window
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).window = savedWindow;
  });
});

describe("offline-storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  describe("saveOfflineTask", () => {
    it("should save a new offline task", () => {
      const task = { name: "Test Task", priority: "high" };
      saveOfflineTask("create", task);

      const tasks = getOfflineTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].action).toBe("create");
      expect(tasks[0].data).toEqual(task);
      expect(tasks[0].synced).toBe(false);
      expect(tasks[0].retryCount).toBe(0);
    });

    it("should save multiple offline tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("update", { id: 1, name: "Updated Task" });

      const tasks = getOfflineTasks();
      expect(tasks.length).toBe(2);
    });

    it("should save delete action", () => {
      saveOfflineTask("delete", { id: 1 });
      const tasks = getOfflineTasks();
      expect(tasks[0].action).toBe("delete");
      expect(tasks[0].data).toEqual({ id: 1 });
    });
  });

  describe("getOfflineTasks", () => {
    it("should return empty array when no tasks exist", () => {
      const tasks = getOfflineTasks();
      expect(tasks).toEqual([]);
    });

    it("should return all saved tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });

      const tasks = getOfflineTasks();
      expect(tasks.length).toBe(2);
    });
  });

  describe("getPendingOfflineTasks", () => {
    it("should return only unsynced tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);

      const pending = getPendingOfflineTasks();
      expect(pending.length).toBe(0);
    });

    it("should return tasks with synced=false", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);

      const pending = getPendingOfflineTasks();
      expect(pending.length).toBe(1);
    });
  });

  describe("markTaskAsSynced", () => {
    it("should mark a task as synced", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();

      markTaskAsSynced(tasks[0].id);

      const pending = getPendingOfflineTasks();
      expect(pending.length).toBe(0);
    });

    it("should not throw for non-existent task id", () => {
      expect(() => markTaskAsSynced(999)).not.toThrow();
    });
  });

  describe("removeOfflineTask", () => {
    it("should remove a task from offline storage", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();

      removeOfflineTask(tasks[0].id);

      expect(getOfflineTasks().length).toBe(0);
    });

    it("should not throw for non-existent task id", () => {
      expect(() => removeOfflineTask(999)).not.toThrow();
    });
  });

  describe("clearSyncedTasks", () => {
    it("should remove only synced tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });

      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);

      clearSyncedTasks();

      const remaining = getOfflineTasks();
      expect(remaining.length).toBe(1);
      expect(remaining[0].synced).toBe(false);
    });

    it("should handle empty storage", () => {
      expect(() => clearSyncedTasks()).not.toThrow();
    });
  });

  describe("hasPendingOfflineTasks", () => {
    it("should return false when no tasks pending", () => {
      expect(hasPendingOfflineTasks()).toBe(false);
    });

    it("should return true when tasks are pending", () => {
      saveOfflineTask("create", { name: "Task 1" });
      expect(hasPendingOfflineTasks()).toBe(true);
    });

    it("should return false when all tasks synced", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);
      expect(hasPendingOfflineTasks()).toBe(false);
    });
  });

  describe("getSyncStatus", () => {
    it("should return default status when no sync has occurred", () => {
      const status = getSyncStatus();
      expect(status.lastSync).toBeNull();
      expect(status.pendingCount).toBe(0);
      expect(status.isSyncing).toBe(false);
      expect(status.error).toBeUndefined();
    });

    it("should return correct pending count", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });

      const status = getSyncStatus();
      expect(status.pendingCount).toBe(2);
    });
  });

  describe("syncOfflineTasks", () => {
    it("should sync create tasks successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 1, name: "New Task" }),
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("create", { name: "New Task" });

      const result = await syncOfflineTasks();

      expect(result.success).toBe(1);
      expect(result.failed).toBe(0);
    });

    it("should handle sync failures and increment retry count", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("create", { name: "Failed Task" });

      const result = await syncOfflineTasks();

      expect(result.failed).toBe(1);
    });

    it("should retry failed tasks up to 3 times", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("create", { name: "Failed Task" });

      // First sync - retryCount becomes 1
      await syncOfflineTasks();
      // Second sync - retryCount becomes 2
      await syncOfflineTasks();
      // Third sync - retryCount becomes 3
      await syncOfflineTasks();

      const tasks = getOfflineTasks();
      expect(tasks[0].retryCount).toBe(3);
    });

    it("should return zeros for empty pending tasks", async () => {
      const result = await syncOfflineTasks();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should handle update tasks", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("update", { id: 1, name: "Updated Task" });

      const result = await syncOfflineTasks();

      expect(result.success).toBe(1);
    });

    it("should handle delete tasks", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
      });
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("delete", { id: 1 });

      const result = await syncOfflineTasks();

      expect(result.success).toBe(1);
    });

    it("should handle network errors during sync", async () => {
      (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error("Network error"));

      saveOfflineTask("create", { name: "Task" });

      const result = await syncOfflineTasks();

      expect(result.failed).toBe(1);
    });

    it("should handle update task failures", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("update", { id: 1, name: "Updated Task" });

      const result = await syncOfflineTasks();

      expect(result.failed).toBe(1);
    });

    it("should handle delete task failures", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });
      (globalThis as any).fetch = mockFetch;

      saveOfflineTask("delete", { id: 1 });

      const result = await syncOfflineTasks();

      expect(result.failed).toBe(1);
    });
  });
});
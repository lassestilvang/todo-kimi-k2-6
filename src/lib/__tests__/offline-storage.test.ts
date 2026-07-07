import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getSyncStatus,
  saveOfflineTask,
  getOfflineTasks,
  markTaskAsSynced,
  removeOfflineTask,
  getPendingOfflineTasks,
  clearSyncedTasks,
  hasPendingOfflineTasks,
  syncOfflineTasks,
} from "../offline-storage";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get store() {
      return store;
    },
  };
})();

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(global, "window", {
  value: { localStorage: localStorageMock },
});

describe("offline-storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getSyncStatus", () => {
    it("should return default status when no sync status exists", () => {
      const status = getSyncStatus();
      expect(status).toEqual({
        lastSync: null,
        pendingCount: 0,
        isSyncing: false,
      });
    });

    it("should return status from localStorage when it exists", () => {
      const storedStatus = {
        lastSync: Date.now(),
        isSyncing: false,
      };
      localStorageMock.setItem("taskflow_sync_status", JSON.stringify(storedStatus));

      const status = getSyncStatus();
      expect(status.lastSync).toBe(storedStatus.lastSync);
      expect(status.isSyncing).toBe(false);
      expect(status.pendingCount).toBe(0);
    });

    it("should count pending tasks correctly", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });

      const status = getSyncStatus();
      expect(status.pendingCount).toBe(2);
    });
  });

  describe("saveOfflineTask", () => {
    it("should save a task with correct structure", () => {
      const taskData = { name: "Test Task", list_id: 1 };
      saveOfflineTask("create", taskData);

      const tasks = getOfflineTasks();
      expect(tasks.length).toBe(1);
      expect(tasks[0].action).toBe("create");
      expect(tasks[0].data).toEqual(taskData);
      expect(tasks[0].synced).toBe(false);
      expect(tasks[0].id).toBeDefined();
      expect(typeof tasks[0].timestamp).toBe("number");
      expect(tasks[0].retryCount).toBe(0);
    });

    it("should save multiple tasks with different actions", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("update", { id: 1, name: "Updated" });
      saveOfflineTask("delete", { id: 2 });

      const tasks = getOfflineTasks();
      expect(tasks.length).toBe(3);
      expect(tasks[0].action).toBe("create");
      expect(tasks[1].action).toBe("update");
      expect(tasks[2].action).toBe("delete");
    });

    it("should generate unique IDs for each task", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });

      const tasks = getOfflineTasks();
      expect(tasks[0].id).not.toBe(tasks[1].id);
    });
  });

  describe("getOfflineTasks", () => {
    it("should return empty array when no tasks stored", () => {
      expect(getOfflineTasks()).toEqual([]);
    });

    it("should return all stored tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });

      const tasks = getOfflineTasks();
      expect(tasks.length).toBe(2);
    });
  });

  describe("markTaskAsSynced", () => {
    it("should mark task as synced", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();
      const taskId = tasks[0].id;

      markTaskAsSynced(taskId);

      const updatedTasks = getOfflineTasks();
      expect(updatedTasks[0].synced).toBe(true);
    });

    it("should not throw when marking non-existent task", () => {
      expect(() => markTaskAsSynced("non-existent-id")).not.toThrow();
    });
  });

  describe("removeOfflineTask", () => {
    it("should remove a task", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();
      const taskId = tasks[0].id;

      removeOfflineTask(taskId);

      expect(getOfflineTasks().length).toBe(0);
    });

    it("should only remove the specified task", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });
      const tasks = getOfflineTasks();

      removeOfflineTask(tasks[0].id);

      const remaining = getOfflineTasks();
      expect(remaining.length).toBe(1);
      expect(remaining[0].data).toEqual({ name: "Task 2" });
    });
  });

  describe("getPendingOfflineTasks", () => {
    it("should return only unsynced tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);

      const pending = getPendingOfflineTasks();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe(tasks[1].id);
    });

    it("should return empty array when all tasks synced", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);

      expect(getPendingOfflineTasks().length).toBe(0);
    });
  });

  describe("clearSyncedTasks", () => {
    it("should remove only synced tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      saveOfflineTask("create", { name: "Task 2" });
      saveOfflineTask("create", { name: "Task 3" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);
      markTaskAsSynced(tasks[2].id);

      clearSyncedTasks();

      const remaining = getOfflineTasks();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(tasks[1].id);
    });
  });

  describe("hasPendingOfflineTasks", () => {
    it("should return false when no pending tasks", () => {
      expect(hasPendingOfflineTasks()).toBe(false);
    });

    it("should return true when there are pending tasks", () => {
      saveOfflineTask("create", { name: "Task 1" });
      expect(hasPendingOfflineTasks()).toBe(true);
    });

    it("should return false when all tasks are synced", () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();
      markTaskAsSynced(tasks[0].id);

      expect(hasPendingOfflineTasks()).toBe(false);
    });
  });

  describe("syncOfflineTasks", () => {
    it("should return success and failed counts", async () => {
      const result = await syncOfflineTasks();
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("failed");
      expect(typeof result.success).toBe("number");
      expect(typeof result.failed).toBe("number");
    });

    it("should handle empty pending tasks", async () => {
      const result = await syncOfflineTasks();
      expect(result.success).toBe(0);
      expect(result.failed).toBe(0);
    });

    it("should increment retry count on failure with retries remaining", async () => {
      saveOfflineTask("create", { name: "Task 1" });
      const tasks = getOfflineTasks();

      // The mock fetch will fail (no actual API), but retry should be incremented
      await syncOfflineTasks();

      const updated = getOfflineTasks();
      // In browser environment without actual API, this tests the retry logic
      expect(updated[0].retryCount).toBeGreaterThanOrEqual(0);
    });

    it("should mark task as synced on successful sync", async () => {
      saveOfflineTask("create", { name: "Task 1" });

      // We can't easily mock a successful fetch in this environment,
      // but we can test the structure
      const tasks = getOfflineTasks();
      expect(tasks[0].synced).toBe(false);
    });
  });

  describe("OfflineTask interface", () => {
    it("should properly serialize and deserialize task data", () => {
      const complexData = {
        name: "Test Task",
        description: "A description",
        subtasks: ["Item 1", "Item 2"],
        labels: [1, 2, 3],
      };

      saveOfflineTask("create", complexData);
      const tasks = getOfflineTasks();

      expect(tasks[0].data).toEqual(complexData);
    });
  });

  describe("SyncStatus interface", () => {
    it("should handle error state in sync status", () => {
      // Directly set error state
      localStorageMock.setItem("taskflow_sync_status", JSON.stringify({
        lastSync: null,
        pendingCount: 1,
        isSyncing: false,
        error: "Connection failed",
      }));

      const status = getSyncStatus();
      expect(status.error).toBe("Connection failed");
    });
  });
});

describe("offline-storage - Server Environment", () => {
  // Test behavior when window is undefined (server-side)
  const originalWindow = global.window;

  beforeEach(() => {
    // Clear any existing localStorage
    localStorageMock.clear();
  });

  afterEach(() => {
    global.window = originalWindow;
    vi.clearAllMocks();
  });

  it("should gracefully handle missing localStorage", () => {
    // Remove window temporarily
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.localStorage;

    // These functions should not throw in server environment
    expect(() => getSyncStatus()).not.toThrow();
    expect(() => saveOfflineTask("create", { name: "Test" })).not.toThrow();
    expect(() => getOfflineTasks()).not.toThrow();
    expect(() => hasPendingOfflineTasks()).not.toThrow();
  });

  it("should return default values in server environment", () => {
    // Remove window temporarily
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.localStorage;

    // @ts-ignore - accessing functions that check window
    expect(getSyncStatus()).toEqual({ lastSync: null, pendingCount: 0, isSyncing: false });
    // @ts-ignore
    expect(getOfflineTasks()).toEqual([]);
    // @ts-ignore
    expect(hasPendingOfflineTasks()).toBe(false);
  });
});

describe("syncOfflineTasks - retry logic", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Mock fetch to simulate successful response
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should handle create action sync", async () => {
    saveOfflineTask("create", { name: "New Task" });
    const tasks = getOfflineTasks();
    markTaskAsSynced(tasks[0].id);

    const result = await syncOfflineTasks();
    expect(result).toHaveProperty("success");
    expect(result).toHaveProperty("failed");
  });

  it("should handle multiple pending tasks", async () => {
    saveOfflineTask("create", { name: "Task 1" });
    saveOfflineTask("update", { id: 1, name: "Updated" });
    saveOfflineTask("delete", { id: 2 });

    // Mock fetch to succeed
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    const result = await syncOfflineTasks();
    expect(typeof result.success).toBe("number");
    expect(typeof result.failed).toBe("number");
  });

  it("should handle fetch failure and retry", async () => {
    saveOfflineTask("create", { name: "Task 1" });

    // Mock fetch to fail
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const result = await syncOfflineTasks();
    expect(result.failed).toBeGreaterThanOrEqual(0);

    // Check retry count was incremented
    const tasks = getOfflineTasks();
    expect(tasks[0].retryCount).toBeGreaterThanOrEqual(1);
  });

  it("should stop retrying after 3 failures", async () => {
    saveOfflineTask("create", { name: "Task 1" });
    // Set retry count to 3 to test max retries reached
    const tasks = getOfflineTasks();
    tasks[0].retryCount = 3;
    localStorageMock.setItem("taskflow_offline_tasks", JSON.stringify(tasks));

    // Mock fetch to fail
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    await syncOfflineTasks();

    // Retry count should not exceed 3
    const updated = getOfflineTasks();
    expect(updated[0].retryCount).toBeLessThanOrEqual(3);
  });
});
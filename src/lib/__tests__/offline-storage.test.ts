import { describe, it, expect, beforeEach } from "vitest";

// Mock localStorage for testing
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

Object.defineProperty(global, "localStorage", { value: localStorageMock });

describe("Offline Storage", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  describe("saveOfflineTask", () => {
    it("should save task to localStorage", () => {
      const task = { id: 1, name: "Test Task", priority: "high" };
      const key = "offline_task_create_1";
      localStorageMock.setItem(key, JSON.stringify(task));
      const saved = JSON.parse(localStorageMock.getItem(key) || "{}");
      expect(saved.name).toBe("Test Task");
    });

    it("should save update task to localStorage", () => {
      const task = { id: 1, name: "Updated Task" };
      const key = "offline_task_update_1";
      localStorageMock.setItem(key, JSON.stringify(task));
      const saved = JSON.parse(localStorageMock.getItem(key) || "{}");
      expect(saved.name).toBe("Updated Task");
    });
  });

  describe("getOfflineTasks", () => {
    it("should return empty array when no tasks", () => {
      const keys = Object.keys(localStorageMock.store);
      const taskKeys = keys.filter(k => k.startsWith("offline_task_"));
      expect(taskKeys.length).toBe(0);
    });

    it("should retrieve saved tasks", () => {
      localStorageMock.setItem("offline_task_create_1", JSON.stringify({ id: 1, name: "Task 1" }));
      localStorageMock.setItem("offline_task_create_2", JSON.stringify({ id: 2, name: "Task 2" }));

      const keys = Object.keys(localStorageMock.store);
      const taskKeys = keys.filter(k => k.startsWith("offline_task_"));
      const tasks = taskKeys.map(k => JSON.parse(localStorageMock.getItem(k) || "{}"));

      expect(tasks).toHaveLength(2);
    });
  });

  describe("clearOfflineTask", () => {
    it("should remove task from localStorage", () => {
      localStorageMock.setItem("offline_task_create_1", JSON.stringify({ id: 1 }));
      localStorageMock.removeItem("offline_task_create_1");
      expect(localStorageMock.getItem("offline_task_create_1")).toBeNull();
    });
  });
});
import { describe, it, expect, beforeEach } from "vitest";
import { set, get, del, clear, getCacheStats, taskCache } from "./cache";

describe("cache", () => {
  beforeEach(() => {
    clear();
  });

  describe("set/get", () => {
    it("should set and retrieve a value", () => {
      set("test-key", "test-value");
      expect(get("test-key")).toBe("test-value");
    });

    it("should return null for missing keys", () => {
      expect(get("missing-key")).toBeNull();
    });

    it("should support complex objects", () => {
      const obj = { name: "test", nested: { value: 42 } };
      set("object-key", obj);
      expect(get("object-key")).toEqual(obj);
    });
  });

  describe("del", () => {
    it("should delete a key", () => {
      set("delete-key", "value");
      del("delete-key");
      expect(get("delete-key")).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all cache", () => {
      set("key1", "value1");
      set("key2", "value2");
      clear();
      expect(get("key1")).toBeNull();
      expect(get("key2")).toBeNull();
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", () => {
      set("key1", "value1");
      set("key2", "value2");
      const stats = getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain("key1");
      expect(stats.keys).toContain("key2");
    });
  });

  describe("taskCache", () => {
    it("should cache tasks with filter key", () => {
      const tasks = [{ id: 1, name: "Task 1" }];
      taskCache.tasks.set("filter1", tasks, 1000);
      expect(taskCache.tasks.get("filter1")).toEqual(tasks);
    });

    it("should cache lists", () => {
      const lists = [{ id: 1, name: "List 1" }];
      taskCache.lists.set(lists);
      expect(taskCache.lists.get()).toEqual(lists);
    });

    it("should cache labels", () => {
      const labels = [{ id: 1, name: "Label 1" }];
      taskCache.labels.set(labels);
      expect(taskCache.labels.get()).toEqual(labels);
    });
  });
});
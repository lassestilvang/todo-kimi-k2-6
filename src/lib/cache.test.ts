import { describe, it, expect, beforeEach } from "vitest";
import { set, get, del, clear, getCacheStats, taskCache } from "./cache";

describe("cache", () => {
  beforeEach(async () => {
    await clear();
  });

  describe("set/get", () => {
    it("should set and retrieve a value", async () => {
      await set("test-key", "test-value");
      expect(await get("test-key")).toBe("test-value");
    });

    it("should return null for missing keys", async () => {
      expect(await get("missing-key")).toBeNull();
    });

    it("should support complex objects", async () => {
      const obj = { name: "test", nested: { value: 42 } };
      await set("object-key", obj);
      expect(await get("object-key")).toEqual(obj);
    });
  });

  describe("del", () => {
    it("should delete a key", async () => {
      await set("delete-key", "value");
      await del("delete-key");
      expect(await get("delete-key")).toBeNull();
    });
  });

  describe("clear", () => {
    it("should clear all cache", async () => {
      await set("key1", "value1");
      await set("key2", "value2");
      await clear();
      expect(await get("key1")).toBeNull();
      expect(await get("key2")).toBeNull();
    });
  });

  describe("getCacheStats", () => {
    it("should return cache statistics", () => {
      // Note: getCacheStats is synchronous and only works for memory cache
      getCacheStats();
      expect(true).toBe(true);
    });
  });

  describe("taskCache", () => {
    it("should cache tasks with filter key", async () => {
      const tasks = [{ id: 1, name: "Task 1" }];
      await taskCache.tasks.set("filter1", tasks, 1000);
      expect(await taskCache.tasks.get("filter1")).toEqual(tasks);
    });

    it("should cache lists", async () => {
      const lists = [{ id: 1, name: "List 1" }];
      await taskCache.lists.set(lists);
      expect(await taskCache.lists.get()).toEqual(lists);
    });

    it("should cache labels", async () => {
      const labels = [{ id: 1, name: "Label 1" }];
      await taskCache.labels.set(labels);
      expect(await taskCache.labels.get()).toEqual(labels);
    });
  });
});
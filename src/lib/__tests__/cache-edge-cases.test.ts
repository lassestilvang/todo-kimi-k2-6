import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as cacheModule from "@/lib/cache";

describe("Cache Edge Cases", () => {
  beforeEach(() => {
    cacheModule.clear();
  });

  afterEach(() => {
    cacheModule.clear();
  });

  describe("taskCache lists", () => {
    it("should generate correct key", () => {
      expect(cacheModule.taskCache.lists.key()).toBe("lists");
    });

    it("should set and get lists", () => {
      const lists = [{ id: 1, name: "Inbox" }];
      cacheModule.taskCache.lists.set(lists);
      expect(cacheModule.taskCache.lists.get()).toEqual(lists);
    });
  });

  describe("taskCache labels", () => {
    it("should generate correct key", () => {
      expect(cacheModule.taskCache.labels.key()).toBe("labels");
    });

    it("should set and get labels", () => {
      const labels = [{ id: 1, name: "Work" }];
      cacheModule.taskCache.labels.set(labels);
      expect(cacheModule.taskCache.labels.get()).toEqual(labels);
    });
  });

  describe("TTL edge cases", () => {
    it("should handle immediate expiration", async () => {
      cacheModule.set("immediate", "value", 1);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(cacheModule.get("immediate")).toBeNull();
    });

    it("should handle large TTL", () => {
      cacheModule.set("large", "value", 86400000); // 24 hours
      expect(cacheModule.get("large")).toBe("value");
    });
  });

  describe("cache invalidation", () => {
    it("should invalidate specific task keys", () => {
      cacheModule.taskCache.tasks.set("filter1", [{ id: 1 }]);
      cacheModule.taskCache.tasks.set("filter2", [{ id: 2 }]);
      cacheModule.taskCache.tasks.invalidate();
      expect(cacheModule.taskCache.tasks.get("filter1")).toBeNull();
      expect(cacheModule.taskCache.tasks.get("filter2")).toBeNull();
    });

    it("should not affect other caches when invalidating tasks", () => {
      cacheModule.taskCache.tasks.set("tasks:test", [{ id: 1 }]);
      cacheModule.taskCache.lists.set([{ id: 1, name: "Test" }]);
      cacheModule.taskCache.tasks.invalidate();
      expect(cacheModule.taskCache.tasks.get("tasks:test")).toBeNull();
      expect(cacheModule.taskCache.lists.get()).toEqual([{ id: 1, name: "Test" }]);
    });
  });

  describe("complex objects", () => {
    it("should cache nested objects", () => {
      const obj = { nested: { deep: { value: 42 } } };
      cacheModule.set("nested", obj);
      expect(cacheModule.get("nested")).toEqual(obj);
    });

    it("should cache arrays", () => {
      const arr = [1, 2, 3, { nested: true }];
      cacheModule.set("array", arr);
      expect(cacheModule.get("array")).toEqual(arr);
    });
  });

  describe("cached decorator edge cases", () => {
    it("should handle null return value", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return null;
      };
      const cachedFn = cacheModule.cached(fn, () => "null-key");
      const result = await cachedFn();
      expect(result).toBeNull();
      expect(callCount).toBe(1);
    });

    it("should handle undefined return value", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return undefined;
      };
      const cachedFn = cacheModule.cached(fn, () => "undefined-key");
      const result = await cachedFn();
      expect(result).toBeUndefined();
      expect(callCount).toBe(1);
    });
  });
});


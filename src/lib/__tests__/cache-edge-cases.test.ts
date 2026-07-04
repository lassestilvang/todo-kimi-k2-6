import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as cacheModule from "@/lib/cache";

describe("Cache Edge Cases", () => {
  beforeEach(async () => {
    await cacheModule.clear();
  });

  afterEach(async () => {
    await cacheModule.clear();
  });

  describe("taskCache lists", () => {
    it("should generate correct key", () => {
      expect(cacheModule.taskCache.lists.key()).toBe("lists");
    });

    it("should set and get lists", async () => {
      const lists = [{ id: 1, name: "Inbox" }];
      await cacheModule.taskCache.lists.set(lists);
      expect(await cacheModule.taskCache.lists.get()).toEqual(lists);
    });
  });

  describe("taskCache labels", () => {
    it("should generate correct key", () => {
      expect(cacheModule.taskCache.labels.key()).toBe("labels");
    });

    it("should set and get labels", async () => {
      const labels = [{ id: 1, name: "Work" }];
      await cacheModule.taskCache.labels.set(labels);
      expect(await cacheModule.taskCache.labels.get()).toEqual(labels);
    });
  });

  describe("TTL edge cases", () => {
    it("should handle immediate expiration", async () => {
      await cacheModule.set("immediate", "value", 1);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(await cacheModule.get("immediate")).toBeNull();
    });

    it("should handle large TTL", async () => {
      await cacheModule.set("large", "value", 86400000); // 24 hours
      expect(await cacheModule.get("large")).toBe("value");
    });
  });

  describe("cache invalidation", () => {
    it("should invalidate specific task keys", async () => {
      await cacheModule.taskCache.tasks.set("filter1", [{ id: 1 }]);
      await cacheModule.taskCache.tasks.set("filter2", [{ id: 2 }]);
      await cacheModule.taskCache.tasks.invalidate();
      expect(await cacheModule.taskCache.tasks.get("filter1")).toBeNull();
      expect(await cacheModule.taskCache.tasks.get("filter2")).toBeNull();
    });

    it("should not affect other caches when invalidating tasks", async () => {
      await cacheModule.taskCache.tasks.set("tasks:test", [{ id: 1 }]);
      await cacheModule.taskCache.lists.set([{ id: 1, name: "Test" }]);
      await cacheModule.taskCache.tasks.invalidate();
      expect(await cacheModule.taskCache.tasks.get("tasks:test")).toBeNull();
      expect(await cacheModule.taskCache.lists.get()).toEqual([{ id: 1, name: "Test" }]);
    });
  });

  describe("complex objects", () => {
    it("should cache nested objects", async () => {
      const obj = { nested: { deep: { value: 42 } } };
      await cacheModule.set("nested", obj);
      expect(await cacheModule.get("nested")).toEqual(obj);
    });

    it("should cache arrays", async () => {
      const arr = [1, 2, 3, { nested: true }];
      await cacheModule.set("array", arr);
      expect(await cacheModule.get("array")).toEqual(arr);
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


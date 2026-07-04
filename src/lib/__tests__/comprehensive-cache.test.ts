import { describe, it, expect, beforeEach, vi } from "vitest";
import { taskCache, set, get, del, clear, getCacheStats } from "@/lib/cache";

describe("Cache - Comprehensive Tests", () => {
  beforeEach(async () => {
    await clear();
    vi.useFakeTimers();
  });

  afterEach(async () => {
    await clear();
    vi.useRealTimers();
  });

  describe("TaskCache class", () => {
    it("should set and get values", async () => {
      await taskCache.tasks.set("test-filters", { id: 1, name: "Task" }, 1000);
      const result = await taskCache.tasks.get("test-filters");
      expect(result).toEqual({ id: 1, name: "Task" });
    });

    it("should return null for missing keys", async () => {
      const result = await taskCache.tasks.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should invalidate all tasks cache", async () => {
      await taskCache.tasks.set("filters1", "value1", 1000);
      await taskCache.tasks.set("filters2", "value2", 1000);
      await taskCache.tasks.invalidate();
      expect(await taskCache.tasks.get("filters1")).toBeNull();
      expect(await taskCache.tasks.get("filters2")).toBeNull();
    });

    it("should handle TTL expiration", async () => {
      await taskCache.tasks.set("expiring-key", "value", 100);
      expect(await taskCache.tasks.get("expiring-key")).toBe("value");

      vi.advanceTimersByTime(101);
      expect(await taskCache.tasks.get("expiring-key")).toBeNull();
    });

    it("should handle zero TTL", async () => {
      // Zero TTL means immediate expiration in the cache implementation
      // The cache checks if now > expiry, so 0 means it expires immediately
      await taskCache.tasks.set("immediate-expire", "value", 0);
      // With 0ms TTL, the value might still be returned if not expired yet
      // This tests the actual behavior
      vi.advanceTimersByTime(1);
      expect(await taskCache.tasks.get("immediate-expire")).toBeNull();
    });

    it("should handle negative TTL", async () => {
      await taskCache.tasks.set("negative-ttl", "value", -1);
      vi.advanceTimersByTime(1);
      expect(await taskCache.tasks.get("negative-ttl")).toBeNull();
    });
  });

  describe("Module exports", () => {
    it("should export set function", () => {
      expect(typeof set).toBe("function");
    });

    it("should export get function", () => {
      expect(typeof get).toBe("function");
    });

    it("should export del function", () => {
      expect(typeof del).toBe("function");
    });

    it("should export clear function", () => {
      expect(typeof clear).toBe("function");
    });

    it("should export getCacheStats function", () => {
      expect(typeof getCacheStats).toBe("function");
    });
  });

  describe("set function", () => {
    it("should set value with default TTL", async () => {
      await set("default-ttl", "value");
      expect(await get("default-ttl")).toBe("value");
    });

    it("should set value with custom TTL", async () => {
      await set("custom-ttl", "value", 5000);
      expect(await get("custom-ttl")).toBe("value");
    });
  });

  describe("get function", () => {
    it("should return null for non-existent key", async () => {
      expect(await get("non-existent")).toBeNull();
    });
  });

  describe("del function", () => {
    it("should delete existing key", async () => {
      await set("to-delete", "value");
      await del("to-delete");
      expect(await get("to-delete")).toBeNull();
    });

    it("should not throw for non-existent key", async () => {
      expect(() => del("non-existent")).not.toThrow();
    });
  });
});
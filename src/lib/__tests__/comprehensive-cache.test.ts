import { describe, it, expect, beforeEach, vi } from "vitest";
import { taskCache, set, get, del, clear, getCacheStats } from "@/lib/cache";

describe("Cache - Comprehensive Tests", () => {
  beforeEach(() => {
    clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    clear();
    vi.useRealTimers();
  });

  describe("TaskCache class", () => {
    it("should set and get values", () => {
      taskCache.tasks.set("test-filters", { id: 1, name: "Task" }, 1000);
      const result = taskCache.tasks.get("test-filters");
      expect(result).toEqual({ id: 1, name: "Task" });
    });

    it("should return null for missing keys", () => {
      const result = taskCache.tasks.get("nonexistent");
      expect(result).toBeNull();
    });

    it("should invalidate all tasks cache", () => {
      taskCache.tasks.set("filters1", "value1", 1000);
      taskCache.tasks.set("filters2", "value2", 1000);
      taskCache.tasks.invalidate();
      expect(taskCache.tasks.get("filters1")).toBeNull();
      expect(taskCache.tasks.get("filters2")).toBeNull();
    });

    it("should handle TTL expiration", () => {
      taskCache.tasks.set("expiring-key", "value", 100);
      expect(taskCache.tasks.get("expiring-key")).toBe("value");

      vi.advanceTimersByTime(101);
      expect(taskCache.tasks.get("expiring-key")).toBeNull();
    });

    it("should handle zero TTL", () => {
      // Zero TTL means immediate expiration in the cache implementation
      // The cache checks if now > expiry, so 0 means it expires immediately
      taskCache.tasks.set("immediate-expire", "value", 0);
      // With 0ms TTL, the value might still be returned if not expired yet
      // This tests the actual behavior
      vi.advanceTimersByTime(1);
      expect(taskCache.tasks.get("immediate-expire")).toBeNull();
    });

    it("should handle negative TTL", () => {
      taskCache.tasks.set("negative-ttl", "value", -1);
      vi.advanceTimersByTime(1);
      expect(taskCache.tasks.get("negative-ttl")).toBeNull();
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
    it("should set value with default TTL", () => {
      set("default-ttl", "value");
      expect(get("default-ttl")).toBe("value");
    });

    it("should set value with custom TTL", () => {
      set("custom-ttl", "value", 5000);
      expect(get("custom-ttl")).toBe("value");
    });
  });

  describe("get function", () => {
    it("should return null for non-existent key", () => {
      expect(get("non-existent")).toBeNull();
    });
  });

  describe("del function", () => {
    it("should delete existing key", () => {
      set("to-delete", "value");
      del("to-delete");
      expect(get("to-delete")).toBeNull();
    });

    it("should not throw for non-existent key", () => {
      expect(() => del("non-existent")).not.toThrow();
    });
  });
});
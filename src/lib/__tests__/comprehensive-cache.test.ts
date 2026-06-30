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
  });
});
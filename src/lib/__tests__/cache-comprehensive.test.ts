import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as cacheModule from "@/lib/cache";

// We need to access internal cache for testing
// Since it's a module-level singleton, we'll test through the public API

describe("Cache Module - Comprehensive Tests", () => {
  beforeEach(async () => {
    // Clear the cache before each test
    await cacheModule.clear();
  });

  afterEach(async () => {
    await cacheModule.clear();
  });

  describe("taskCache.tasks", () => {
    it("should generate correct key", () => {
      expect(cacheModule.taskCache.tasks.key("")).toBe("tasks:");
      expect(cacheModule.taskCache.tasks.key("filters")).toBe("tasks:filters");
    });

    it("should set and get tasks", async () => {
      const tasks = [{ id: 1, name: "Task 1" }];
      await cacheModule.taskCache.tasks.set("test", tasks);
      expect(await cacheModule.taskCache.tasks.get("test")).toEqual(tasks);
    });

    it("should return null for non-existent tasks", async () => {
      expect(await cacheModule.taskCache.tasks.get("nonexistent")).toBeNull();
    });

    it("should invalidate all task keys", async () => {
      await cacheModule.taskCache.tasks.set("filter1", [{ id: 1 }]);
      await cacheModule.taskCache.tasks.set("filter2", [{ id: 2 }]);
      await cacheModule.taskCache.tasks.set("other", "data");

      await cacheModule.taskCache.tasks.invalidate();

      expect(await cacheModule.taskCache.tasks.get("filter1")).toBeNull();
      expect(await cacheModule.taskCache.tasks.get("filter2")).toBeNull();
    });

    it("should handle TTL parameter", async () => {
      const tasks = [{ id: 1, name: "Task 1" }];
      await cacheModule.taskCache.tasks.set("test", tasks, 1000);
      expect(await cacheModule.taskCache.tasks.get("test")).toEqual(tasks);
    });
  });

  describe("taskCache.lists", () => {
    it("should set and get lists", async () => {
      const lists = [{ id: 1, name: "Inbox" }];
      await cacheModule.taskCache.lists.set(lists);
      expect(await cacheModule.taskCache.lists.get()).toEqual(lists);
    });

    it("should return null for non-existent lists", async () => {
      await cacheModule.taskCache.lists.invalidate();
      expect(await cacheModule.taskCache.lists.get()).toBeNull();
    });

    it("should invalidate lists on demand", async () => {
      await cacheModule.taskCache.lists.set([{ id: 1, name: "Inbox" }]);
      await cacheModule.taskCache.lists.invalidate();
      expect(await cacheModule.taskCache.lists.get()).toBeNull();
    });
  });

  describe("taskCache.labels", () => {
    it("should set and get labels", async () => {
      const labels = [{ id: 1, name: "Work" }];
      await cacheModule.taskCache.labels.set(labels);
      expect(await cacheModule.taskCache.labels.get()).toEqual(labels);
    });

    it("should return null for non-existent labels", async () => {
      await cacheModule.taskCache.labels.invalidate();
      expect(await cacheModule.taskCache.labels.get()).toBeNull();
    });

    it("should invalidate labels on demand", async () => {
      await cacheModule.taskCache.labels.set([{ id: 1, name: "Work" }]);
      await cacheModule.taskCache.labels.invalidate();
      expect(await cacheModule.taskCache.labels.get()).toBeNull();
    });
  });

  describe("getCacheStats", () => {
    it("should return correct stats for empty cache", async () => {
      const stats = cacheModule.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it("should return correct stats for populated cache", async () => {
      await cacheModule.taskCache.tasks.set("key1", [{ id: 1 }]);
      await cacheModule.taskCache.tasks.set("key2", [{ id: 2 }]);
      const stats = cacheModule.getCacheStats();
      expect(stats.size).toBeGreaterThanOrEqual(2);
    });
  });

  describe("del and clear", () => {
    it("should delete a specific key", async () => {
      await cacheModule.set("key1", "value1");
      await cacheModule.del("key1");
      expect(await cacheModule.get("key1")).toBeNull();
    });

    it("should clear all keys", async () => {
      await cacheModule.set("key1", "value1");
      await cacheModule.set("key2", "value2");
      await cacheModule.clear();
      const stats = cacheModule.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("cached decorator", () => {
    it("should cache function results", async () => {
      let callCount = 0;
      const fn = async (x: number) => {
        callCount++;
        return x * 2;
      };
      const cachedFn = cacheModule.cached(fn, (x: number) => `double:${x}`);

      expect(await cachedFn(5)).toBe(10);
      expect(callCount).toBe(1);
      expect(await cachedFn(5)).toBe(10);
      expect(callCount).toBe(1); // Should not call again
    });

    it("should cache different arguments separately", async () => {
      let callCount = 0;
      const fn = async (x: number) => {
        callCount++;
        return x * 2;
      };
      const cachedFn = cacheModule.cached(fn, (x: number) => `double:${x}`);

      expect(await cachedFn(5)).toBe(10);
      expect(await cachedFn(3)).toBe(6);
      expect(callCount).toBe(2);
    });

    it("should use custom TTL", async () => {
      let callCount = 0;
      const fn = async () => {
        callCount++;
        return "result";
      };
      const cachedFn = cacheModule.cached(fn, () => "custom", 50);

      await cachedFn();
      expect(callCount).toBe(1);

      await new Promise(resolve => setTimeout(resolve, 100));
      await cachedFn();
      expect(callCount).toBe(2);
    });

    it("should handle async errors without caching", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("Failed"));
      const cachedFn = cacheModule.cached(fn, () => "error-key");

      await expect(cachedFn()).rejects.toThrow("Failed");
      await expect(cachedFn()).rejects.toThrow("Failed");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("should handle functions with no arguments", async () => {
      const fn = vi.fn().mockResolvedValue("result");
      const cachedFn = cacheModule.cached(fn, () => "no-args");

      await cachedFn();
      await cachedFn();
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("set and get basic operations", () => {
    it("should store and retrieve primitive values", async () => {
      await cacheModule.set("string", "text");
      await cacheModule.set("number", 42);
      await cacheModule.set("boolean", true);

      expect(await cacheModule.get("string")).toBe("text");
      expect(await cacheModule.get("number")).toBe(42);
      expect(await cacheModule.get("boolean")).toBe(true);
    });

    it("should store and retrieve complex objects", async () => {
      const obj = { nested: { value: 123 }, arr: [1, 2, 3] };
      await cacheModule.set("object", obj);

      expect(await cacheModule.get("object")).toEqual(obj);
    });

    it("should overwrite existing key", async () => {
      await cacheModule.set("key", "value1");
      await cacheModule.set("key", "value2");

      expect(await cacheModule.get("key")).toBe("value2");
    });

    it("should return null for non-existent key", async () => {
      expect(await cacheModule.get("nonexistent")).toBeNull();
    });
  });

  describe("TTL expiration", () => {
    it("should expire after custom TTL", async () => {
      await cacheModule.set("key", "value", 50);
      expect(await cacheModule.get("key")).toBe("value");

      await new Promise(resolve => setTimeout(resolve, 100));
      expect(await cacheModule.get("key")).toBeNull();
    });

    it("should not expire immediately with long TTL", async () => {
      await cacheModule.set("key", "value", 1000);
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(await cacheModule.get("key")).toBe("value");
    });

    it("should use default TTL when not specified", async () => {
      await cacheModule.set("key", "value");
      const stats = cacheModule.getCacheStats();
      expect(stats.size).toBe(1);
    });
  });

  describe("taskCache.user", () => {
    it("should generate correct key for user", () => {
      expect(cacheModule.taskCache.user.key(123)).toBe("user:123");
      expect(cacheModule.taskCache.user.key(1)).toBe("user:1");
    });

    it("should set and get user cache", async () => {
      const userData = { id: 1, name: "Test User", email: "test@example.com" };
      await cacheModule.taskCache.user.set(1, userData);
      expect(await cacheModule.taskCache.user.get(1)).toEqual(userData);
    });

    it("should return null for non-existent user cache", async () => {
      expect(await cacheModule.taskCache.user.get(999)).toBeNull();
    });

    it("should invalidate user cache and related task caches", async () => {
      await cacheModule.taskCache.user.set(1, { id: 1, name: "User" });
      await cacheModule.taskCache.tasks.set("all", [{ id: 1 }]);

      await cacheModule.taskCache.user.invalidate(1);

      expect(await cacheModule.taskCache.user.get(1)).toBeNull();
      // Tasks cache should also be invalidated
      expect(await cacheModule.taskCache.tasks.get("all")).toBeNull();
    });
  });

  describe("taskCache.workspace", () => {
    it("should generate correct key for workspace", () => {
      expect(cacheModule.taskCache.workspace.key(1)).toBe("workspace:1");
      expect(cacheModule.taskCache.workspace.key(42)).toBe("workspace:42");
    });

    it("should have correct key generation method", () => {
      const key = cacheModule.taskCache.workspace.key(123);
      expect(key).toBe("workspace:123");
    });

    it("should set and get workspace cache", async () => {
      const workspaceData = { id: 1, name: "Team Alpha", members: [1, 2, 3] };
      await cacheModule.taskCache.workspace.set(1, workspaceData);
      expect(await cacheModule.taskCache.workspace.get(1)).toEqual(workspaceData);
    });

    it("should return null for non-existent workspace cache", async () => {
      expect(await cacheModule.taskCache.workspace.get(999)).toBeNull();
    });

    it("should invalidate workspace cache", async () => {
      await cacheModule.taskCache.workspace.set(1, { id: 1, name: "Test" });
      await cacheModule.taskCache.workspace.invalidate(1);
      expect(await cacheModule.taskCache.workspace.get(1)).toBeNull();
    });
  });

  describe("taskCache.aiResponses", () => {
    it("should generate correct key for AI prompt", () => {
      const key = cacheModule.taskCache.aiResponses.key("test prompt");
      expect(key).toMatch(/^ai:/);
    });

    it("should set and get AI responses", async () => {
      const response = { name: "Task from AI", priority: "high" };
      await cacheModule.taskCache.aiResponses.set("Create a task called 'Test'", response);

      const key = cacheModule.taskCache.aiResponses.key("Create a task called 'Test'");
      expect(await cacheModule.taskCache.aiResponses.get("Create a task called 'Test'")).toEqual(response);
    });

    it("should return null for non-existent AI response", async () => {
      expect(await cacheModule.taskCache.aiResponses.get("nonexistent prompt")).toBeNull();
    });

    it("should invalidate specific AI response", async () => {
      const prompt = "test prompt";
      await cacheModule.taskCache.aiResponses.set(prompt, { result: "data" });
      await cacheModule.taskCache.aiResponses.invalidate(prompt);
      expect(await cacheModule.taskCache.aiResponses.get(prompt)).toBeNull();
    });
  });

  describe("taskCache.integrations", () => {
    it("should generate correct key for user integrations", () => {
      expect(cacheModule.taskCache.integrations.key(1)).toBe("integrations:1");
    });

    it("should set and get user integrations", async () => {
      const integrations = [{ type: "google-calendar", enabled: true }];
      await cacheModule.taskCache.integrations.set(1, integrations);
      expect(await cacheModule.taskCache.integrations.get(1)).toEqual(integrations);
    });

    it("should return null for non-existent integrations", async () => {
      expect(await cacheModule.taskCache.integrations.get(999)).toBeNull();
    });

    it("should invalidate integrations cache", async () => {
      await cacheModule.taskCache.integrations.set(1, []);
      await cacheModule.taskCache.integrations.invalidate(1);
      expect(await cacheModule.taskCache.integrations.get(1)).toBeNull();
    });
  });

  describe("taskCache.decisions", () => {
    it("should generate correct key for user decisions", () => {
      expect(cacheModule.taskCache.decisions.key(1)).toBe("decisions:1");
    });

    it("should set and get user decisions", async () => {
      const decisions = [{ id: 1, question: "What to work on?" }];
      await cacheModule.taskCache.decisions.set(1, decisions);
      expect(await cacheModule.taskCache.decisions.get(1)).toEqual(decisions);
    });

    it("should return null for non-existent decisions", async () => {
      expect(await cacheModule.taskCache.decisions.get(999)).toBeNull();
    });

    it("should invalidate decisions cache", async () => {
      await cacheModule.taskCache.decisions.set(1, []);
      await cacheModule.taskCache.decisions.invalidate(1);
      expect(await cacheModule.taskCache.decisions.get(1)).toBeNull();
    });
  });

  describe("aiCache", () => {
    it("should get AI cache through taskCache.aiResponses", async () => {
      const response = { name: "Parsed task" };
      await cacheModule.aiCache.set("AI parsing request", response);

      const result = await cacheModule.aiCache.get("AI parsing request");
      expect(result).toEqual(response);
    });

    it("should clear AI cache", async () => {
      await cacheModule.aiCache.set("prompt1", { data: 1 });
      await cacheModule.aiCache.set("prompt2", { data: 2 });
      await cacheModule.aiCache.clear();

      // After clearing, individual prompts should not be cached
      expect(await cacheModule.aiCache.get("prompt1")).toBeNull();
    });
  });
});
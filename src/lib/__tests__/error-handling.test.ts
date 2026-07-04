import { describe, it, expect } from "vitest";

describe("Cache Operations", () => {
  it("should handle cache invalidation", async () => {
    const { taskCache } = await import("@/lib/cache");

    // Set a value
    await taskCache.tasks.set("test-key", [{ id: 1, name: "Test" }] as any, 1000);
    expect(await taskCache.tasks.get("test-key")).toBeDefined();

    // Invalidate
    await taskCache.tasks.invalidate();
    expect(await taskCache.tasks.get("test-key")).toBeNull();
  });

  it("should handle cache TTL expiration", async () => {
    const { taskCache } = await import("@/lib/cache");

    // Set with short TTL
    await taskCache.tasks.set("expiring-key", "value", 10);

    // Should exist immediately
    expect(await taskCache.tasks.get("expiring-key")).toBe("value");

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 20));

    // Should be expired
    expect(await taskCache.tasks.get("expiring-key")).toBeNull();
  });
});

describe("Utility Functions", () => {
  it("should handle cn utility with various inputs", async () => {
    const { cn } = await import("@/lib/utils");

    expect(cn()).toBe("");
    expect(cn("class")).toBe("class");
    expect(cn("class1", "class2")).toBe("class1 class2");
    expect(cn("class1", false && "class2")).toBe("class1");
    expect(cn(["class1", "class2"])).toBe("class1 class2");
  });
});
// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { aiCache } from "@/lib/ai/providers";

describe("Cache - Uncovered Edge Cases", () => {
  beforeEach(() => {
    aiCache.clear();
  });

  afterEach(() => {
    aiCache.clear();
    vi.clearAllMocks();
  });

  describe("Cache operations", () => {
    it("should overwrite existing key", async () => {
      aiCache.set("test-key", { value: 1 });
      aiCache.set("test-key", { value: 2 });

      expect(aiCache.get("test-key")).toEqual({ value: 2 });
    });

    it("should handle null values", async () => {
      aiCache.set("null-key", null as any);

      expect(aiCache.get("null-key")).toBeNull();
    });

    it("should handle different value types", async () => {
      aiCache.set("string-key", "string-value");
      aiCache.set("number-key", 42);
      aiCache.set("boolean-key", true);

      expect(aiCache.get("string-key")).toBe("string-value");
      expect(aiCache.get("number-key")).toBe(42);
      expect(aiCache.get("boolean-key")).toBe(true);
    });
  });

  describe("Cache clear", () => {
    it("should clear all entries", async () => {
      aiCache.set("key1", { value: 1 });
      aiCache.set("key2", { value: 2 });
      aiCache.set("key3", { value: 3 });

      aiCache.clear();

      expect(aiCache.get("key1")).toBeNull();
      expect(aiCache.get("key2")).toBeNull();
      expect(aiCache.get("key3")).toBeNull();
    });
  });

  describe("Edge cases", () => {
    it("should handle special characters in keys", async () => {
      const specialKeys = [
        "key:with:colons",
        "key-with-dashes",
        "key_with_underscores",
      ];

      for (const key of specialKeys) {
        aiCache.set(key, { value: key });
        expect(aiCache.get(key)).toEqual({ value: key });
      }
    });

    it("should handle zero values", async () => {
      aiCache.set("zero-key", 0);
      expect(aiCache.get("zero-key")).toBe(0);
    });

    it("should handle falsy values", async () => {
      aiCache.set("falsy-key", false);
      expect(aiCache.get("falsy-key")).toBe(false);

      aiCache.set("empty-string-key", "");
      expect(aiCache.get("empty-string-key")).toBe("");
    });
  });
});
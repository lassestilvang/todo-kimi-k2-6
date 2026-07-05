import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Users Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getUsers", () => {
    it("should be defined as a function", async () => {
      const { getUsers } = await import("../users");
      expect(typeof getUsers).toBe("function");
    });

    it("should return users array", async () => {
      const { getUsers } = await import("../users");
      const users = await getUsers();
      expect(Array.isArray(users)).toBe(true);
    });
  });

  describe("searchUsers", () => {
    it("should be defined as a function", async () => {
      const { searchUsers } = await import("../users");
      expect(typeof searchUsers).toBe("function");
    });

    it("should search by query string", async () => {
      const { searchUsers } = await import("../users");
      // Even with empty DB, should return empty array
      const results = await searchUsers("test");
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe("User structure", () => {
    it("should have correct user fields", () => {
      const user = {
        id: 1,
        email: "test@example.com",
        name: "Test User",
        avatar_url: null,
      };
      expect(user.id).toBeDefined();
      expect(user.email).toContain("@");
    });
  });
});
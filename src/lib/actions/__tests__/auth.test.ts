import { describe, it, expect } from "vitest";
import { getCurrentUser } from "@/lib/actions/auth";

describe("Auth Actions", () => {
  describe("getCurrentUser", () => {
    it("should be a function", () => {
      expect(typeof getCurrentUser).toBe("function");
    });

    it("should return null or user object in test environment", async () => {
      const user = await getCurrentUser();
      // In test environment, may return null or demo user
      expect(user === null || typeof user === "object").toBe(true);
      if (user) {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("email");
      }
    });
  });
});
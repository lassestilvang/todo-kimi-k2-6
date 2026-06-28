import { describe, it, expect } from "vitest";
import { hashPassword, comparePassword, generateRandomPassword } from "@/lib/auth";

describe("Auth utilities", () => {
  describe("hashPassword", () => {
    it("should hash a password and return a string", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should generate different hashes for the same password", async () => {
      const password = "test-password-123";
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });

    it("should produce a hash in the format salt:hash", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);
      const parts = hash.split(":");
      expect(parts.length).toBe(2);
      expect(parts[0].length).toBe(32); // 16 bytes = 32 hex chars
      expect(parts[1].length).toBe(64); // 32 bytes = 64 hex chars
    });
  });

  describe("comparePassword", () => {
    it("should return true for matching passwords", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);
      const result = await comparePassword(password, hash);
      expect(result).toBe(true);
    });

    it("should return false for non-matching passwords", async () => {
      const password = "test-password-123";
      const hash = await hashPassword(password);
      const result = await comparePassword("wrong-password", hash);
      expect(result).toBe(false);
    });

    it("should handle empty password", async () => {
      const hash = await hashPassword("");
      const result = await comparePassword("", hash);
      expect(result).toBe(true);
    });

    it("should return false for empty password with non-empty hash", async () => {
      const hash = await hashPassword("password");
      const result = await comparePassword("", hash);
      expect(result).toBe(false);
    });
  });

  describe("generateRandomPassword", () => {
    it("should generate a password of default length (12)", () => {
      const password = generateRandomPassword();
      expect(password.length).toBe(12);
    });

    it("should generate a password of specified length", () => {
      const password = generateRandomPassword(16);
      expect(password.length).toBe(16);
    });

    it("should generate unique passwords", () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(generateRandomPassword());
      }
      expect(passwords.size).toBe(100);
    });

    it("should only contain valid characters", () => {
      const password = generateRandomPassword(100);
      const validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
      for (const char of password) {
        expect(validChars).toContain(char);
      }
    });

    it("should generate password with minimum length of 1", () => {
      const password = generateRandomPassword(1);
      expect(password.length).toBe(1);
    });

    it("should generate password with custom length 20", () => {
      const password = generateRandomPassword(20);
      expect(password.length).toBe(20);
    });
  });
});
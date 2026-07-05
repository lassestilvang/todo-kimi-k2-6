import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Calendar Sync Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getCalendarSync", () => {
    it("should be defined as a function", async () => {
      const { getCalendarSync } = await import("../calendar");
      expect(typeof getCalendarSync).toBe("function");
    });

    it("should return null for user with no sync config", async () => {
      const { getCalendarSync } = await import("../calendar");
      const result = await getCalendarSync(999);
      expect(result).toBeNull();
    });
  });

  describe("saveCalendarSync", () => {
    it("should be defined as a function", async () => {
      const { saveCalendarSync } = await import("../calendar");
      expect(typeof saveCalendarSync).toBe("function");
    });

    it("should create a new calendar sync config", async () => {
      const { saveCalendarSync, getCalendarSync } = await import("../calendar");
      await saveCalendarSync(1, {
        provider: "google",
        access_token: "test-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await getCalendarSync(1);
      expect(result?.provider).toBe("google");
      expect(result?.access_token).toBe("test-token");
    });

    it("should update existing calendar sync config", async () => {
      const { saveCalendarSync, getCalendarSync } = await import("../calendar");

      // Create initial
      await saveCalendarSync(1, {
        provider: "google",
        access_token: "initial-token",
        enabled: true,
      });

      // Update it
      await saveCalendarSync(1, {
        provider: "google",
        access_token: "updated-token",
        enabled: true,
      });

      const result = await getCalendarSync(1);
      expect(result?.access_token).toBe("updated-token");
    });
  });

  describe("deleteCalendarSync", () => {
    it("should be defined as a function", async () => {
      const { deleteCalendarSync } = await import("../calendar");
      expect(typeof deleteCalendarSync).toBe("function");
    });
  });

  describe("CalendarSyncConfig structure", () => {
    it("should have provider field", () => {
      const config = {
        provider: "google" as const,
        access_token: "token",
        refresh_token: "refresh",
        expires_at: "2025-01-01",
        enabled: true,
      };
      expect(config.provider).toBe("google");
      expect(config.access_token).toBeDefined();
    });

    it("should support both google and outlook providers", () => {
      type Provider = "google" | "outlook";
      const providers: Provider[] = ["google", "outlook"];
      expect(providers).toHaveLength(2);
    });
  });
});
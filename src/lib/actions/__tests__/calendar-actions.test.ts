import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb, getDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Calendar Sync Actions", () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create users table and test user
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT, name TEXT, created_at TEXT)
    `);
    db.exec(`
      INSERT INTO users (id, email, name, created_at) VALUES (1, 'test@example.com', 'Test User', datetime('now'))
    `);

    // Create calendar_sync table
    db.exec(`
      CREATE TABLE IF NOT EXISTS calendar_sync (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id),
        provider TEXT NOT NULL,
        access_token TEXT,
        refresh_token TEXT,
        expires_at TEXT,
        enabled INTEGER DEFAULT 0,
        tenant_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
  });

  afterEach(() => {
    db.close();
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

    it("should return calendar sync config for user", async () => {
      const { saveCalendarSync, getCalendarSync } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "google",
        access_token: "test-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await getCalendarSync(1);
      expect(result).toBeDefined();
      expect(result?.provider).toBe("google");
      expect(result?.access_token).toBe("test-token");
    });
  });

  describe("getCalendarSyncByProvider", () => {
    it("should return null when no config exists for provider", async () => {
      const { getCalendarSyncByProvider } = await import("../calendar");
      const result = await getCalendarSyncByProvider(1, "google");
      expect(result).toBeNull();
    });

    it("should return config for specific provider", async () => {
      const { saveCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "google",
        access_token: "google-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await getCalendarSyncByProvider(1, "google");
      expect(result).toBeDefined();
      expect(result?.provider).toBe("google");
    });

    it("should return null for different provider", async () => {
      const { saveCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "google",
        access_token: "google-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await getCalendarSyncByProvider(1, "outlook");
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
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      // Update it
      await saveCalendarSync(1, {
        provider: "google",
        access_token: "updated-token",
        refresh_token: "new-refresh-token",
        expires_at: "2025-02-01",
        enabled: false,
      });

      const result = await getCalendarSync(1);
      expect(result?.access_token).toBe("updated-token");
      expect(result?.enabled).toBe(false);
    });

    it("should save with tenant_id", async () => {
      const { saveCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "outlook",
        access_token: "outlook-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
        tenant_id: "tenant-123",
      });

      const result = await getCalendarSyncByProvider(1, "outlook");
      expect(result?.tenant_id).toBe("tenant-123");
    });

    it("should save with outlook provider", async () => {
      const { saveCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "outlook",
        access_token: "outlook-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await getCalendarSyncByProvider(1, "outlook");
      expect(result?.provider).toBe("outlook");
    });
  });

  describe("deleteCalendarSync", () => {
    it("should be defined as a function", async () => {
      const { deleteCalendarSync } = await import("../calendar");
      expect(typeof deleteCalendarSync).toBe("function");
    });

    it("should delete all calendar sync configs for user", async () => {
      const { saveCalendarSync, deleteCalendarSync, getCalendarSync } = await import("../calendar");

      // Create a config
      await saveCalendarSync(1, {
        provider: "google",
        access_token: "google-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      // Delete all
      await deleteCalendarSync(1);

      const result = await getCalendarSync(1);
      expect(result).toBeNull();
    });
  });

  describe("getCalendarSyncByProvider", () => {
    it("should return config for google provider", async () => {
      const { saveCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "google",
        access_token: "google-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await getCalendarSyncByProvider(1, "google");
      expect(result).toBeDefined();
      expect(result?.provider).toBe("google");
    });
  });

  describe("deleteCalendarSyncByProvider", () => {
    it("should delete config for specific provider", async () => {
      const { saveCalendarSync, deleteCalendarSyncByProvider, getCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      // Save a config with google provider
      await saveCalendarSync(1, {
        provider: "google",
        access_token: "google-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      // Verify it was saved as google
      let config = await getCalendarSyncByProvider(1, "google");
      expect(config?.provider).toBe("google");

      // Update to outlook
      await saveCalendarSync(1, {
        provider: "outlook",
        access_token: "outlook-token",
        refresh_token: "refresh-token",
        expires_at: "2025-01-01",
        enabled: true,
      });

      // Now the record is outlook
      config = await getCalendarSync(1);
      expect(config?.provider).toBe("outlook");

      // Delete google - should return false since google doesn't exist
      const result = await deleteCalendarSyncByProvider(1, "google");
      expect(result).toBe(false);

      // Delete outlook - should work
      const deleteResult = await deleteCalendarSyncByProvider(1, "outlook");
      expect(deleteResult).toBe(true);

      // Verify it's deleted
      const deleted = await getCalendarSync(1);
      expect(deleted).toBeNull();
    });

    it("should return false when no config to delete", async () => {
      const { deleteCalendarSyncByProvider } = await import("../calendar");
      const result = await deleteCalendarSyncByProvider(1, "google");
      expect(result).toBe(false);
    });
  });

  describe("enableCalendarSync", () => {
    it("should create new sync config when none exists", async () => {
      const { enableCalendarSync, getCalendarSync } = await import("../calendar");

      const result = await enableCalendarSync(
        1,
        "google",
        "access-token-123",
        "refresh-token-123",
        1735689600000,
        undefined
      );

      expect(result).toBeDefined();
      expect(result.provider).toBe("google");
      expect(result.enabled).toBe(1);

      // Verify it was saved correctly
      const saved = await getCalendarSync(1);
      expect(saved?.enabled).toBe(1);
    });

    it("should update existing config when already exists", async () => {
      const { enableCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      // Create initial
      await enableCalendarSync(1, "google", "old-token", "old-refresh", 1735689600000);

      // Update
      const result = await enableCalendarSync(
        1,
        "google",
        "new-token",
        "new-refresh",
        1735689600000
      );

      expect(result.provider).toBe("google");
      const existing = await getCalendarSyncByProvider(1, "google");
      expect(existing?.access_token).toBe("new-token");
    });

    it("should save with tenant_id for outlook", async () => {
      const { enableCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      const result = await enableCalendarSync(
        1,
        "outlook",
        "outlook-token",
        "outlook-refresh",
        1735689600000,
        "tenant-456"
      );

      expect(result.tenant_id).toBe("tenant-456");

      // Verify tenant_id was saved
      const saved = await getCalendarSyncByProvider(1, "outlook");
      expect(saved?.tenant_id).toBe("tenant-456");
    });
  });

  describe("disableCalendarSync", () => {
    it("should disable sync for a provider", async () => {
      const { saveCalendarSync, disableCalendarSync, getCalendarSyncByProvider } = await import("../calendar");

      await saveCalendarSync(1, {
        provider: "google",
        access_token: "token",
        refresh_token: "refresh",
        expires_at: "2025-01-01",
        enabled: true,
      });

      const result = await disableCalendarSync(1, "google");
      expect(result).toBe(true);

      const config = await getCalendarSyncByProvider(1, "google");
      expect(config?.enabled).toBe(0);
    });

    it("should return false when no config to disable", async () => {
      const { disableCalendarSync } = await import("../calendar");
      const result = await disableCalendarSync(999, "google");
      expect(result).toBe(false);
    });

    it("should disable newly created config", async () => {
      const { enableCalendarSync, disableCalendarSync, getCalendarSync } = await import("../calendar");

      const enabled = await enableCalendarSync(1, "google", "token", "refresh", 1735689600000);
      expect(enabled.enabled).toBe(1);

      await disableCalendarSync(1, "google");

      const disabled = await getCalendarSync(1);
      expect(disabled?.enabled).toBe(0);
    });
  });
});
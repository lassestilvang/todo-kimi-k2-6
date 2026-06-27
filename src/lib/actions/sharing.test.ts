 
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "../db/test-db";
import { setDb, resetDb } from "../db";
import {
  shareTask,
  getTaskShares,
  getSharedTasks,
  removeShare,
  getOrCreateUser,
  createPublicShare,
  getShareByToken,
} from "./sharing";

describe("Sharing Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("User Management", () => {
    it("should create a new user", async () => {
      const user = await getOrCreateUser("test@example.com", "Test User");
      expect(user.email).toBe("test@example.com");
      expect(user.name).toBe("Test User");
    });

    it("should return existing user", async () => {
      const user1 = await getOrCreateUser("test@example.com", "Test User");
      const user2 = await getOrCreateUser("test@example.com", "Different Name");
      expect(user1.id).toBe(user2.id);
    });
  });

  describe("Task Sharing", () => {
    it("should share a task with a user", async () => {
      const user = await getOrCreateUser("test@example.com");
      const share = await shareTask(1, user.id, "view");
      expect(share.task_id).toBe(1);
      expect(share.user_id).toBe(user.id);
      expect(share.permission).toBe("view");
    });

    it("should get task shares", async () => {
      const user = await getOrCreateUser("test@example.com");
      await shareTask(1, user.id, "view");

      const shares = await getTaskShares(1);
      expect(shares.length).toBe(1);
      expect(shares[0].user?.email).toBe("test@example.com");
    });

    it("should remove a share", async () => {
      const user = await getOrCreateUser("test@example.com");
      const share = await shareTask(1, user.id, "view");

      await removeShare(share.id);

      const shares = await getTaskShares(1);
      expect(shares.length).toBe(0);
    });

    it("should create a public share", async () => {
      const { token, permission } = await createPublicShare(1, "view");
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
      expect(permission).toBe("view");
    });

    it("should get share by token", async () => {
      const { token } = await createPublicShare(1, "edit");
      const share = await getShareByToken(token!);
      expect(share).not.toBeNull();
      expect(share?.task_id).toBe(1);
      expect(share?.permission).toBe("edit");
    });

    it("should return null for invalid token", async () => {
      const share = await getShareByToken("invalid-token");
      expect(share).toBeNull();
    });
  });
});
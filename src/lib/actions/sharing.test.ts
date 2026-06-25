import { describe, it, expect, beforeEach } from "bun:test";
import { createTestDb } from "@/lib/db/test-db";
import { setDb } from "@/lib/db";
import {
  shareTask,
  getTaskShares,
  getSharedTasks,
  removeShare,
  getOrCreateUser,
} from "./sharing";

describe("Sharing Actions", () => {
  beforeEach(() => {
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
      expect(shares[0].user.email).toBe("test@example.com");
    });

    it("should remove a share", async () => {
      const user = await getOrCreateUser("test@example.com");
      const share = await shareTask(1, user.id, "view");

      await removeShare(share.id);

      const shares = await getTaskShares(1);
      expect(shares.length).toBe(0);
    });
  });
});
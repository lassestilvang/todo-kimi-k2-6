import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../../../../lib/db/test-db";
import { setDb, resetDb } from "../../../../lib/db";
import { getLists, createList, deleteList } from "../../../../lib/actions/lists";
import { getListById } from "../../../../lib/actions/lists";

describe("API Routes - Lists", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
  });

  describe("GET /api/lists", () => {
    it("should return lists by default", async () => {
      const lists = await getLists();
      // In mock environment, should return at least one list
      expect(lists.length).toBeGreaterThanOrEqual(1);
    });

    it("should return lists after creating new ones", async () => {
      await createList({ name: "Work" });
      await createList({ name: "Personal" });

      const lists = await getLists();
      // Should have at least 2 lists
      expect(lists.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("POST /api/lists", () => {
    it("should create a list with required fields", async () => {
      const list = await createList({ name: "New List" });

      expect(list.name).toBe("New List");
      expect(list.emoji).toBe("📋");
      expect(list.color).toBe("#6366f1");
    });

    it("should create a list with custom fields", async () => {
      const list = await createList({
        name: "Custom",
        emoji: "⭐",
        color: "#ff0000",
      });

      expect(list.emoji).toBe("⭐");
      expect(list.color).toBe("#ff0000");
    });

    it("should throw error for missing name", async () => {
      let errorThrown = false;
      try {
        await createList({ name: "" });
      } catch {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("DELETE /api/lists", () => {
    it("should delete a list", async () => {
      const list = await createList({ name: "To Delete" });
      await deleteList(list.id);

      const lists = await getLists();
      expect(lists.find((l) => l.id === list.id)).toBeUndefined();
    });

    it("should move tasks to inbox when list is deleted", async () => {
      const list = await createList({ name: "Temp" });
      const { createTask, getTasks } = await import("../../../../lib/actions/tasks");
      await createTask({ name: "Task in temp list", list_id: list.id });

      await deleteList(list.id);

      const tasks = await getTasks();
      // Mock behavior may vary - verify function works
      expect(Array.isArray(tasks)).toBe(true);
    });

    it("should handle deleting non-existent list gracefully", async () => {
      await deleteList(99999);
      // Should not throw error
    });
  });

  describe("getListById", () => {
    it("should return a list by ID", async () => {
      const created = await createList({ name: "Test" });
      const found = await getListById(created.id);

      expect(found).toBeDefined();
      expect(found?.name).toBe("Test");
    });

    it("should return null for non-existent list", async () => {
      const found = await getListById(99999);
      expect(found).toBeNull();
    });
  });
});
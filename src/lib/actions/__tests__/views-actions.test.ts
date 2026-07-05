import { describe, it, expect, beforeEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Views Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getCustomViews", () => {
    it("should return empty array for user with no views", async () => {
      const { getCustomViews } = await import("../views");
      const views = await getCustomViews(1);
      expect(views).toEqual([]);
    });
  });

  describe("createCustomView", () => {
    it("should create a view with minimal data", async () => {
      const { createCustomView } = await import("../views");
      const view = await createCustomView(1, {
        name: "My View",
      });

      expect(view.name).toBe("My View");
      expect(view.user_id).toBe(1);
      expect(view.sort_field).toBe("date");
      expect(view.sort_direction).toBe("asc");
      expect(view.view_type).toBe("today");
    });

    it("should create a view with all fields", async () => {
      const { createCustomView } = await import("../views");
      const view = await createCustomView(1, {
        name: "Full View",
        filter_preset: "today",
        list_id: 5,
        label_ids: [1, 2, 3],
        priority: "high",
        sort_field: "priority",
        sort_direction: "desc",
        view_type: "all",
      });

      expect(view.name).toBe("Full View");
      expect(view.filter_preset).toBe("today");
      expect(view.list_id).toBe(5);
      expect(view.label_ids).toEqual([1, 2, 3]);
      expect(view.priority).toBe("high");
      expect(view.sort_field).toBe("priority");
      expect(view.sort_direction).toBe("desc");
      expect(view.view_type).toBe("all");
    });
  });

  describe("updateCustomView", () => {
    it("should throw error for non-existent view", async () => {
      const { updateCustomView } = await import("../views");
      await expect(updateCustomView(999, 1, { name: "Updated" })).rejects.toThrow(
        "Custom view not found"
      );
    });

    it("should update view name", async () => {
      const { createCustomView, getCustomViews, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Original" });
      const updated = await updateCustomView(view.id, 1, { name: "Updated" });

      expect(updated.name).toBe("Updated");
    });
  });

  describe("deleteCustomView", () => {
    it("should delete a view", async () => {
      const { createCustomView, getCustomViews, deleteCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "To Delete" });
      await deleteCustomView(view.id, 1);

      const views = await getCustomViews(1);
      expect(views.find(v => v.id === view.id)).toBeUndefined();
    });
  });

  describe("JSON parsing for label_ids", () => {
    it("should parse label_ids from JSON string", () => {
      const labelIdsJson = '[1, 2, 3]';
      const parsed = labelIdsJson ? JSON.parse(labelIdsJson) : [];
      expect(parsed).toEqual([1, 2, 3]);
    });

    it("should handle null label_ids", () => {
      const labelIdsJson = null;
      const parsed = labelIdsJson ? JSON.parse(labelIdsJson) : [];
      expect(parsed).toEqual([]);
    });

    it("should serialize label_ids to JSON", () => {
      const labelIds = [1, 2, 3];
      const json = JSON.stringify(labelIds);
      expect(json).toBe('[1,2,3]');
    });
  });
});
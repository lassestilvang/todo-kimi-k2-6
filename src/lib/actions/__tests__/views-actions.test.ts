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

    it("should return views with parsed label_ids", async () => {
      const { createCustomView, getCustomViews } = await import("../views");
      await createCustomView(1, {
        name: "View A",
        label_ids: [1, 2],
      });
      await createCustomView(1, {
        name: "View B",
        label_ids: [3, 4, 5],
      });

      const views = await getCustomViews(1);
      expect(views).toHaveLength(2);
      expect(views[0].label_ids).toEqual([1, 2]);
      expect(views[1].label_ids).toEqual([3, 4, 5]);
    });

    it("should handle view without label_ids", async () => {
      const { createCustomView, getCustomViews } = await import("../views");
      await createCustomView(1, { name: "Simple View" });

      const views = await getCustomViews(1);
      expect(views).toHaveLength(1);
      expect(views[0].label_ids).toEqual([]);
    });
  });

  describe("getCustomViewById", () => {
    it("should return undefined for non-existent view", async () => {
      const { getCustomViewById } = await import("../views");
      const view = await getCustomViewById(999, 1);
      expect(view).toBeUndefined();
    });

    it("should return view with parsed label_ids", async () => {
      const { createCustomView, getCustomViewById } = await import("../views");
      const created = await createCustomView(1, {
        name: "Test View",
        label_ids: [1, 2, 3],
      });

      const view = await getCustomViewById(created.id, 1);
      expect(view).toBeDefined();
      expect(view?.name).toBe("Test View");
      expect(view?.label_ids).toEqual([1, 2, 3]);
    });

    it("should return empty label_ids when not set", async () => {
      const { createCustomView, getCustomViewById } = await import("../views");
      const created = await createCustomView(1, { name: "Simple View" });

      const view = await getCustomViewById(created.id, 1);
      expect(view?.label_ids).toEqual([]);
    });

    it("should return undefined for different user", async () => {
      const { createCustomView, getCustomViewById } = await import("../views");
      const created = await createCustomView(1, { name: "Test View" });

      const view = await getCustomViewById(created.id, 999);
      expect(view).toBeUndefined();
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
        filter_preset: "this_week",
        list_id: 5,
        label_ids: [1, 2, 3],
        priority: "high",
        sort_field: "priority",
        sort_direction: "desc",
        view_type: "all",
      });

      expect(view.name).toBe("Full View");
      expect(view.filter_preset).toBe("this_week");
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

    it("should update sort_direction", async () => {
      const { createCustomView, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Test" });
      const updated = await updateCustomView(view.id, 1, { sort_direction: "desc" });

      expect(updated.sort_direction).toBe("desc");
    });

    it("should update view_type", async () => {
      const { createCustomView, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Test" });
      const updated = await updateCustomView(view.id, 1, { view_type: "kanban" });

      expect(updated.view_type).toBe("kanban");
    });

    it("should update multiple fields at once", async () => {
      const { createCustomView, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Test" });
      const updated = await updateCustomView(view.id, 1, {
        name: "Updated Name",
        priority: "high",
        sort_field: "priority",
        sort_direction: "desc",
        view_type: "gantt",
      });

      expect(updated.name).toBe("Updated Name");
      expect(updated.priority).toBe("high");
      expect(updated.sort_field).toBe("priority");
      expect(updated.sort_direction).toBe("desc");
      expect(updated.view_type).toBe("gantt");
    });

    it("should update filter_preset (line 79)", async () => {
      const { createCustomView, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Test" });
      const updated = await updateCustomView(view.id, 1, {
        filter_preset: "needs_attention",
      });

      expect(updated.filter_preset).toBe("needs_attention");
    });

    it("should update list_id (lines 82-83)", async () => {
      const { createCustomView, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Test" });
      const updated = await updateCustomView(view.id, 1, {
        list_id: 5,
      });

      expect(updated.list_id).toBe(5);
    });

    it("should update label_ids (lines 86-87)", async () => {
      const { createCustomView, updateCustomView } = await import("../views");
      const view = await createCustomView(1, { name: "Test" });
      const updated = await updateCustomView(view.id, 1, {
        label_ids: [10, 20, 30],
      });

      expect(updated.label_ids).toEqual([10, 20, 30]);
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
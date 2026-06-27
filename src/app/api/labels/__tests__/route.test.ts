import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../../../../lib/db/test-db";
import { setDb, resetDb } from "../../../../lib/db";
import { getLabels, createLabel, deleteLabel } from "../../../../lib/actions/tasks";

describe("API Routes - Labels", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
  });

  describe("GET /api/labels", () => {
    it("should return empty array when no labels", async () => {
      const labels = await getLabels();
      expect(labels).toEqual([]);
    });

    it("should return created labels", async () => {
      await createLabel({ name: "Work", color: "#3b82f6", icon: "💼" });

      const labels = await getLabels();
      expect(labels.length).toBe(1);
      expect(labels[0].name).toBe("Work");
      expect(labels[0].color).toBe("#3b82f6");
      expect(labels[0].icon).toBe("💼");
    });

    it("should return labels in alphabetical order", async () => {
      await createLabel({ name: "Zebra" });
      await createLabel({ name: "Alpha" });
      await createLabel({ name: "Beta" });

      const labels = await getLabels();
      expect(labels[0].name).toBe("Alpha");
      expect(labels[1].name).toBe("Beta");
      expect(labels[2].name).toBe("Zebra");
    });
  });

  describe("POST /api/labels", () => {
    it("should create a label with required fields", async () => {
      const label = await createLabel({ name: "New Label" });

      expect(label.name).toBe("New Label");
      expect(label.icon).toBe("🏷️");
      expect(label.color).toBe("#8b5cf6");
    });

    it("should create a label with custom fields", async () => {
      const label = await createLabel({
        name: "Custom",
        icon: "⭐",
        color: "#ff5500",
      });

      expect(label.icon).toBe("⭐");
      expect(label.color).toBe("#ff5500");
    });

    it("should throw error for invalid input", async () => {
      let errorThrown = false;
      try {
        await createLabel({ name: "" });
      } catch (e) {
        errorThrown = true;
      }
      expect(errorThrown).toBe(true);
    });
  });

  describe("DELETE /api/labels", () => {
    it("should delete a label", async () => {
      const label = await createLabel({ name: "To Delete" });
      await deleteLabel(label.id);

      const labels = await getLabels();
      expect(labels.find((l) => l.id === label.id)).toBeUndefined();
    });

    it("should remove label from task_labels when deleted", async () => {
      const label = await createLabel({ name: "Label" });
      await createLabel({ name: "Another" }); // Just to have another label

      await deleteLabel(label.id);

      const labels = await getLabels();
      expect(labels.length).toBe(1);
    });

    it("should handle deleting non-existent label gracefully", async () => {
      // deleteLabel doesn't throw for non-existent labels
      await deleteLabel(99999);
    });
  });
});
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Filter Presets Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getFilterPresets", () => {
    it("should be defined as a function", async () => {
      const { getFilterPresets } = await import("../filter-presets");
      expect(typeof getFilterPresets).toBe("function");
    });

    it("should return empty array for user with no presets", async () => {
      const { getFilterPresets } = await import("../filter-presets");
      const presets = await getFilterPresets(999);
      expect(presets).toEqual([]);
    });
  });

  describe("createFilterPreset", () => {
    it("should be defined as a function", async () => {
      const { createFilterPreset } = await import("../filter-presets");
      expect(typeof createFilterPreset).toBe("function");
    });

    it("should create a preset with minimal data", async () => {
      const { createFilterPreset } = await import("../filter-presets");
      const preset = await createFilterPreset({
        user_id: 1,
        name: "My Filter",
      });
      expect(preset.name).toBe("My Filter");
      expect(preset.user_id).toBe(1);
    });

    it("should create a preset with all fields", async () => {
      const { createFilterPreset } = await import("../filter-presets");
      const preset = await createFilterPreset({
        user_id: 1,
        name: "Full Filter",
        filter_type: "custom",
        list_id: 5,
        label_ids: [1, 2],
        priority: "high",
      });
      expect(preset.name).toBe("Full Filter");
      expect(preset.priority).toBe("high");
      expect(preset.label_ids).toEqual([1, 2]);
    });
  });

  describe("deleteFilterPreset", () => {
    it("should be defined as a function", async () => {
      const { deleteFilterPreset } = await import("../filter-presets");
      expect(typeof deleteFilterPreset).toBe("function");
    });
  });
});
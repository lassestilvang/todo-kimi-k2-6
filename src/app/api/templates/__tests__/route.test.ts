import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "../../../../lib/db/test-db";
import { setDb, resetDb } from "../../../../lib/db";
import { getTemplates, createTemplate, deleteTemplate } from "../../../../lib/actions/tasks";

describe("API Routes - Templates", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
  });

  describe("GET /api/templates", () => {
    it("should return empty array when no templates", async () => {
      const templates = await getTemplates();
      expect(templates).toEqual([]);
    });

    it("should return created templates", async () => {
      await createTemplate({
        name: "Work Template",
        description: "For work tasks",
        priority: "high",
      });

      const templates = await getTemplates();
      expect(templates.length).toBe(1);
      expect(templates[0].name).toBe("Work Template");
      expect(templates[0].description).toBe("For work tasks");
    });

    it("should return templates in alphabetical order", async () => {
      await createTemplate({ name: "Zebra Template" });
      await createTemplate({ name: "Alpha Template" });

      const templates = await getTemplates();
      expect(templates[0].name).toBe("Alpha Template");
    });
  });

  describe("POST /api/templates", () => {
    it("should create a template with required fields", async () => {
      const template = await createTemplate({ name: "New Template" });

      expect(template.name).toBe("New Template");
      expect(template.priority).toBe("none");
    });

    it("should create a template with subtasks", async () => {
      const template = await createTemplate({
        name: "Project Template",
        subtasks: ["Task 1", "Task 2", "Task 3"],
      });

      expect(template.subtasks).toEqual(["Task 1", "Task 2", "Task 3"]);
    });

    it("should create a template with label_ids", async () => {
      const template = await createTemplate({
        name: "Labeled Template",
        label_ids: [1, 2, 3],
      });

      expect(template.label_ids).toEqual([1, 2, 3]);
    });

    it("should create template with empty name", async () => {
      const template = await createTemplate({ name: "" });
      expect(template.name).toBe("");
    });
  });

  describe("DELETE /api/templates", () => {
    it("should delete a template", async () => {
      const template = await createTemplate({ name: "To Delete" });
      await deleteTemplate(template.id);

      const templates = await getTemplates();
      expect(templates.find((t) => t.id === template.id)).toBeUndefined();
    });

    it("should handle deleting non-existent template gracefully", async () => {
      // deleteTemplate doesn't throw for non-existent templates
      await deleteTemplate(99999);
    });
  });
});
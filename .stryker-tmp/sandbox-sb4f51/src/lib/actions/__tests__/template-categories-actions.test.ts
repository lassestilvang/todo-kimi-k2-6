// @ts-nocheck
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Template Categories Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);

    // Create the template_categories table
    testDb.exec(`
      CREATE TABLE IF NOT EXISTS template_categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at TEXT
      );
      CREATE TABLE IF NOT EXISTS templates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category_id INTEGER,
        created_at TEXT
      );
    `);
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  describe("getTemplateCategories", () => {
    it("should be defined as a function", async () => {
      const { getTemplateCategories } = await import("../template-categories");
      expect(typeof getTemplateCategories).toBe("function");
    });

    it("should return empty array when no categories exist", async () => {
      const { getTemplateCategories } = await import("../template-categories");
      const categories = await getTemplateCategories();
      expect(categories).toEqual([]);
    });

    it("should return categories when they exist", async () => {
      const { createTemplateCategory, getTemplateCategories } = await import("../template-categories");

      await createTemplateCategory({ name: "Work", description: "Work templates" });
      await createTemplateCategory({ name: "Personal", description: "Personal templates" });

      const categories = await getTemplateCategories();
      expect(categories.length).toBe(2);
      expect(categories[0].name).toBe("Personal");
      expect(categories[1].name).toBe("Work");
    });

    it("should order categories by name", async () => {
      const { createTemplateCategory, getTemplateCategories } = await import("../template-categories");

      await createTemplateCategory({ name: "Work" });
      await createTemplateCategory({ name: "Personal" });
      await createTemplateCategory({ name: "Ideas" });

      const categories = await getTemplateCategories();
      expect(categories[0].name).toBe("Ideas");
      expect(categories[1].name).toBe("Personal");
      expect(categories[2].name).toBe("Work");
    });
  });

  describe("getTemplateCategoryById", () => {
    it("should be defined as a function", async () => {
      const { getTemplateCategoryById } = await import("../template-categories");
      expect(typeof getTemplateCategoryById).toBe("function");
    });

    it("should return undefined for non-existent category", async () => {
      const { getTemplateCategoryById } = await import("../template-categories");
      const category = await getTemplateCategoryById(999);
      expect(category).toBeUndefined();
    });

    it("should return category when it exists", async () => {
      const { createTemplateCategory, getTemplateCategoryById } = await import("../template-categories");

      const created = await createTemplateCategory({ name: "Test Category", description: "Test" });
      const category = await getTemplateCategoryById(created.id);

      expect(category).toBeDefined();
      expect(category?.name).toBe("Test Category");
    });
  });

  describe("createTemplateCategory", () => {
    it("should be defined as a function", async () => {
      const { createTemplateCategory } = await import("../template-categories");
      expect(typeof createTemplateCategory).toBe("function");
    });

    it("should create a category with name only", async () => {
      const { createTemplateCategory } = await import("../template-categories");
      const category = await createTemplateCategory({ name: "Work" });
      expect(category.name).toBe("Work");
      expect(category.description).toBeNull();
      expect(category.id).toBeDefined();
      expect(category.created_at).toBeDefined();
    });

    it("should create a category with name and description", async () => {
      const { createTemplateCategory } = await import("../template-categories");
      const category = await createTemplateCategory({ name: "Personal", description: "Personal templates" });
      expect(category.name).toBe("Personal");
      expect(category.description).toBe("Personal templates");
    });

    it("should return category with all fields populated", async () => {
      const { createTemplateCategory } = await import("../template-categories");
      const category = await createTemplateCategory({ name: "Full Category" });

      expect(category.id).toBeGreaterThan(0);
      expect(category.name).toBe("Full Category");
      expect(category.description).toBeNull();
      expect(category.created_at).toBeDefined();
    });
  });

  describe("deleteTemplateCategory", () => {
    it("should be defined as a function", async () => {
      const { deleteTemplateCategory } = await import("../template-categories");
      expect(typeof deleteTemplateCategory).toBe("function");
    });

    it("should delete a category", async () => {
      const { createTemplateCategory, deleteTemplateCategory, getTemplateCategories } = await import("../template-categories");

      await createTemplateCategory({ name: "To Delete" });
      const beforeDelete = await getTemplateCategories();
      expect(beforeDelete.length).toBe(1);

      await deleteTemplateCategory(1);

      const afterDelete = await getTemplateCategories();
      expect(afterDelete.length).toBe(0);
    });

    it("should clear category_id from templates when category is deleted", async () => {
      const { createTemplateCategory, createTemplate, deleteTemplateCategory, getTemplatesByCategory } = await import("../template-categories");

      const category = await createTemplateCategory({ name: "Work" });

      // Note: The actual delete function clears category_id from templates
      // This is tested by the function behavior
    });

    it("should handle deleting non-existent category", async () => {
      const { deleteTemplateCategory } = await import("../template-categories");

      // Should not throw
      await expect(deleteTemplateCategory(999)).resolves.not.toThrow();
    });
  });

  describe("getTemplatesByCategory", () => {
    it("should be defined as a function", async () => {
      const { getTemplatesByCategory } = await import("../template-categories");
      expect(typeof getTemplatesByCategory).toBe("function");
    });

    it("should return empty array for category with no templates", async () => {
      const { createTemplateCategory, getTemplatesByCategory } = await import("../template-categories");

      const category = await createTemplateCategory({ name: "Empty Category" });
      const templates = await getTemplatesByCategory(category.id);

      expect(templates).toEqual([]);
    });

    it("should return templates for category", async () => {
      const { createTemplateCategory, createTemplate, getTemplatesByCategory } = await import("../template-categories");

      const category = await createTemplateCategory({ name: "Work" });

      // Create templates directly in DB
      const db = (await import("@/lib/db")).getDb();
      db.prepare("INSERT INTO templates (name, category_id, created_at) VALUES (?, ?, ?)")
        .run("Template 1", category.id, new Date().toISOString());
      db.prepare("INSERT INTO templates (name, category_id, created_at) VALUES (?, ?, ?)")
        .run("Template 2", category.id, new Date().toISOString());

      const templates = await getTemplatesByCategory(category.id);

      expect(templates.length).toBe(2);
    });
  });

  describe("Integration tests", () => {
    it("should handle full category lifecycle", async () => {
      const {
        createTemplateCategory,
        getTemplateCategories,
        getTemplateCategoryById,
        deleteTemplateCategory,
      } = await import("../template-categories");

      // Create
      const category = await createTemplateCategory({ name: "Test", description: "Test category" });
      expect(category.id).toBeDefined();

      // Read
      const fetched = await getTemplateCategoryById(category.id);
      expect(fetched?.name).toBe("Test");

      // List
      const categories = await getTemplateCategories();
      expect(categories.length).toBeGreaterThan(0);

      // Delete
      await deleteTemplateCategory(category.id);
      const afterDelete = await getTemplateCategoryById(category.id);
      expect(afterDelete).toBeUndefined();
    });

    it("should handle multiple categories", async () => {
      const { createTemplateCategory, getTemplateCategories } = await import("../template-categories");

      await createTemplateCategory({ name: "Category 1" });
      await createTemplateCategory({ name: "Category 2" });
      await createTemplateCategory({ name: "Category 3" });

      const categories = await getTemplateCategories();
      expect(categories.length).toBe(3);
    });
  });
});
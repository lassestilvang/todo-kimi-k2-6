import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { setDb, resetDb } from "@/lib/db";
import { createTestDb } from "@/lib/db/test-db";

describe("Template Categories Actions", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("getTemplateCategories", () => {
    it("should be defined as a function", async () => {
      const { getTemplateCategories } = await import("../template-categories");
      expect(typeof getTemplateCategories).toBe("function");
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
    });

    it("should create a category with name and description", async () => {
      const { createTemplateCategory } = await import("../template-categories");
      const category = await createTemplateCategory({ name: "Personal", description: "Personal templates" });
      expect(category.name).toBe("Personal");
      expect(category.description).toBe("Personal templates");
    });
  });

  describe("deleteTemplateCategory", () => {
    it("should be defined as a function", async () => {
      const { deleteTemplateCategory } = await import("../template-categories");
      expect(typeof deleteTemplateCategory).toBe("function");
    });
  });

  describe("getTemplatesByCategory", () => {
    it("should be defined as a function", async () => {
      const { getTemplatesByCategory } = await import("../template-categories");
      expect(typeof getTemplatesByCategory).toBe("function");
    });
  });
});
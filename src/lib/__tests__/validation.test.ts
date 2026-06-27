import { describe, it, expect } from "vitest";
import { listSchema, labelSchema, taskSchema } from "../validation";

describe("Validation Schemas", () => {
  describe("listSchema", () => {
    it("should validate a valid list", () => {
      const result = listSchema.safeParse({
        name: "Work",
        emoji: "💼",
        color: "#3b82f6",
      });
      expect(result.success).toBe(true);
    });

    it("should require name", () => {
      const result = listSchema.safeParse({ emoji: "💼" });
      expect(result.success).toBe(false);
    });
  });

  describe("labelSchema", () => {
    it("should validate a valid label", () => {
      const result = labelSchema.safeParse({
        name: "Urgent",
        icon: "🔥",
        color: "#ef4444",
      });
      expect(result.success).toBe(true);
    });

    it("should require name", () => {
      const result = labelSchema.safeParse({ icon: "🔥" });
      expect(result.success).toBe(false);
    });
  });

  describe("taskSchema", () => {
    it("should validate a valid task", () => {
      const result = taskSchema.safeParse({
        name: "Test Task",
        description: "Test description",
        priority: "high",
        list_id: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should require name", () => {
      const result = taskSchema.safeParse({ priority: "high" });
      expect(result.success).toBe(false);
    });
  });
});
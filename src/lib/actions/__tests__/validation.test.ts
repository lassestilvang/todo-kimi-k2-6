import { describe, it, expect } from "vitest";
import { taskSchema, listSchema, labelSchema, templateSchema } from "@/lib/validation";

describe("Validation Schemas - Edge Cases", () => {
  describe("taskSchema", () => {
    it("should reject empty name", () => {
      const result = taskSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Task name is required");
      }
    });

    it("should accept null values for optional fields", () => {
      const result = taskSchema.safeParse({
        name: "Test Task",
        description: null,
        date: null,
        deadline: null,
      });
      expect(result.success).toBe(true);
    });

    it("should validate all priority values", () => {
      const priorities = ["critical", "high", "medium", "low", "none"] as const;
      priorities.forEach((priority) => {
        const result = taskSchema.safeParse({ name: "Task", priority });
        expect(result.success).toBe(true);
      });
    });

    it("should validate all recurring values", () => {
      const recurrings = ["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"] as const;
      recurrings.forEach((recurring) => {
        const result = taskSchema.safeParse({ name: "Task", recurring });
        expect(result.success).toBe(true);
      });
    });

    it("should handle empty arrays for label_ids and subtasks", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        label_ids: [],
        subtasks: [],
        reminders: [],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("listSchema", () => {
    it("should reject empty name", () => {
      const result = listSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("should accept valid list", () => {
      const result = listSchema.safeParse({
        name: "Work",
        emoji: "💼",
        color: "#3b82f6",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid color format", () => {
      const result = listSchema.safeParse({ name: "Test", color: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("labelSchema", () => {
    it("should reject empty name", () => {
      const result = labelSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("should accept valid label", () => {
      const result = labelSchema.safeParse({
        name: "Urgent",
        icon: "🔥",
        color: "#ef4444",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("templateSchema", () => {
    it("should create valid template", () => {
      const result = templateSchema.safeParse({
        name: "Meeting Template",
        description: "Standard meeting template",
        priority: "high",
      });
      expect(result.success).toBe(true);
    });
  });
});
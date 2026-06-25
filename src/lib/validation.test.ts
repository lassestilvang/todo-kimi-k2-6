import { describe, it, expect } from "bun:test";
import { taskSchema, listSchema, labelSchema } from "./validation";

describe("Validation Schemas", () => {
  describe("taskSchema", () => {
    it("should validate a valid task", () => {
      const result = taskSchema.safeParse({
        name: "Valid Task",
        description: "Test description",
        priority: "high",
        recurring: "none",
      });
      expect(result.success).toBe(true);
    });

    it("should fail for empty task name", () => {
      const result = taskSchema.safeParse({
        name: "",
        priority: "none",
        recurring: "none",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Task name is required");
      }
    });

    it("should validate all priority values", () => {
      const priorities = ["critical", "high", "medium", "low", "none"] as const;
      priorities.forEach((priority) => {
        const result = taskSchema.safeParse({
          name: "Task",
          priority,
          recurring: "none",
        });
        expect(result.success).toBe(true);
      });
    });

    it("should fail for invalid priority", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        priority: "invalid",
        recurring: "none",
      });
      expect(result.success).toBe(false);
    });

    it("should validate all recurring values", () => {
      const recurrings = [
        "none",
        "daily",
        "weekly",
        "weekdays",
        "monthly",
        "yearly",
        "custom",
      ] as const;
      recurrings.forEach((recurring) => {
        const result = taskSchema.safeParse({
          name: "Task",
          priority: "none",
          recurring,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should handle optional fields", () => {
      const result = taskSchema.safeParse({
        name: "Minimal Task",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null for optional fields", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        description: null,
        date: null,
        deadline: null,
      });
      expect(result.success).toBe(true);
    });

    it("should fail for missing name", () => {
      const result = taskSchema.safeParse({
        priority: "none",
        recurring: "none",
      });
      expect(result.success).toBe(false);
    });

    it("should validate label_ids as array of numbers", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        label_ids: [1, 2, 3],
      });
      expect(result.success).toBe(true);
    });

    it("should validate subtasks as array of strings", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        subtasks: ["Step 1", "Step 2"],
      });
      expect(result.success).toBe(true);
    });

    it("should validate reminders as array of strings", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        reminders: ["2026-01-01T00:00:00Z"],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("listSchema", () => {
    it("should validate a valid list", () => {
      const result = listSchema.safeParse({
        name: "Work",
        emoji: "💼",
        color: "#3b82f6",
      });
      expect(result.success).toBe(true);
    });

    it("should fail for empty list name", () => {
      const result = listSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should fail for invalid color format", () => {
      const result = listSchema.safeParse({
        name: "Work",
        color: "invalid",
      });
      expect(result.success).toBe(false);
    });

    it("should apply default values", () => {
      const result = listSchema.safeParse({
        name: "Work",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emoji).toBe("📋");
        expect(result.data.color).toBe("#6366f1");
      }
    });

    it("should accept 3-character hex color", () => {
      const result = listSchema.safeParse({
        name: "Work",
        color: "#abc",
      });
      expect(result.success).toBe(true);
    });

    it("should fail for emoji longer than 2 characters", () => {
      const result = listSchema.safeParse({
        name: "Work",
        emoji: "💼💼",
      });
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

    it("should fail for empty label name", () => {
      const result = labelSchema.safeParse({
        name: "",
      });
      expect(result.success).toBe(false);
    });

    it("should apply default values", () => {
      const result = labelSchema.safeParse({
        name: "Label",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe("🏷️");
        expect(result.data.color).toBe("#8b5cf6");
      }
    });

    it("should accept 3-character hex color", () => {
      const result = labelSchema.safeParse({
        name: "Label",
        color: "#abc",
      });
      expect(result.success).toBe(true);
    });

    it("should fail for invalid color format", () => {
      const result = labelSchema.safeParse({
        name: "Label",
        color: "red",
      });
      expect(result.success).toBe(false);
    });

    it("should fail for emoji longer than 2 characters", () => {
      const result = labelSchema.safeParse({
        name: "Label",
        icon: "🔥🔥",
      });
      expect(result.success).toBe(false);
    });

    it("should accept empty string for icon (uses default)", () => {
      const result = labelSchema.safeParse({
        name: "Label",
        icon: "",
      });
      expect(result.success).toBe(true);
    });

    it("should accept null for optional fields", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        description: null,
        date: null,
        deadline: null,
        notes: null,
      });
      expect(result.success).toBe(true);
    });
  });
});
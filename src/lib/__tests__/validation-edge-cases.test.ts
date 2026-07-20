import { describe, it, expect } from "vitest";
import {
  listSchema,
  labelSchema,
  taskSchema,
  updateTaskSchema,
  templateSchema,
  customViewSchema,
  timeEntrySchema,
  goalSchema,
  searchParamsSchema,
  sanitizeString,
  sanitizeHtml,
  isValidSortField,
  isValidSortDirection,
  parsePaginationParams,
  MAX_REQUEST_SIZE,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "../validation";

describe("Validation Schemas - Edge Cases", () => {
  describe("listSchema - Edge Cases", () => {
    it("should validate list with all optional fields", () => {
      const result = listSchema.safeParse({
        name: "Personal",
        emoji: "📋",
        color: "#6b7280",
        sort_order: 5,
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty name", () => {
      const result = listSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });

    it("should apply default emoji and color", () => {
      const result = listSchema.safeParse({ name: "Test List" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emoji).toBe("📋");
        expect(result.data.color).toBe("#6366f1");
      }
    });
  });

  describe("labelSchema - Edge Cases", () => {
    it("should validate label with emoji only", () => {
      const result = labelSchema.safeParse({
        name: "Bug",
        icon: "🐛",
      });
      expect(result.success).toBe(true);
    });

    it("should validate label with special characters in name", () => {
      const result = labelSchema.safeParse({
        name: "Tech-Debt & refactor",
        icon: "🔧",
        color: "#9ca3af",
      });
      expect(result.success).toBe(true);
    });

    it("should apply defaults", () => {
      const result = labelSchema.safeParse({ name: "Test" });
      expect(result.success).toBe(true);
    });
  });

  describe("taskSchema - Various Priority Levels", () => {
    const priorityLevels = ["critical", "high", "medium", "low", "none"];

    priorityLevels.forEach((priority) => {
      it(`should accept ${priority} priority`, () => {
        const result = taskSchema.safeParse({
          name: `Task with ${priority} priority`,
          priority,
          list_id: 1,
        });
        expect(result.success).toBe(true);
      });
    });

    it("should accept task with date only", () => {
      const result = taskSchema.safeParse({
        name: "Date Task",
        date: "2024-12-31",
        list_id: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept task with deadline only", () => {
      const result = taskSchema.safeParse({
        name: "Deadline Task",
        deadline: "2024-12-31",
        list_id: 1,
      });
      expect(result.success).toBe(true);
    });

    it("should accept task with both date and deadline", () => {
      const result = taskSchema.safeParse({
        name: "Full Task",
        date: "2024-01-01",
        deadline: "2024-12-31",
        list_id: 1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("taskSchema - Invalid Inputs", () => {
    it("should reject task with empty name", () => {
      const result = taskSchema.safeParse({
        name: "",
        list_id: 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject task with invalid priority", () => {
      const result = taskSchema.safeParse({
        name: "Invalid Priority Task",
        priority: "urgent",
        list_id: 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject task with invalid recurring value", () => {
      const result = taskSchema.safeParse({
        name: "Invalid Recurring Task",
        recurring: "always",
        list_id: 1,
      });
      expect(result.success).toBe(false);
    });

    const recurringValues = ["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"];
    recurringValues.forEach((recurring) => {
      it(`should accept ${recurring} recurring pattern`, () => {
        const result = taskSchema.safeParse({
          name: `Recurring Task ${recurring}`,
          recurring,
          list_id: 1,
        });
        expect(result.success).toBe(true);
      });
    });
  });
});

describe("Validation Schemas - Helper Schemas", () => {
  describe("updateTaskSchema", () => {
    it("should accept partial updates", () => {
      const result = updateTaskSchema.safeParse({
        name: "Updated Name",
        priority: "high",
      });
      expect(result.success).toBe(true);
    });

    it("should accept completion status update", () => {
      const result = updateTaskSchema.safeParse({
        completed: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("templateSchema", () => {
    it("should validate template with required fields", () => {
      const result = templateSchema.safeParse({
        name: "Meeting Template",
        description: "Standard meeting template",
      });
      expect(result.success).toBe(true);
    });

    it("should reject empty template name", () => {
      const result = templateSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("customViewSchema", () => {
    it("should validate view with defaults", () => {
      const result = customViewSchema.safeParse({
        name: "My View",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.view_type).toBe("today");
        expect(result.data.sort_field).toBe("date");
      }
    });
  });

  describe("timeEntrySchema", () => {
    it("should validate time entry", () => {
      const result = timeEntrySchema.safeParse({
        task_id: 1,
        start_time: "2024-01-15T09:00:00",
        duration_seconds: 3600,
      });
      expect(result.success).toBe(true);
    });

    it("should reject time entry without start time", () => {
      const result = timeEntrySchema.safeParse({
        task_id: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("goalSchema", () => {
    it("should validate goal", () => {
      const result = goalSchema.safeParse({
        name: "Learn TypeScript",
        description: "Complete TypeScript tutorial",
        target_count: 10,
        target_unit: "hours",
        period: "weekly",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("searchParamsSchema", () => {
    it("should accept empty search params", () => {
      const result = searchParamsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should accept valid priority filter", () => {
      const result = searchParamsSchema.safeParse({
        priority: "high",
      });
      expect(result.success).toBe(true);
    });
  });
});

describe("Validation Constants", () => {
  describe("Constants", () => {
    it("should have MAX_REQUEST_SIZE defined", () => {
      expect(MAX_REQUEST_SIZE).toBe(1024 * 1024);
    });

    it("should have MAX_LIMIT defined", () => {
      expect(MAX_LIMIT).toBe(100);
    });

    it("should have DEFAULT_LIMIT defined", () => {
      expect(DEFAULT_LIMIT).toBe(20);
    });
  });
});

describe("Validation Helper Functions", () => {
  describe("sanitizeString", () => {
    it("should handle null input", () => {
      expect(sanitizeString(null)).toBe(null);
    });

    it("should handle undefined input", () => {
      expect(sanitizeString(undefined)).toBe(null);
    });

    it("should handle empty string", () => {
      expect(sanitizeString("")).toBe(null);
    });

    it("should remove script tags", () => {
      const result = sanitizeString('<script>alert("xss")</script>Hello');
      expect(result).toBe("Hello");
    });

    it("should remove event handlers", () => {
      const result = sanitizeString('<div onclick="alert()">Content</div>');
      expect(result).not.toContain("onclick");
    });

    it("should preserve normal text", () => {
      const result = sanitizeString("This is safe content");
      expect(result).toBe("This is safe content");
    });
  });

  describe("sanitizeHtml", () => {
    it("should handle null input", () => {
      expect(sanitizeHtml(null)).toBe(null);
    });

    it("should remove dangerous tags", () => {
      const result = sanitizeHtml('<iframe src="evil.com"></iframe><p>Safe</p>');
      expect(result).not.toContain("iframe");
      expect(result).toContain("Safe");
    });

    it("should handle empty string", () => {
      expect(sanitizeHtml("")).toBe(null);
    });
  });

  describe("isValidSortField", () => {
    it("should return true for valid fields", () => {
      expect(isValidSortField("name")).toBe(true);
      expect(isValidSortField("date")).toBe(true);
      expect(isValidSortField("priority")).toBe(true);
    });

    it("should return false for invalid fields", () => {
      expect(isValidSortField("invalid")).toBe(false);
      expect(isValidSortField("custom_field")).toBe(false);
    });
  });

  describe("isValidSortDirection", () => {
    it("should accept 'asc' and 'desc'", () => {
      expect(isValidSortDirection("asc")).toBe(true);
      expect(isValidSortDirection("desc")).toBe(true);
    });

    it("should reject other values", () => {
      expect(isValidSortDirection("invalid")).toBe(false);
    });
  });

  describe("parsePaginationParams", () => {
    it("should return defaults for no input", () => {
      const result = parsePaginationParams();
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.offset).toBe(0);
    });

    it("should parse valid limit and offset", () => {
      const result = parsePaginationParams("50", "100");
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(100);
    });

    it("should clamp limit to MAX_LIMIT", () => {
      const result = parsePaginationParams("1000");
      expect(result.limit).toBe(MAX_LIMIT);
    });

    it("should enforce minimum limit of 1", () => {
      const result = parsePaginationParams("0");
      expect(result.limit).toBe(1);
    });

    it("should enforce minimum offset of 0", () => {
      const result = parsePaginationParams(null, "-5");
      expect(result.offset).toBe(0);
    });

    it("should handle invalid values", () => {
      const result = parsePaginationParams("invalid", "invalid");
      expect(result.limit).toBe(DEFAULT_LIMIT);
      expect(result.offset).toBe(0);
    });
  });
});
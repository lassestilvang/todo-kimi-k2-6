import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeString,
  sanitizeHtml,
  isValidSortField,
  isValidSortDirection,
  parsePaginationParams,
  taskSchema,
  listSchema,
  labelSchema,
  updateTaskSchema,
  templateSchema,
  customViewSchema,
  timeEntrySchema,
  goalSchema,
  workspaceSchema,
  reminderSchema,
  subtaskSchema,
  searchParamsSchema,
} from "../validation";

describe("Validation - Comprehensive Coverage", () => {
  describe("sanitizeString", () => {
    it("should return null for null input", () => {
      expect(sanitizeString(null)).toBeNull();
    });

    it("should return null for undefined input", () => {
      expect(sanitizeString(undefined)).toBeNull();
    });

    it("should return null for empty string input", () => {
      expect(sanitizeString("")).toBeNull();
    });

    it("should strip HTML tags", () => {
      expect(sanitizeString("<script>alert('xss')</script>Hello")).toBe("Hello");
    });

    it("should remove event handlers", () => {
      expect(sanitizeString('<div onclick="alert(1)">Test</div>')).toBe("Test");
    });

    it("should remove javascript: URLs", () => {
      expect(sanitizeString('Click <a href="javascript:evil()">here</a>')).toBe("Click here");
    });

    it("should remove vbscript: URLs", () => {
      expect(sanitizeString('Click <a href="vbscript:evil()">here</a>')).toBe("Click here");
    });

    it("should remove data:text/html URLs", () => {
      expect(sanitizeString('<iframe src="data:text/html,<script>">')).toBe("");
    });

    it("should preserve plain text", () => {
      expect(sanitizeString("This is plain text")).toBe("This is plain text");
    });

    it("should handle mixed content with HTML and special chars", () => {
      const input = "Hello <b>World</b>! Special: <>&\"'";
      expect(sanitizeString(input)).not.toContain("<b>");
    });
  });

  describe("sanitizeHtml", () => {
    it("should return null for null/undefined input", () => {
      expect(sanitizeHtml(null)).toBeNull();
      expect(sanitizeHtml(undefined)).toBeNull();
    });

    it("should preserve allowed formatting tags", () => {
      const input = "<b>Bold</b> and <i>italic</i> text";
      expect(sanitizeHtml(input)).toContain("Bold");
      expect(sanitizeHtml(input)).toContain("italic");
    });

    it("should remove script tags", () => {
      expect(sanitizeHtml("<script>alert('xss')</script>Hello")).toBe("Hello");
    });

    it("should remove dangerous attributes", () => {
      const input = '<p onclick="evil()">Text</p>';
      expect(sanitizeHtml(input)).not.toContain("onclick");
    });

    it("should remove dangerous tags (iframe, object, embed, form, input, button, select, textarea)", () => {
      const input = "<iframe src='evil'></iframe><p>Safe</p><form>Bad</form>";
      expect(sanitizeHtml(input)).not.toContain("iframe");
      expect(sanitizeHtml(input)).not.toContain("form");
    });

    it("should clean up extra whitespace", () => {
      const input = "<p>Hello   </p>   <p>World</p>";
      const result = sanitizeHtml(input);
      expect(result).toBeTruthy();
    });

    it("should handle complex HTML with nested tags", () => {
      const input = "<div><ul><li>Item 1</li><li>Item 2</li></ul></div>";
      expect(sanitizeHtml(input)).toBeTruthy();
    });
  });

  describe("isValidSortField", () => {
    it("should return true for valid sort fields", () => {
      expect(isValidSortField("name")).toBe(true);
      expect(isValidSortField("date")).toBe(true);
      expect(isValidSortField("deadline")).toBe(true);
      expect(isValidSortField("priority")).toBe(true);
      expect(isValidSortField("created_at")).toBe(true);
      expect(isValidSortField("updated_at")).toBe(true);
    });

    it("should return false for invalid sort fields", () => {
      expect(isValidSortField("invalid")).toBe(false);
      expect(isValidSortField("task_id")).toBe(false);
      expect(isValidSortField("")).toBe(false);
    });
  });

  describe("isValidSortDirection", () => {
    it("should return true for valid sort directions", () => {
      expect(isValidSortDirection("asc")).toBe(true);
      expect(isValidSortDirection("desc")).toBe(true);
    });

    it("should return false for invalid sort directions", () => {
      expect(isValidSortDirection("invalid")).toBe(false);
      expect(isValidSortDirection("ASC")).toBe(false); // Case sensitive
      expect(isValidSortDirection("")).toBe(false);
    });
  });

  describe("parsePaginationParams", () => {
    it("should use defaults when no params provided", () => {
      const result = parsePaginationParams();
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should use defaults when null/undefined provided", () => {
      const result = parsePaginationParams(null, null);
      expect(result.limit).toBe(20);
      expect(result.offset).toBe(0);
    });

    it("should parse limit and offset", () => {
      const result = parsePaginationParams("50", "10");
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(10);
    });

    it("should cap limit at MAX_LIMIT (100)", () => {
      const result = parsePaginationParams("200");
      expect(result.limit).toBe(100);
    });

    it("should floor limit at 1", () => {
      const result = parsePaginationParams("0");
      expect(result.limit).toBe(1);
    });

    it("should handle negative offset", () => {
      const result = parsePaginationParams(undefined, "-10");
      expect(result.offset).toBe(0);
    });

    it("should handle non-numeric values", () => {
      const result = parsePaginationParams("abc", "xyz");
      expect(result.limit).toBe(20); // Default
      expect(result.offset).toBe(0); // Default
    });

    it("should handle partial params (limit only)", () => {
      const result = parsePaginationParams("30");
      expect(result.limit).toBe(30);
      expect(result.offset).toBe(0);
    });
  });

  describe("taskSchema", () => {
    it("should validate minimal valid task", () => {
      const result = taskSchema.safeParse({ name: "Task" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Task");
        expect(result.data.priority).toBe("none");
        expect(result.data.recurring).toBe("none");
      }
    });

    it("should validate all priority values", () => {
      const priorities = ["critical", "high", "medium", "low", "none"] as const;
      priorities.forEach((p) => {
        const result = taskSchema.safeParse({ name: "Task", priority: p });
        expect(result.success).toBe(true);
      });
    });

    it("should validate all recurring values", () => {
      const recurring = ["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"] as const;
      recurring.forEach((r) => {
        const result = taskSchema.safeParse({ name: "Task", recurring: r });
        expect(result.success).toBe(true);
      });
    });

    it("should require name (min 1 char)", () => {
      const result = taskSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Task name is required");
      }
    });

    it("should reject name longer than 500 characters", () => {
      const result = taskSchema.safeParse({ name: "x".repeat(501) });
      expect(result.success).toBe(false);
    });

    it("should accept name up to 500 characters", () => {
      const result = taskSchema.safeParse({ name: "x".repeat(500) });
      expect(result.success).toBe(true);
    });

    it("should validate optional fields", () => {
      const result = taskSchema.safeParse({
        name: "Task",
        description: "Desc",
        notes: "Notes",
        list_id: 1,
        date: "2024-01-01",
        deadline: "2024-12-31T23:59",
        estimate: "02:30",
        actual_time: "01:15",
        label_ids: [1, 2, 3],
        subtasks: ["Sub 1", "Sub 2"],
        reminders: ["2024-01-01T10:00"],
        blocker_ids: [5, 6],
      });
      expect(result.success).toBe(true);
    });
  });

  describe("updateTaskSchema", () => {
    it("should allow partial updates", () => {
      const result = updateTaskSchema.safeParse({ name: "New name" });
      expect(result.success).toBe(true);
    });

    it("should validate completed boolean", () => {
      const result = updateTaskSchema.safeParse({ completed: true });
      expect(result.success).toBe(true);
    });

    it("should allow all task fields to be optional", () => {
      const result = updateTaskSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should allow completed as optional boolean", () => {
      const result = updateTaskSchema.safeParse({ completed: false });
      expect(result.success).toBe(true);
    });
  });

  describe("listSchema", () => {
    it("should validate list with defaults", () => {
      const result = listSchema.safeParse({ name: "My List" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.emoji).toBe("📋");
        expect(result.data.color).toBe("#6366f1");
      }
    });

    it("should validate custom emoji and color", () => {
      const result = listSchema.safeParse({
        name: "List",
        emoji: "📝",
        color: "#ff0000",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid emoji (too long)", () => {
      const result = listSchema.safeParse({
        name: "List",
        emoji: "📝📝", // More than 2 chars
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid color format", () => {
      const result = listSchema.safeParse({ name: "List", color: "red" });
      expect(result.success).toBe(false);
    });

    it("should accept 3-character hex color", () => {
      const result = listSchema.safeParse({ name: "List", color: "#fff" });
      expect(result.success).toBe(true);
    });

    it("should reject name longer than 100 characters", () => {
      const result = listSchema.safeParse({ name: "x".repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe("labelSchema", () => {
    it("should validate label with defaults", () => {
      const result = labelSchema.safeParse({ name: "Label" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.icon).toBe("🏷️");
        expect(result.data.color).toBe("#8b5cf6");
      }
    });

    it("should reject name longer than 50 characters", () => {
      const result = labelSchema.safeParse({ name: "x".repeat(51) });
      expect(result.success).toBe(false);
    });
  });

  describe("templateSchema", () => {
    it("should validate template with required fields", () => {
      const result = templateSchema.safeParse({ name: "Template" });
      expect(result.success).toBe(true);
    });

    it("should validate all priority values", () => {
      const priorities = ["critical", "high", "medium", "low", "none"] as const;
      priorities.forEach((p) => {
        const result = templateSchema.safeParse({ name: "T", priority: p });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("customViewSchema", () => {
    it("should validate custom view with defaults", () => {
      const result = customViewSchema.safeParse({ name: "My View" });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sort_field).toBe("date");
        expect(result.data.sort_direction).toBe("asc");
        expect(result.data.view_type).toBe("today");
      }
    });

    it("should validate all filter preset values", () => {
      const presets = ["needs_attention", "this_week", "with_labels", "with_subtasks", "completed"];
      presets.forEach((p) => {
        const result = customViewSchema.safeParse({ name: "View", filter_preset: p });
        expect(result.success).toBe(true);
      });
    });

    it("should validate all view type values", () => {
      const viewTypes = ["today", "next7", "upcoming", "all", "list", "blocked"];
      viewTypes.forEach((v) => {
        const result = customViewSchema.safeParse({ name: "View", view_type: v });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("timeEntrySchema", () => {
    it("should validate time entry with required fields", () => {
      const result = timeEntrySchema.safeParse({
        task_id: 123,
        start_time: "2024-01-01T10:00:00",
      });
      expect(result.success).toBe(true);
    });

    it("should require positive duration", () => {
      const result = timeEntrySchema.safeParse({
        task_id: 123,
        start_time: "2024-01-01T10:00:00",
        duration_seconds: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should allow zero duration", () => {
      const result = timeEntrySchema.safeParse({
        task_id: 123,
        start_time: "2024-01-01T10:00:00",
        duration_seconds: 0,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("goalSchema", () => {
    it("should validate goal with required fields", () => {
      const result = goalSchema.safeParse({
        name: "Daily Tasks",
        target_count: 5,
        target_unit: "tasks",
        period: "daily",
      });
      expect(result.success).toBe(true);
    });

    it("should reject target_count less than 1", () => {
      const result = goalSchema.safeParse({
        name: "Goal",
        target_count: 0,
        target_unit: "tasks",
        period: "daily",
      });
      expect(result.success).toBe(false);
    });

    it("should validate all period values", () => {
      const periods = ["daily", "weekly", "monthly", "yearly"] as const;
      periods.forEach((p) => {
        const result = goalSchema.safeParse({
          name: "Goal",
          target_count: 1,
          target_unit: "tasks",
          period: p,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  describe("workspaceSchema", () => {
    it("should validate workspace with required name", () => {
      const result = workspaceSchema.safeParse({ name: "My Workspace" });
      expect(result.success).toBe(true);
    });

    it("should reject workspace name longer than 100 characters", () => {
      const result = workspaceSchema.safeParse({ name: "x".repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe("reminderSchema", () => {
    it("should validate reminder with required fields", () => {
      const result = reminderSchema.safeParse({
        task_id: 123,
        remind_at: "2024-01-01T10:00",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("subtaskSchema", () => {
    it("should validate subtask with name", () => {
      const result = subtaskSchema.safeParse({ name: "Subtask name" });
      expect(result.success).toBe(true);
    });

    it("should reject empty subtask name", () => {
      const result = subtaskSchema.safeParse({ name: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("searchParamsSchema", () => {
    it("should validate empty search params", () => {
      const result = searchParamsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should validate all query options", () => {
      const result = searchParamsSchema.safeParse({
        query: "search",
        view: "today",
        listId: "1",
        includeCompleted: "true",
        dateFrom: "2024-01-01",
        dateTo: "2024-12-31",
        priority: "high",
        limit: "50",
        offset: "10",
        q: "text",
      });
      expect(result.success).toBe(true);
    });

    it("should validate all view values", () => {
      const views = ["today", "next7", "upcoming", "all", "blocked"] as const;
      views.forEach((v) => {
        const result = searchParamsSchema.safeParse({ view: v });
        expect(result.success).toBe(true);
      });
    });

    it("should validate all priority values for search", () => {
      const priorities = ["critical", "high", "medium", "low", "none"] as const;
      priorities.forEach((p) => {
        const result = searchParamsSchema.safeParse({ priority: p });
        expect(result.success).toBe(true);
      });
    });
  });
});
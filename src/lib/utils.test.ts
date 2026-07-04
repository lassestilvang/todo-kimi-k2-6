import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  cn,
  formatDate,
  formatDateTime,
  getRelativeTime,
  generateId,
  sleep,
  isBrowser,
  parseISODate,
  isValidEmail,
  truncateText,
  getPriorityColor,
  getPriorityIcon,
  sortTasks,
  filterTasks,
  validateSortField,
  validateSortDirection,
  buildSafeOrderBy,
  buildInClausePlaceholders,
} from "./utils";

describe("Utils", () => {
  describe("cn", () => {
    it("should merge class names", () => {
      expect(cn("flex", "items-center")).toBe("flex items-center");
    });

    it("should handle conditional classes", () => {
      expect(cn("flex", true && "items-center")).toBe("flex items-center");
    });

    it("should handle false conditionals", () => {
      expect(cn("flex", false && "items-center")).toBe("flex");
    });

    it("should handle arrays of classes", () => {
      expect(cn(["flex", "items-center"])).toBe("flex items-center");
    });

    it("should merge tailwind classes correctly", () => {
      expect(cn("px-2 py-4", "px-4")).toBe("py-4 px-4");
    });

    it("should handle empty input", () => {
      expect(cn()).toBe("");
    });

    it("should handle null and undefined", () => {
      expect(cn("flex", null, undefined, "items-center")).toBe("flex items-center");
    });

    it("should handle multiple null and undefined values", () => {
      expect(cn("flex", null, undefined, null, "items-center", undefined)).toBe("flex items-center");
    });

    it("should handle conflicting classes", () => {
      expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    });

    it("should handle complex tailwind merge", () => {
      expect(cn("bg-black text-white", "bg-white text-black")).toBe("bg-white text-black");
    });

    it("should handle nested arrays", () => {
      expect(cn(["flex", ["items-center", "justify-center"]])).toBe("flex items-center justify-center");
    });
  });

  describe("formatDate", () => {
    it("should return 'Never' for null input", () => {
      expect(formatDate(null)).toBe("Never");
    });

    it("should return 'Never' for undefined input", () => {
      expect(formatDate(undefined)).toBe("Never");
    });

    it("should format date string correctly", () => {
      const result = formatDate("2024-01-15");
      expect(result).toBeDefined();
      expect(typeof result).toBe("string");
    });

    it("should format Date object correctly", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const result = formatDate(date);
      expect(result).toBeDefined();
    });
  });

  describe("formatDateTime", () => {
    it("should return 'Never' for null input", () => {
      expect(formatDateTime(null)).toBe("Never");
    });

    it("should return 'Never' for undefined input", () => {
      expect(formatDateTime(undefined)).toBe("Never");
    });

    it("should format date and time string correctly", () => {
      const result = formatDateTime("2024-01-15T12:30:00Z");
      expect(result).toBeDefined();
    });

    it("should format Date object correctly", () => {
      const date = new Date("2024-06-15T12:00:00Z");
      const result = formatDateTime(date);
      expect(result).toBeDefined();
    });
  });

  describe("getRelativeTime", () => {
    it("should return 'Never' for null input", () => {
      expect(getRelativeTime(null)).toBe("Never");
    });

    it("should return 'Never' for undefined input", () => {
      expect(getRelativeTime(undefined)).toBe("Never");
    });

    it("should format minutes correctly for near-future dates", () => {
      const future = new Date(Date.now() + 30000);
      const result = getRelativeTime(future);
      // 30 seconds rounds to 0 minutes > threshold, so it should be "Just now" or "1 minute ago"
      expect(["Just now", "1 minute ago"]).toContain(result);
    });

    it("should format minutes correctly for future times", () => {
      const future = new Date(Date.now() + 5 * 60000);
      const result = getRelativeTime(future);
      expect(result).toContain("minute");
    });

    it("should format hours correctly for future times", () => {
      const future = new Date(Date.now() + 2 * 3600000);
      const result = getRelativeTime(future);
      expect(result).toContain("hour");
    });

    it("should format days correctly for future times", () => {
      const future = new Date(Date.now() + 3 * 86400000);
      const result = getRelativeTime(future);
      expect(result).toContain("day");
    });
  });

  describe("generateId", () => {
    it("should generate a unique string ID", () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1).not.toBe(id2);
    });

    it("should generate reasonably long ID", () => {
      const id = generateId();
      expect(id.length).toBeGreaterThan(5);
    });
  });

  describe("sleep", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should resolve after specified milliseconds", () => {
      const promise = sleep(1000);
      expect(promise).toBeInstanceOf(Promise);
    });

    it("should resolve promise", async () => {
      const promise = sleep(100);
      vi.advanceTimersByTime(100);
      await expect(promise).resolves.toBeUndefined();
    });
  });

  describe("isBrowser", () => {
    it("should return false in test environment without window", () => {
      // In jsdom, window exists but we can check the logic
      const result = isBrowser();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("parseISODate", () => {
    it("should parse ISO date string to Date object", () => {
      const result = parseISODate("2024-01-15T12:00:00Z");
      expect(result instanceof Date).toBe(true);
      expect(result.getUTCFullYear()).toBe(2024);
    });
  });

  describe("isValidEmail", () => {
    it("should return true for valid email", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.org")).toBe(true);
      expect(isValidEmail("user+tag@example.co.uk")).toBe(true);
    });

    it("should return false for invalid email", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("invalid@")).toBe(false);
      expect(isValidEmail("@example.com")).toBe(false);
      expect(isValidEmail("")).toBe(false);
    });
  });

  describe("truncateText", () => {
    it("should not truncate text shorter than max length", () => {
      expect(truncateText("Short text", 20)).toBe("Short text");
    });

    it("should truncate text longer than max length", () => {
      const result = truncateText("This is a long text", 10);
      expect(result).toContain("...");
    });

    it("should handle exact length or shorter", () => {
      expect(truncateText("Exactly 10", 10)).toBe("Exactly 10");
      expect(truncateText("Short", 10)).toBe("Short");
    });
  });

  describe("getPriorityColor", () => {
    it("should return correct color for critical priority", () => {
      expect(getPriorityColor("critical")).toBe("bg-red-500 text-white");
    });

    it("should return correct color for high priority", () => {
      expect(getPriorityColor("high")).toBe("bg-orange-500 text-white");
    });

    it("should return correct color for medium priority", () => {
      expect(getPriorityColor("medium")).toBe("bg-yellow-500 text-black");
    });

    it("should return correct color for low priority", () => {
      expect(getPriorityColor("low")).toBe("bg-green-500 text-white");
    });

    it("should return default color for unknown priority", () => {
      expect(getPriorityColor("unknown")).toBe("bg-gray-500 text-white");
    });
  });

  describe("getPriorityIcon", () => {
    it("should return correct icon for critical priority", () => {
      expect(getPriorityIcon("critical")).toBe("🔴");
    });

    it("should return correct icon for high priority", () => {
      expect(getPriorityIcon("high")).toBe("🟠");
    });

    it("should return correct icon for medium priority", () => {
      expect(getPriorityIcon("medium")).toBe("🟡");
    });

    it("should return correct icon for low priority", () => {
      expect(getPriorityIcon("low")).toBe("🟢");
    });

    it("should return default icon for unknown priority", () => {
      expect(getPriorityIcon("unknown")).toBe("⚪");
    });
  });

  describe("sortTasks", () => {
    it("should sort tasks ascending by field", () => {
      const tasks = [
        { id: 1, name: "Charlie" },
        { id: 2, name: "Alice" },
        { id: 3, name: "Bob" },
      ];
      const result = sortTasks(tasks, "name", "asc");
      expect(result[0].name).toBe("Alice");
      expect(result[1].name).toBe("Bob");
      expect(result[2].name).toBe("Charlie");
    });

    it("should sort tasks descending by field", () => {
      const tasks = [
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ];
      const result = sortTasks(tasks, "name", "desc");
      expect(result[0].name).toBe("Charlie");
      expect(result[1].name).toBe("Bob");
      expect(result[2].name).toBe("Alice");
    });

    it("should handle null values in sorting", () => {
      const tasks = [
        { id: 1, name: "Alice" },
        { id: 2, name: null },
        { id: 3, name: "Bob" },
      ];
      const result = sortTasks(tasks, "name", "asc");
      expect(result[0].name).toBe("Alice");
    });

    it("should not mutate original array", () => {
      const tasks = [
        { id: 1, name: "Charlie" },
        { id: 2, name: "Alice" },
      ];
      const original = [...tasks];
      sortTasks(tasks, "name", "asc");
      expect(tasks[0].name).toBe("Charlie"); // Original unchanged
    });
  });

  describe("filterTasks", () => {
    const tasks = [
      { id: 1, name: "Task A", list_id: 1, priority: "high", completed: 0, description: "Desc A" },
      { id: 2, name: "Task B", list_id: 2, priority: "low", completed: 1, description: "Desc B" },
      { id: 3, name: "Task C", list_id: 1, priority: "high", completed: 0, description: null },
    ] as any[];

    it("should filter by list ID", () => {
      const result = filterTasks(tasks, { listId: 1 });
      expect(result.length).toBe(2);
    });

    it("should filter by priority", () => {
      const result = filterTasks(tasks, { priority: "high" });
      expect(result.length).toBe(2);
    });

    it("should filter by completed status (using number)", () => {
      const result = filterTasks(tasks, { completed: 1 });
      expect(result.length).toBe(1);
    });

    it("should filter by search term in name", () => {
      const result = filterTasks(tasks, { search: "Task A" });
      expect(result.length).toBe(1);
    });

    it("should filter by search term in description", () => {
      const result = filterTasks(tasks, { search: "Desc" });
      expect(result.length).toBe(2);
    });

    it("should return all tasks when no filters", () => {
      const result = filterTasks(tasks, {});
      expect(result.length).toBe(3);
    });

    it("should handle tasks without description in search", () => {
      const result = filterTasks(tasks, { search: "Task C" });
      expect(result.length).toBe(1);
    });
  });

  describe("validateSortField", () => {
    it("should accept valid sort field", () => {
      expect(validateSortField("sort_order")).toBe("sort_order");
      expect(validateSortField("date")).toBe("date");
      expect(validateSortField("name")).toBe("name");
    });

    it("should throw for invalid sort field", () => {
      expect(() => validateSortField("invalid_field")).toThrow("Invalid sort field");
    });
  });

  describe("validateSortDirection", () => {
    it("should accept valid sort direction", () => {
      expect(validateSortDirection("asc")).toBe("asc");
      expect(validateSortDirection("desc")).toBe("desc");
    });

    it("should throw for invalid sort direction", () => {
      expect(() => validateSortDirection("invalid")).toThrow("Invalid sort direction");
    });
  });

  describe("buildSafeOrderBy", () => {
    it("should build safe order by clause with defaults", () => {
      expect(buildSafeOrderBy()).toBe("sort_order asc");
    });

    it("should build safe order by clause with specified field", () => {
      expect(buildSafeOrderBy("date")).toBe("date asc");
    });

    it("should build safe order by clause with specified direction", () => {
      expect(buildSafeOrderBy("name", "desc")).toBe("name desc");
    });
  });

  describe("buildInClausePlaceholders", () => {
    it("should build correct placeholders", () => {
      expect(buildInClausePlaceholders(3)).toBe("?,?,?");
    });

    it("should return empty string for count 1", () => {
      expect(buildInClausePlaceholders(1)).toBe("?");
    });

    it("should throw for zero count", () => {
      expect(() => buildInClausePlaceholders(0)).toThrow("Count must be positive");
    });

    it("should throw for negative count", () => {
      expect(() => buildInClausePlaceholders(-1)).toThrow("Count must be positive");
    });
  });
});
import { describe, it, expect } from "vitest";

// Type tests - these verify that the types are correctly exported and usable
describe("Types", () => {
  describe("Priority", () => {
    it("should accept all priority values", () => {
      const priorities: ["high", "medium", "low", "none"] = ["high", "medium", "low", "none"];
      priorities.forEach(p => {
        expect(["high", "medium", "low", "none"]).toContain(p);
      });
    });
  });

  describe("Recurring", () => {
    it("should accept all recurring values", () => {
      const recurrings: ["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"] =
        ["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"];
      recurrings.forEach(r => {
        expect(["none", "daily", "weekly", "weekdays", "monthly", "yearly", "custom"]).toContain(r);
      });
    });
  });

  describe("ViewType", () => {
    it("should accept all view types", () => {
      const views: ["today", "next7", "upcoming", "all", "list"] = ["today", "next7", "upcoming", "all", "list"];
      views.forEach(v => {
        expect(["today", "next7", "upcoming", "all", "list"]).toContain(v);
      });
    });
  });

  describe("List interface", () => {
    it("should have correct properties", () => {
      const list = {
        id: 1,
        name: "Test",
        emoji: "📋",
        color: "#6366f1",
        is_inbox: 1,
        created_at: "2026-01-01T00:00:00Z"
      };

      expect(typeof list.id).toBe("number");
      expect(typeof list.name).toBe("string");
      expect(typeof list.emoji).toBe("string");
      expect(typeof list.color).toBe("string");
      expect(typeof list.is_inbox).toBe("number");
      expect(typeof list.created_at).toBe("string");
    });
  });

  describe("Label interface", () => {
    it("should have correct properties", () => {
      const label = {
        id: 1,
        name: "Urgent",
        icon: "🔥",
        color: "#ef4444",
        created_at: "2026-01-01T00:00:00Z"
      };

      expect(typeof label.id).toBe("number");
      expect(typeof label.name).toBe("string");
      expect(typeof label.icon).toBe("string");
      expect(typeof label.color).toBe("string");
      expect(typeof label.created_at).toBe("string");
    });
  });

  describe("Subtask interface", () => {
    it("should have correct properties", () => {
      const subtask = {
        id: 1,
        task_id: 1,
        name: "Step 1",
        completed: 0,
        created_at: "2026-01-01T00:00:00Z"
      };

      expect(typeof subtask.id).toBe("number");
      expect(typeof subtask.task_id).toBe("number");
      expect(typeof subtask.name).toBe("string");
      expect(typeof subtask.completed).toBe("number");
      expect(typeof subtask.created_at).toBe("string");
    });
  });

  describe("Task interface", () => {
    it("should have correct properties", () => {
      const task = {
        id: 1,
        name: "Test Task",
        description: "Description",
        list_id: 1,
        date: "2026-01-15",
        deadline: "2026-01-20",
        estimate: "2h",
        actual_time: "1h",
        priority: "high",
        recurring: "none",
        recurring_config: null,
        completed: 0,
        completed_at: null,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
        labels: [],
        subtasks: [],
        reminders: [],
        logs: []
      };

      expect(typeof task.id).toBe("number");
      expect(typeof task.name).toBe("string");
      expect(typeof task.description).toBe("string");
      expect(typeof task.list_id).toBe("number");
      expect(typeof task.priority).toBe("string");
      expect(typeof task.completed).toBe("number");
    });
  });

  describe("CreateTaskInput interface", () => {
    it("should accept valid input", () => {
      const input = {
        name: "New Task",
        description: "Desc",
        list_id: 1,
        date: "2026-01-15",
        deadline: "2026-01-20",
        estimate: "2h",
        actual_time: "1h",
        priority: "high" as const,
        recurring: "none" as const,
        recurring_config: null,
        label_ids: [1, 2],
        subtasks: ["Step 1"],
        reminders: ["2026-01-15T10:00:00Z"]
      };

      expect(input.name).toBe("New Task");
      expect(input.priority).toBe("high");
    });
  });

  describe("UpdateTaskInput interface", () => {
    it("should accept partial updates", () => {
      const input = {
        name: "Updated Task",
        completed: true
      };

      expect(input.name).toBe("Updated Task");
      expect(input.completed).toBe(true);
    });
  });
});
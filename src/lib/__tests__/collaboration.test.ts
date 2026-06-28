import { describe, it, expect } from "vitest";
import {
  parseMentions,
  generateTaskShareLink,
  generateListShareLink,
  canPerformAction,
  groupTasksByAssignee,
  getPendingAssignments,
} from "@/lib/collaboration";
import type { TaskWithRelations, User } from "@/types";

describe("Collaboration utilities", () => {
  describe("parseMentions", () => {
    it("should parse mentions from text", () => {
      const text = "Let's discuss with @john and @jane about this task";
      const result = parseMentions(text);
      expect(result.mentions.length).toBe(2);
      expect(result.mentions[0].userName).toBe("john");
      expect(result.mentions[1].userName).toBe("jane");
    });

    it("should return cleaned text without mentions", () => {
      const text = "Let's discuss with @john about this task";
      const result = parseMentions(text);
      expect(result.cleanedText).toBe("Let's discuss with about this task");
    });

    it("should handle text without mentions", () => {
      const text = "Let's discuss this task";
      const result = parseMentions(text);
      expect(result.mentions.length).toBe(0);
      expect(result.cleanedText).toBe(text);
    });

    it("should handle multiple consecutive mentions", () => {
      const text = "Hey @alice@bob @charlie";
      const result = parseMentions(text);
      expect(result.mentions.length).toBe(3);
    });

    it("should handle mention at start of text", () => {
      const text = "@admin please review this";
      const result = parseMentions(text);
      expect(result.mentions.length).toBe(1);
      expect(result.mentions[0].userName).toBe("admin");
    });

    it("should handle mention at end of text", () => {
      const text = "Please review this @manager";
      const result = parseMentions(text);
      expect(result.mentions.length).toBe(1);
    });

    it("should set default userId to 0", () => {
      const text = "@testuser";
      const result = parseMentions(text);
      expect(result.mentions[0].userId).toBe(0);
    });

    it("should calculate correct start and end indices", () => {
      const text = "Hello @user world";
      const result = parseMentions(text);
      expect(result.mentions[0].startIndex).toBe(6);
      expect(result.mentions[0].endIndex).toBe(11);
    });
  });

  describe("generateTaskShareLink", () => {
    it("should generate a shareable link", () => {
      const link = generateTaskShareLink(123, "http://localhost:3000");
      expect(link).toContain("/share/");
      // The token is base64 encoded, so we check for the pattern
      expect(link).toMatch(/http:\/\/localhost:3000\/share\/[A-Za-z0-9+/=]+/);
    });

    it("should include task id in token", () => {
      const link = generateTaskShareLink(456, "http://localhost:3000");
      const tokenMatch = link.match(/\/share\/([A-Za-z0-9+/=]+)/);
      expect(tokenMatch).not.toBeNull();
      const token = Buffer.from(tokenMatch![1], "base64").toString();
      expect(token).toContain("task:456");
    });

    it("should generate unique links for different task ids", () => {
      const link1 = generateTaskShareLink(1, "http://localhost:3000");
      const link2 = generateTaskShareLink(2, "http://localhost:3000");
      expect(link1).not.toBe(link2);
    });
  });

  describe("generateListShareLink", () => {
    it("should generate a shareable link for lists", () => {
      const link = generateListShareLink(456, "http://localhost:3000");
      expect(link).toContain("/share/");
      // The token is base64 encoded, so we check for the pattern
      expect(link).toMatch(/http:\/\/localhost:3000\/share\/[A-Za-z0-9+/=]+/);
    });

    it("should include list id in token", () => {
      const link = generateListShareLink(789, "http://localhost:3000");
      const tokenMatch = link.match(/\/share\/([A-Za-z0-9+/=]+)/);
      expect(tokenMatch).not.toBeNull();
      const token = Buffer.from(tokenMatch![1], "base64").toString();
      expect(token).toContain("list:789");
    });
  });

  describe("canPerformAction", () => {
    const mockUser: User = { id: 1, email: "test@example.com", name: "Test User" };
    const mockTask: TaskWithRelations = {
      id: 1,
      name: "Test Task",
      created_by: 1,
      assignee_id: null,
      completed: false,
      deadline: null,
      priority: "medium",
      description: null,
      list_id: null,
      date: null,
      recurrence: null,
      estimated_duration: null,
      actual_duration: null,
      position: 0,
      labels: [],
      comments: [],
      created_at: new Date(),
      updated_at: new Date(),
    };

    it("should return false for null user", () => {
      const result = canPerformAction(null, mockTask);
      expect(result).toBe(false);
    });

    it("should return true for task owner", () => {
      const result = canPerformAction(mockUser, mockTask);
      expect(result).toBe(true);
    });

    it("should return true for non-owner user (placeholder implementation)", () => {
      const otherUser: User = { id: 2, email: "other@example.com", name: "Other User" };
      const result = canPerformAction(otherUser, mockTask);
      expect(result).toBe(true);
    });
  });

  describe("groupTasksByAssignee", () => {
    it("should group tasks by assignee id", () => {
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: 1, completed: false, deadline: null, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
        { ...{} as TaskWithRelations, id: 2, name: "Task 2", assignee_id: 1, completed: false, deadline: null, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
        { ...{} as TaskWithRelations, id: 3, name: "Task 3", assignee_id: 2, completed: false, deadline: null, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const grouped = groupTasksByAssignee(tasks);
      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped[1].length).toBe(2);
      expect(grouped[2].length).toBe(1);
    });

    it("should handle tasks with no assignee", () => {
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: null, completed: false, deadline: null, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const grouped = groupTasksByAssignee(tasks);
      expect(grouped[0].length).toBe(1);
    });

    it("should return empty object for empty array", () => {
      const grouped = groupTasksByAssignee([]);
      expect(Object.keys(grouped).length).toBe(0);
    });
  });

  describe("getPendingAssignments", () => {
    it("should return tasks assigned to user with deadline in future", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: 1, completed: false, deadline: futureDate, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(1);
    });

    it("should exclude completed tasks", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: 1, completed: true, deadline: futureDate, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });

    it("should exclude tasks with past deadline", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: 1, completed: false, deadline: pastDate, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });

    it("should exclude tasks not assigned to user", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: 999, completed: false, deadline: futureDate, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });

    it("should handle tasks without deadline", () => {
      const tasks: TaskWithRelations[] = [
        { ...{} as TaskWithRelations, id: 1, name: "Task 1", assignee_id: 1, completed: false, deadline: null, priority: "medium", created_by: 1, created_at: new Date(), updated_at: new Date() },
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });
  });
});
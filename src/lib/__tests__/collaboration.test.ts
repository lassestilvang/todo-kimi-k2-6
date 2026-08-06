import { describe, it, expect } from "vitest";
import {
  parseMentions,
  generateTaskShareLink,
  generateListShareLink,
  validateShareToken,
  canPerformAction,
  groupTasksByAssignee,
  getPendingAssignments,
  generateSecureShareToken,
} from "@/lib/collaboration";
import type { TaskWithRelations, User } from "@/types";

function createMockTask(overrides: Partial<TaskWithRelations> = {}): TaskWithRelations {
  const now = new Date().toISOString();
  return {
    id: 1,
    user_id: null,
    name: "Test Task",
    description: null,
    notes: null,
    list_id: null,
    date: null,
    deadline: null,
    estimate: null,
    actual_time: null,
    priority: "medium",
    recurring: "none",
    recurring_config: null,
    completed: false,
    completed_at: null,
    created_at: now,
    updated_at: now,
    sort_order: 0,
    archived: false,
    labels: [],
    subtasks: [],
    reminders: [],
    logs: [],
    comments: [],
    attachments: [],
    blockers: [],
    blocked_by: [],
    time_entries: [],
    recurring_exceptions: [],
    created_by: 1,
    assignee_id: null,
    ...overrides,
  } as TaskWithRelations;
}

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
    const mockUser: User = { id: 1, email: "test@example.com", name: "Test User", avatar_url: null, created_at: new Date().toISOString() };
    const mockTask: TaskWithRelations = {
      id: 1,
      user_id: null,
      name: "Test Task",
      description: null,
      notes: null,
      list_id: null,
      date: null,
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "medium",
      recurring: "none",
      recurring_config: null,
      completed: false,
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sort_order: 0,
      archived: false,
      labels: [],
      subtasks: [],
      reminders: [],
      logs: [],
      comments: [],
      attachments: [],
      blockers: [],
      blocked_by: [],
      time_entries: [],
      recurring_exceptions: [],
      created_by: 1,
      assignee_id: null,
    } as TaskWithRelations;

    it("should return true for view action when user is null (demo mode)", () => {
      const result = canPerformAction(null, mockTask);
      // In demo mode, null user can view tasks
      expect(result).toBe(true);
    });

    it("should return true for task owner", () => {
      const result = canPerformAction(mockUser, mockTask);
      expect(result).toBe(true);
    });

    it("should return true for non-owner user (placeholder implementation)", () => {
      const otherUser: User = { id: 2, email: "other@example.com", name: "Other User", avatar_url: null, created_at: new Date().toISOString() };
      const result = canPerformAction(otherUser, mockTask);
      expect(result).toBe(true);
    });
  });

  describe("groupTasksByAssignee", () => {
    it("should group tasks by assignee id", () => {
      const tasks: TaskWithRelations[] = [
        createMockTask({ id: 1, name: "Task 1", assignee_id: 1, priority: "medium" }),
        createMockTask({ id: 2, name: "Task 2", assignee_id: 1, priority: "medium" }),
        createMockTask({ id: 3, name: "Task 3", assignee_id: 2, priority: "medium" }),
      ];

      const grouped = groupTasksByAssignee(tasks);
      expect(Object.keys(grouped).length).toBe(2);
      expect(grouped[1].length).toBe(2);
      expect(grouped[2].length).toBe(1);
    });

    it("should handle tasks with no assignee", () => {
      const tasks: TaskWithRelations[] = [
        createMockTask({ id: 1, name: "Task 1", assignee_id: null, priority: "medium" }),
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
        createMockTask({ id: 1, name: "Task 1", assignee_id: 1, deadline: futureDate, priority: "medium" }),
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(1);
    });

    it("should exclude completed tasks", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        createMockTask({ id: 1, name: "Task 1", assignee_id: 1, completed: true, deadline: futureDate, priority: "medium" }),
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });

    it("should exclude tasks with past deadline", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        createMockTask({ id: 1, name: "Task 1", assignee_id: 1, completed: false, deadline: pastDate, priority: "medium" }),
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });

    it("should exclude tasks not assigned to user", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      const tasks: TaskWithRelations[] = [
        createMockTask({ id: 1, name: "Task 1", assignee_id: 999, completed: false, deadline: futureDate, priority: "medium" }),
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });

    it("should handle tasks without deadline", () => {
      const tasks: TaskWithRelations[] = [
        createMockTask({ id: 1, name: "Task 1", assignee_id: 1, deadline: null, priority: "medium" }),
      ];

      const pending = getPendingAssignments(tasks, 1);
      expect(pending.length).toBe(0);
    });
  });

  describe("validateShareToken", () => {
    it("should validate a valid task token", () => {
      const futureTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
      const validToken = Buffer.from(`task:123:${futureTimestamp}`).toString("base64");
      const result = validateShareToken(validToken);
      expect(result).not.toBeNull();
      expect(result?.entityType).toBe("task");
      expect(result?.entityId).toBe(123);
    });

    it("should validate a valid list token", () => {
      const futureTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days from now
      const validToken = Buffer.from(`list:456:${futureTimestamp}`).toString("base64");
      const result = validateShareToken(validToken);
      expect(result).not.toBeNull();
      expect(result?.entityType).toBe("list");
      expect(result?.entityId).toBe(456);
    });

    it("should return null for invalid entity type", () => {
      const futureTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const invalidToken = Buffer.from(`invalid:123:${futureTimestamp}`).toString("base64");
      const result = validateShareToken(invalidToken);
      expect(result).toBeNull();
    });

    it("should return null for expired token", () => {
      const pastTimestamp = Date.now() - 1000; // 1 second ago
      const expiredToken = Buffer.from(`task:123:${pastTimestamp}`).toString("base64");
      const result = validateShareToken(expiredToken);
      expect(result).toBeNull();
    });

    it("should return null for malformed token", () => {
      const result = validateShareToken("not-valid-base64!!!");
      expect(result).toBeNull();
    });

    it("should return null for token with invalid entityId", () => {
      const futureTimestamp = Date.now() + 7 * 24 * 60 * 60 * 1000;
      const invalidToken = Buffer.from(`task:invalid:${futureTimestamp}`).toString("base64");
      const result = validateShareToken(invalidToken);
      expect(result).toBeNull();
    });

    it("should return null for token with invalid expiresAt", () => {
      const invalidToken = Buffer.from("task:123:invalid").toString("base64");
      const result = validateShareToken(invalidToken);
      expect(result).toBeNull();
    });

    it("should return null for empty token", () => {
      const result = validateShareToken("");
      expect(result).toBeNull();
    });
  });

  describe("generateSecureShareToken", () => {
    it("should generate a 64 character hex token", () => {
      const token = generateSecureShareToken();
      expect(token.length).toBe(64);
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });

    it("should generate unique tokens", () => {
      const token1 = generateSecureShareToken();
      const token2 = generateSecureShareToken();
      expect(token1).not.toBe(token2);
    });
  });
});
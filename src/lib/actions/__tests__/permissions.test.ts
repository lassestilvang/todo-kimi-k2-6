import { describe, it, expect } from "vitest";
import { isOwner, isEditor, isViewer, canPerformActionByPermission } from "../permissions";

describe("Permissions Module", () => {
  describe("isOwner", () => {
    it("should return true for admin email (case-insensitive)", () => {
      expect(isOwner("admin@todo.com")).toBe(true);
      expect(isOwner("ADMIN@TODO.COM")).toBe(true);
      expect(isOwner("Admin@Todo.com")).toBe(true);
    });

    it("should return false for non-admin email", () => {
      expect(isOwner("user@example.com")).toBe(false);
      expect(isOwner("test@test.com")).toBe(false);
    });

    it("should return false for empty email", () => {
      expect(isOwner("")).toBe(false);
    });

    it("should return false for null/undefined email", () => {
      expect(isOwner(null as any)).toBe(false);
      expect(isOwner(undefined as any)).toBe(false);
    });
  });

  describe("isEditor", () => {
    it("should return true for admin email", () => {
      expect(isEditor("admin@todo.com")).toBe(true);
    });

    it("should return true for regular email with @", () => {
      expect(isEditor("user@example.com")).toBe(true);
      expect(isEditor("test@domain.org")).toBe(true);
    });

    it("should return false for email without @", () => {
      expect(isEditor("user")).toBe(false);
      expect(isEditor("not-an-email")).toBe(false);
    });

    it("should return false for empty email", () => {
      expect(isEditor("")).toBe(false);
    });

    it("should return false for null/undefined email", () => {
      expect(isEditor(null as any)).toBe(false);
      expect(isEditor(undefined as any)).toBe(false);
    });
  });

  describe("isViewer", () => {
    it("should return true for any email", () => {
      expect(isViewer("user@example.com")).toBe(true);
      expect(isViewer("admin@todo.com")).toBe(true);
    });

    it("should return true for admin email", () => {
      expect(isViewer("admin@todo.com")).toBe(true);
    });

    it("should return false for empty email", () => {
      expect(isViewer("")).toBe(false);
    });

    it("should return false for null/undefined email", () => {
      expect(isViewer(null as any)).toBe(false);
      expect(isViewer(undefined as any)).toBe(false);
    });
  });

  describe("canPerformActionByPermission", () => {
    it("should allow view action for null email (guests)", () => {
      expect(canPerformActionByPermission(null, "view")).toBe(true);
    });

    it("should allow view action for authenticated user", () => {
      expect(canPerformActionByPermission("user@example.com", "view")).toBe(true);
    });

    it("should allow view action for admin", () => {
      expect(canPerformActionByPermission("admin@todo.com", "view")).toBe(true);
    });

    it("should allow edit action for editor", () => {
      expect(canPerformActionByPermission("user@example.com", "edit")).toBe(true);
    });

    it("should allow edit action for admin (who is editor)", () => {
      expect(canPerformActionByPermission("admin@todo.com", "edit")).toBe(true);
    });

    it("should deny edit action for empty email", () => {
      expect(canPerformActionByPermission("", "edit")).toBe(false);
    });

    it("should deny delete action for editor", () => {
      expect(canPerformActionByPermission("user@example.com", "delete")).toBe(false);
    });

    it("should allow delete action for admin", () => {
      expect(canPerformActionByPermission("admin@todo.com", "delete")).toBe(true);
    });

    it("should deny admin action for editor", () => {
      expect(canPerformActionByPermission("user@example.com", "admin")).toBe(false);
    });

    it("should allow admin action for admin", () => {
      expect(canPerformActionByPermission("admin@todo.com", "admin")).toBe(true);
    });

    it("should default to view action if not specified", () => {
      expect(canPerformActionByPermission("user@example.com")).toBe(true);
      expect(canPerformActionByPermission(null)).toBe(true);
    });

    it("should handle all action types", () => {
      const actions = ["view", "edit", "delete", "admin"] as const;
      actions.forEach(action => {
        expect(typeof canPerformActionByPermission("user@example.com", action)).toBe("boolean");
      });
    });
  });
});
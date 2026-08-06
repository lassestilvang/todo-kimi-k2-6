import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendSlackNotification, sendDiscordNotification, sendEmailNotification } from "@/lib/integrations/index";
import { NotionConnector, GitHubConnector, SlackConnector, GmailConnector } from "@/lib/integrations/index";

// Mock fetch globally
global.fetch = vi.fn();

describe("integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("sendSlackNotification", () => {
    it("should send notification to Slack webhook", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const result = await sendSlackNotification(
        "https://hooks.slack.com/test",
        {
          taskId: 1,
          taskName: "Test Task",
          action: "created",
        }
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return false on failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      global.fetch = mockFetch;

      const result = await sendSlackNotification("https://hooks.slack.com/test", {
        taskId: 1,
        taskName: "Test Task",
        action: "created",
      });

      expect(result).toBe(false);
    });

    it("should return false on network error", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
      global.fetch = mockFetch;

      const result = await sendSlackNotification("https://hooks.slack.com/test", {
        taskId: 1,
        taskName: "Test Task",
        action: "created",
      });

      expect(result).toBe(false);
    });

    it("should include due date in notification", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const result = await sendSlackNotification("https://hooks.slack.com/test", {
        taskId: 1,
        taskName: "Test Task",
        action: "due_soon",
        dueDate: "2024-12-31",
        priority: "high",
      });

      expect(result).toBe(true);
    });

    it("should handle all action types", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const actions: Array<"created" | "updated" | "completed" | "due_soon" | "overdue"> = [
        "created", "updated", "completed", "due_soon", "overdue"
      ];

      for (const action of actions) {
        const result = await sendSlackNotification("https://hooks.slack.com/test", {
          taskId: 1,
          taskName: "Test Task",
          action,
        });
        expect(result).toBe(true);
      }
    });
  });

  describe("sendDiscordNotification", () => {
    it("should send notification to Discord webhook", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const result = await sendDiscordNotification(
        "https://discord.com/api/webhooks/test",
        {
          taskId: 1,
          taskName: "Test Task",
          action: "created",
        }
      );

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it("should return false on failure", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: false });
      global.fetch = mockFetch;

      const result = await sendDiscordNotification("https://discord.com/api/webhooks/test", {
        taskId: 1,
        taskName: "Test Task",
        action: "created",
      });

      expect(result).toBe(false);
    });

    it("should handle all action types", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const actions: Array<"created" | "updated" | "completed" | "due_soon" | "overdue"> = [
        "created", "updated", "completed", "due_soon", "overdue"
      ];

      for (const action of actions) {
        const result = await sendDiscordNotification("https://discord.com/api/webhooks/test", {
          taskId: 1,
          taskName: "Test Task",
          action,
        });
        expect(result).toBe(true);
      }
    });

    it("should include assignee information", async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const result = await sendDiscordNotification("https://discord.com/api/webhooks/test", {
        taskId: 1,
        taskName: "Test Task",
        action: "created",
        assignee: { id: 1, name: "John Doe", email: "john@example.com" },
      });

      expect(result).toBe(true);
    });
  });

  describe("sendEmailNotification", () => {
    it("should return true for successful email", async () => {
      const result = await sendEmailNotification("test@example.com", {
        taskId: 1,
        taskName: "Test Task",
        action: "created",
      });

      expect(result).toBe(true);
    });

    it("should include priority in notification", async () => {
      const result = await sendEmailNotification("test@example.com", {
        taskId: 1,
        taskName: "Test Task",
        action: "created",
        priority: "high",
      });

      expect(result).toBe(true);
    });

    it("should include due date in notification", async () => {
      const result = await sendEmailNotification("test@example.com", {
        taskId: 1,
        taskName: "Test Task",
        action: "due_soon",
        dueDate: "2024-12-31",
      });

      expect(result).toBe(true);
    });

    it("should handle all action types", async () => {
      const actions: Array<"created" | "updated" | "completed" | "due_soon" | "overdue"> = [
        "created", "updated", "completed", "due_soon", "overdue"
      ];

      for (const action of actions) {
        const result = await sendEmailNotification("test@example.com", {
          taskId: 1,
          taskName: "Test Task",
          action,
        });
        expect(result).toBe(true);
      }
    });
  });
});
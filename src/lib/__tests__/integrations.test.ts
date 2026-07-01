import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendSlackNotification, sendDiscordNotification, sendEmailNotification } from "@/lib/integrations/index";

// Mock fetch globally
global.fetch = vi.fn();

describe("integrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });
});
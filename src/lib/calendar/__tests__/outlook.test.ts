import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { Task } from "../../../types";

// Type for mock fetch
type MockFetch = {
  mockResolvedValue: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
  mockRejectedValue: (value: Error) => void;
};

describe("Outlook Calendar Integration", () => {
  let mockConfig: { accessToken: string };

  beforeEach(() => {
    mockConfig = { accessToken: "test-access-token" };
    global.fetch = vi.fn() as unknown as MockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getOutlookEvents", () => {
    it("should fetch calendar events for a date range", async () => {
      const mockEvents = [
        { id: "event1", subject: "Test Event 1" },
        { id: "event2", subject: "Test Event 2" },
      ];

      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ value: mockEvents }),
      });

      const { getOutlookEvents } = await import("../outlook");
      const events = await getOutlookEvents(mockConfig, "2026-06-01", "2026-06-30");

      expect(events).toEqual(mockEvents);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("graph.microsoft.com/v1.0/me/events"),
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        })
      );
    });

    it("should throw error when API fails", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
      });

      const { getOutlookEvents } = await import("../outlook");
      await expect(
        getOutlookEvents(mockConfig, "2026-06-01", "2026-06-30")
      ).rejects.toThrow("Outlook Calendar API error: Unauthorized");
    });

    it("should return empty array when no events", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const { getOutlookEvents } = await import("../outlook");
      const events = await getOutlookEvents(mockConfig, "2026-06-01", "2026-06-30");

      expect(events).toEqual([]);
    });
  });

  describe("createOutlookEvent", () => {
    const mockTask: Task = {
      id: 1,
      name: "Test Task",
      description: "Test Description",
      notes: null,
      list_id: 1,
      date: "2026-06-30",
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "high",
      recurring: "none",
      recurring_config: null,
      completed: false,
      completed_at: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      sort_order: 0,
    };

    it("should create an Outlook event from a task", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event123" }),
      });

      const { createOutlookEvent } = await import("../outlook");
      const eventId = await createOutlookEvent(mockConfig, mockTask);

      expect(eventId).toBe("event123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/events",
        expect.objectContaining({
          method: "POST",
          headers: {
            Authorization: "Bearer test-access-token",
            "Content-Type": "application/json",
          },
        })
      );
    });

    it("should throw error when task has no date", async () => {
      const taskWithoutDate = { ...mockTask, date: null };

      const { createOutlookEvent } = await import("../outlook");
      await expect(createOutlookEvent(mockConfig, taskWithoutDate)).rejects.toThrow(
        "Task has no date"
      );
    });

    it("should throw error when API fails", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ error: { message: "Invalid task" } }),
      });

      const { createOutlookEvent } = await import("../outlook");
      await expect(createOutlookEvent(mockConfig, mockTask)).rejects.toThrow(
        "Failed to create event: Invalid task"
      );
    });

    it("should handle API error without error message", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({}),
      });

      const { createOutlookEvent } = await import("../outlook");
      await expect(createOutlookEvent(mockConfig, mockTask)).rejects.toThrow(
        "Failed to create event: Bad Request"
      );
    });
  });

  describe("updateOutlookEvent", () => {
    const mockTask: Task = {
      id: 1,
      name: "Updated Task",
      description: "Updated Description",
      notes: null,
      list_id: 1,
      date: "2026-06-30",
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "high",
      recurring: "none",
      recurring_config: null,
      completed: false,
      completed_at: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      sort_order: 0,
    };

    it("should update an Outlook event", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const { updateOutlookEvent } = await import("../outlook");
      await updateOutlookEvent(mockConfig, "event123", mockTask);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/events/event123",
        expect.objectContaining({
          method: "PATCH",
        })
      );
    });

    it("should throw error when API fails", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const { updateOutlookEvent } = await import("../outlook");
      await expect(
        updateOutlookEvent(mockConfig, "event123", mockTask)
      ).rejects.toThrow("Failed to update event: Not Found");
    });
  });

  describe("deleteOutlookEvent", () => {
    it("should delete an Outlook event", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
      });

      const { deleteOutlookEvent } = await import("../outlook");
      await deleteOutlookEvent(mockConfig, "event123");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://graph.microsoft.com/v1.0/me/events/event123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should throw error when API fails", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      const { deleteOutlookEvent } = await import("../outlook");
      await expect(deleteOutlookEvent(mockConfig, "event123")).rejects.toThrow(
        "Failed to delete event: Not Found"
      );
    });
  });

  describe("getOutlookAuthUrl", () => {
    it("should generate authorization URL with correct parameters", async () => {
      const { getOutlookAuthUrl } = await import("../outlook");
      const state = "random-state-123";
      const url = getOutlookAuthUrl(state);

      expect(url).toContain("login.microsoftonline.com/common/oauth2/v2.0/authorize");
      expect(url).toContain("state=random-state-123");
      expect(url).toContain("scope=Calendars.ReadWrite");
    });

    it("should use environment variables", async () => {
      const originalClientId = process.env.MICROSOFT_CLIENT_ID;
      const originalUrl = process.env.NEXTAUTH_URL;
      process.env.MICROSOFT_CLIENT_ID = "test-client-id";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      vi.resetModules();
      const { getOutlookAuthUrl } = await import("../outlook");
      const url = getOutlookAuthUrl("state");

      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fmicrosoft");

      process.env.MICROSOFT_CLIENT_ID = originalClientId;
      process.env.NEXTAUTH_URL = originalUrl;
    });
  });

  describe("exchangeOutlookCodeForTokens", () => {
    it("should exchange code for tokens", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      const { exchangeOutlookCodeForTokens } = await import("../outlook");
      const tokens = await exchangeOutlookCodeForTokens("auth-code-123");

      expect(tokens.access_token).toBe("new-access-token");
      expect(tokens.refresh_token).toBe("new-refresh-token");
      expect(tokens.expires_in).toBe(3600);
    });

    it("should throw error when token exchange fails", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error_description: "Invalid code" }),
      });

      const { exchangeOutlookCodeForTokens } = await import("../outlook");
      await expect(exchangeOutlookCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed: Invalid code"
      );
    });

    it("should handle token exchange failure without error_description", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const { exchangeOutlookCodeForTokens } = await import("../outlook");
      await expect(exchangeOutlookCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed: undefined"
      );
    });
  });

  describe("createOutlookEvent error paths", () => {
    it("should handle task with null description", async () => {
      const taskWithNullDesc = {
        id: 1,
        name: "Test Task",
        description: null,
        notes: null,
        list_id: 1,
        date: "2026-06-30",
        deadline: null,
        estimate: null,
        actual_time: null,
        priority: "high",
        recurring: "none",
        recurring_config: null,
        completed: false,
        completed_at: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        sort_order: 0,
      };

      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event123" }),
      });

      const { createOutlookEvent } = await import("../outlook");
      const eventId = await createOutlookEvent(mockConfig, taskWithNullDesc);

      expect(eventId).toBe("event123");
    });

    it("should handle API error with error message in createOutlookEvent", async () => {
      const mockTask: Task = {
        id: 1,
        name: "Test Task",
        description: "Test Description",
        notes: null,
        list_id: 1,
        date: "2026-06-30",
        deadline: null,
        estimate: null,
        actual_time: null,
        priority: "high",
        recurring: "none",
        recurring_config: null,
        completed: false,
        completed_at: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        sort_order: 0,
      };

      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ error: { message: "Detailed error message" } }),
      });

      const { createOutlookEvent } = await import("../outlook");
      await expect(createOutlookEvent(mockConfig, mockTask)).rejects.toThrow(
        "Failed to create event: Detailed error message"
      );
    });

    it("should handle API error without error message in createOutlookEvent", async () => {
      const mockTask: Task = {
        id: 1,
        name: "Test Task",
        description: "Test Description",
        notes: null,
        list_id: 1,
        date: "2026-06-30",
        deadline: null,
        estimate: null,
        actual_time: null,
        priority: "high",
        recurring: "none",
        recurring_config: null,
        completed: false,
        completed_at: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        sort_order: 0,
      };

      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({}),
      });

      const { createOutlookEvent } = await import("../outlook");
      await expect(createOutlookEvent(mockConfig, mockTask)).rejects.toThrow(
        "Failed to create event: Bad Request"
      );
    });
  });

  describe("updateOutlookEvent error paths", () => {
    const mockTask: Task = {
      id: 1,
      name: "Updated Task",
      description: "Updated Description",
      notes: null,
      list_id: 1,
      date: "2026-06-30",
      deadline: null,
      estimate: null,
      actual_time: null,
      priority: "high",
      recurring: "none",
      recurring_config: null,
      completed: false,
      completed_at: null,
      created_at: "2026-06-01T00:00:00Z",
      updated_at: "2026-06-01T00:00:00Z",
      sort_order: 0,
    };

    it("should handle update error without statusText", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "",
      });

      const { updateOutlookEvent } = await import("../outlook");
      await expect(
        updateOutlookEvent(mockConfig, "event123", mockTask)
      ).rejects.toThrow("Failed to update event: ");
    });
  });

  describe("exchangeOutlookCodeForTokens error paths", () => {
    it("should handle token exchange error without error_description", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({}),
      });

      const { exchangeOutlookCodeForTokens } = await import("../outlook");
      await expect(exchangeOutlookCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed: undefined"
      );
    });

    it("should handle token exchange error with empty error_description", async () => {
      vi.mocked(global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error_description: "" }),
      });

      const { exchangeOutlookCodeForTokens } = await import("../outlook");
      await expect(exchangeOutlookCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed: "
      );
    });
  });
});
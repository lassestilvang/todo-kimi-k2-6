import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getAuthUrl,
  exchangeCodeForTokens,
  syncTasksToCalendar,
} from "../google";
import type { Task } from "../../../types";

// Type for mock fetch
type MockFetch = {
  mockResolvedValue: (value: { ok: boolean; json: () => Promise<unknown> }) => void;
  mockRejectedValue: (value: Error) => void;
};

describe("Google Calendar Integration", () => {
  let mockConfig: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: string;
  };

  beforeEach(() => {
    mockConfig = {
      accessToken: "test-access-token",
      refreshToken: "test-refresh-token",
      expiresAt: "2026-12-31T23:59:59Z",
    };
    global.fetch = vi.fn() as unknown as MockFetch;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getCalendarEvents", () => {
    it("should fetch calendar events for a date range", async () => {
      const mockEvents = [
        { id: "event1", summary: "Test Event 1" },
        { id: "event2", summary: "Test Event 2" },
      ];

      (global.fetch as MockFetch).mockResolvedValue({
        ok: true,
        json: async () => ({ items: mockEvents }),
      });

      const events = await getCalendarEvents(
        mockConfig,
        "2026-06-01",
        "2026-06-30"
      );

      expect(events).toEqual(mockEvents);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("www.googleapis.com/calendar/v3/calendars/primary/events"),
        expect.objectContaining({
          headers: { Authorization: "Bearer test-access-token" },
        })
      );
    });

    it("should throw error when API fails", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Unauthorized",
      });

      await expect(
        getCalendarEvents(mockConfig, "2026-06-01", "2026-06-30")
      ).rejects.toThrow("Google Calendar API error: Unauthorized");
    });

    it("should return empty array when no events", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      const events = await getCalendarEvents(
        mockConfig,
        "2026-06-01",
        "2026-06-30"
      );

      expect(events).toEqual([]);
    });
  });

  describe("createCalendarEvent", () => {
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

    it("should create a calendar event from a task", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event123" }),
      });

      const eventId = await createCalendarEvent(mockConfig, mockTask);

      expect(eventId).toBe("event123");
      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
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

      await expect(createCalendarEvent(mockConfig, taskWithoutDate)).rejects.toThrow(
        "Task has no date"
      );
    });

    it("should throw error when API fails", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({ error: { message: "Invalid task" } }),
      });

      await expect(createCalendarEvent(mockConfig, mockTask)).rejects.toThrow(
        "Failed to create event"
      );
    });
  });

  describe("updateCalendarEvent", () => {
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

    it("should update a calendar event", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await updateCalendarEvent(mockConfig, "event123", mockTask);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/event123",
        expect.objectContaining({
          method: "PUT",
        })
      );
    });

    it("should throw error when API fails", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(
        updateCalendarEvent(mockConfig, "event123", mockTask)
      ).rejects.toThrow("Failed to update event");
    });
  });

  describe("deleteCalendarEvent", () => {
    it("should delete a calendar event", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
      });

      await deleteCalendarEvent(mockConfig, "event123");

      expect(global.fetch).toHaveBeenCalledWith(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events/event123",
        expect.objectContaining({
          method: "DELETE",
        })
      );
    });

    it("should throw error when API fails", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Not Found",
      });

      await expect(deleteCalendarEvent(mockConfig, "event123")).rejects.toThrow(
        "Failed to delete event"
      );
    });
  });

  describe("getAuthUrl", () => {
    it("should generate authorization URL with correct parameters", () => {
      const state = "random-state-123";
      const url = getAuthUrl(state);

      expect(url).toContain("accounts.google.com/o/oauth2/v2/auth");
      expect(url).toContain("state=random-state-123");
      expect(url).toContain("scope=");
      expect(url).toContain("access_type=offline");
    });

    it("should include client_id in URL when set", () => {
      const originalClientId = process.env.GOOGLE_CLIENT_ID;
      process.env.GOOGLE_CLIENT_ID = "test-client-id";

      const url = getAuthUrl("state");

      expect(url).toContain("client_id=test-client-id");

      process.env.GOOGLE_CLIENT_ID = originalClientId;
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange code for tokens", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      const tokens = await exchangeCodeForTokens("auth-code-123");

      expect(tokens.access_token).toBe("new-access-token");
      expect(tokens.refresh_token).toBe("new-refresh-token");
      expect(tokens.expires_in).toBe(3600);
    });

    it("should throw error when token exchange fails", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: false,
        json: async () => ({ error_description: "Invalid code" }),
      });

      await expect(exchangeCodeForTokens("invalid-code")).rejects.toThrow(
        "Token exchange failed"
      );
    });
  });

  describe("syncTasksToCalendar", () => {
    const mockTasks: Task[] = [
      {
        id: 1,
        name: "Task with date",
        description: "Description",
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
      },
      {
        id: 2,
        name: "Task without date",
        description: null,
        notes: null,
        list_id: 1,
        date: null,
        deadline: null,
        estimate: null,
        actual_time: null,
        priority: "none",
        recurring: "none",
        recurring_config: null,
        completed: false,
        completed_at: null,
        created_at: "2026-06-01T00:00:00Z",
        updated_at: "2026-06-01T00:00:00Z",
        sort_order: 0,
      },
    ];

    it("should sync tasks with dates and skip tasks without dates", async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ id: "event-1" }),
      });

      const result = await syncTasksToCalendar(mockConfig, mockTasks);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should handle duplicate event by updating", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "A task with this id already exists" } }),
        })
        .mockResolvedValueOnce({
          ok: true,
        });

      const result = await syncTasksToCalendar(mockConfig, mockTasks);

      expect(result.updated).toBe(1);
    });

    it("should track errors", async () => {
      (global.fetch as any).mockRejectedValue(new Error("Network error"));

      const result = await syncTasksToCalendar(mockConfig, mockTasks);

      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });

    it("should track error when duplicate update fails", async () => {
      // First call (create) fails with duplicate error
      // Second call (update) also fails
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "A task with this id already exists" } }),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: "Not Found",
        });

      const result = await syncTasksToCalendar(mockConfig, mockTasks);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("Failed to update task");
    });

    it("should track error when create fails with error message", async () => {
      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({ error: { message: "Custom error message" } }),
        });

      const result = await syncTasksToCalendar(mockConfig, mockTasks);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("Failed to create task");
      expect(result.errors[0]).toContain("Custom error message");
    });
  });
});
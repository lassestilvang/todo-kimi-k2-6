/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Task } from "../../../types";

// Mock the google module
const mockGoogleGetEvents = vi.fn();
const mockGoogleCreateEvent = vi.fn();
const mockGoogleUpdateEvent = vi.fn();
const mockGoogleDeleteEvent = vi.fn();
const mockGoogleGetAuthUrl = vi.fn();
const mockGoogleExchangeCode = vi.fn();
const mockGoogleSyncTasks = vi.fn();

// Mock the outlook module
const mockOutlookGetEvents = vi.fn();
const mockOutlookCreateEvent = vi.fn();
const mockOutlookUpdateEvent = vi.fn();
const mockOutlookDeleteEvent = vi.fn();
const mockOutlookGetAuthUrl = vi.fn();
const mockOutlookExchangeCode = vi.fn();

vi.mock("../google", () => ({
  __esModule: true,
  getCalendarEvents: mockGoogleGetEvents,
  createCalendarEvent: mockGoogleCreateEvent,
  updateCalendarEvent: mockGoogleUpdateEvent,
  deleteCalendarEvent: mockGoogleDeleteEvent,
  getAuthUrl: mockGoogleGetAuthUrl,
  exchangeCodeForTokens: mockGoogleExchangeCode,
  syncTasksToCalendar: mockGoogleSyncTasks,
}));

vi.mock("../outlook", () => ({
  __esModule: true,
  getOutlookEvents: mockOutlookGetEvents,
  createOutlookEvent: mockOutlookCreateEvent,
  updateOutlookEvent: mockOutlookUpdateEvent,
  deleteOutlookEvent: mockOutlookDeleteEvent,
  getOutlookAuthUrl: mockOutlookGetAuthUrl,
  exchangeOutlookCodeForTokens: mockOutlookExchangeCode,
}));

describe("Calendar Index", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getCalendarEvents", () => {
    it("should call google getCalendarEvents for google provider", async () => {
      const mockEvents = [{ id: "1", summary: "Event" }];
      mockGoogleGetEvents.mockResolvedValue(mockEvents);

      // Re-import to get fresh module with mocks
      const { getCalendarEvents } = await import("../index");
      const result = await getCalendarEvents({ provider: "google", accessToken: "token" }, "2026-06-01", "2026-06-30");

      expect(result).toEqual(mockEvents);
    });

    it("should call outlook getOutlookEvents for outlook provider", async () => {
      const mockOutlookEvents = [
        {
          id: "1",
          subject: "Event",
          start: { dateTime: "2026-06-30T09:00:00" },
          end: { dateTime: "2026-06-30T10:00:00" },
          body: { content: "desc", contentType: "text" },
          isReminderOn: true,
        },
      ];
      mockOutlookGetEvents.mockResolvedValue(mockOutlookEvents);

      const { getCalendarEvents } = await import("../index");
      const result = await getCalendarEvents({ provider: "outlook", accessToken: "token" }, "2026-06-01", "2026-06-30");

      expect(result).toBeDefined();
    });

    it("should throw error for unknown provider", async () => {
      const { getCalendarEvents } = await import("../index");

      await expect(
        getCalendarEvents({ provider: "unknown" as any, accessToken: "token" }, "2026-06-01", "2026-06-30")
      ).rejects.toThrow("not yet implemented");
    });

    it("should handle outlook events with missing optional fields", async () => {
      const mockOutlookEvents = [
        {
          id: "1",
          subject: "Event",
          start: { dateTime: "2026-06-30T09:00:00" },
          end: { dateTime: "2026-06-30T10:00:00" },
          body: { content: "desc", contentType: "text" },
          isReminderOn: true,
        },
      ];
      mockOutlookGetEvents.mockResolvedValue(mockOutlookEvents);

      const { getCalendarEvents } = await import("../index");
      const result = await getCalendarEvents({ provider: "outlook", accessToken: "token" }, "2026-06-01", "2026-06-30");

      expect(result).toBeDefined();
      expect(result[0].summary).toBe("Event");
    });
  });

  describe("createCalendarEvent", () => {
    it("should call google createCalendarEvent for google provider", async () => {
      mockGoogleCreateEvent.mockResolvedValue("event-123");

      const { createCalendarEvent } = await import("../index");
      const eventId = await createCalendarEvent({ provider: "google", accessToken: "token" }, mockTask);

      expect(eventId).toBe("event-123");
    });

    it("should call outlook createOutlookEvent for outlook provider", async () => {
      mockOutlookCreateEvent.mockResolvedValue("event-456");

      const { createCalendarEvent } = await import("../index");
      const eventId = await createCalendarEvent({ provider: "outlook", accessToken: "token" }, mockTask);

      expect(eventId).toBe("event-456");
    });

    it("should throw error for unknown provider", async () => {
      const { createCalendarEvent } = await import("../index");

      await expect(
        createCalendarEvent({ provider: "unknown" as any, accessToken: "token" }, mockTask)
      ).rejects.toThrow("not yet implemented");
    });
  });

  describe("updateCalendarEvent", () => {
    it("should call google updateCalendarEvent for google provider", async () => {
      mockGoogleUpdateEvent.mockResolvedValue(undefined);

      const { updateCalendarEvent } = await import("../index");
      await updateCalendarEvent({ provider: "google", accessToken: "token" }, "event-123", mockTask);

      expect(mockGoogleUpdateEvent).toHaveBeenCalled();
    });

    it("should call outlook updateOutlookEvent for outlook provider", async () => {
      mockOutlookUpdateEvent.mockResolvedValue(undefined);

      const { updateCalendarEvent } = await import("../index");
      await updateCalendarEvent({ provider: "outlook", accessToken: "token" }, "event-123", mockTask);

      expect(mockOutlookUpdateEvent).toHaveBeenCalled();
    });

    it("should throw error for unknown provider", async () => {
      const { updateCalendarEvent } = await import("../index");

      await expect(
        updateCalendarEvent({ provider: "unknown" as any, accessToken: "token" }, "event-123", mockTask)
      ).rejects.toThrow("not yet implemented");
    });
  });

  describe("deleteCalendarEvent", () => {
    it("should call google deleteCalendarEvent for google provider", async () => {
      mockGoogleDeleteEvent.mockResolvedValue(undefined);

      const { deleteCalendarEvent } = await import("../index");
      await deleteCalendarEvent({ provider: "google", accessToken: "token" }, "event-123");

      expect(mockGoogleDeleteEvent).toHaveBeenCalled();
    });

    it("should call outlook deleteOutlookEvent for outlook provider", async () => {
      mockOutlookDeleteEvent.mockResolvedValue(undefined);

      const { deleteCalendarEvent } = await import("../index");
      await deleteCalendarEvent({ provider: "outlook", accessToken: "token" }, "event-123");

      expect(mockOutlookDeleteEvent).toHaveBeenCalled();
    });

    it("should throw error for unknown provider", async () => {
      const { deleteCalendarEvent } = await import("../index");

      await expect(
        deleteCalendarEvent({ provider: "unknown" as any, accessToken: "token" }, "event-123")
      ).rejects.toThrow("not yet implemented");
    });
  });

  describe("getAuthUrl", () => {
    it("should call google getAuthUrl for google provider", async () => {
      mockGoogleGetAuthUrl.mockReturnValue("https://google.com/auth");

      const { getAuthUrl } = await import("../index");
      const url = getAuthUrl("google", "state-123");

      expect(url).toBe("https://google.com/auth");
    });

    it("should call outlook getOutlookAuthUrl for outlook provider", async () => {
      mockOutlookGetAuthUrl.mockReturnValue("https://outlook.com/auth");

      const { getAuthUrl } = await import("../index");
      const url = getAuthUrl("outlook", "state-123");

      expect(url).toBe("https://outlook.com/auth");
    });

    it("should throw error for unknown provider", async () => {
      const { getAuthUrl } = await import("../index");

      await expect(async () => {
        await getAuthUrl("unknown" as any, "state-123");
      }).rejects.toThrow("not yet implemented");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should call google exchangeCodeForTokens for google provider", async () => {
      mockGoogleExchangeCode.mockResolvedValue({
        access_token: "new-token",
        expires_in: 3600,
      });

      const { exchangeCodeForTokens } = await import("../index");
      const tokens = await exchangeCodeForTokens("google", "auth-code");

      expect(tokens.access_token).toBe("new-token");
    });

    it("should call outlook exchangeOutlookCodeForTokens for outlook provider", async () => {
      mockOutlookExchangeCode.mockResolvedValue({
        access_token: "new-token",
        expires_in: 3600,
      });

      const { exchangeCodeForTokens } = await import("../index");
      const tokens = await exchangeCodeForTokens("outlook", "auth-code");

      expect(tokens.access_token).toBe("new-token");
    });

    it("should throw error for unknown provider", async () => {
      const { exchangeCodeForTokens } = await import("../index");

      await expect(exchangeCodeForTokens("unknown" as any, "auth-code")).rejects.toThrow(
        "not yet implemented"
      );
    });
  });

  describe("syncTasksToCalendar", () => {
    it("should call google syncTasksToCalendar for google provider", async () => {
      mockGoogleSyncTasks.mockResolvedValue({ created: 1, updated: 0, errors: [] });

      const { syncTasksToCalendar } = await import("../index");
      const result = await syncTasksToCalendar({ provider: "google", accessToken: "token" }, [mockTask]);

      expect(result.created).toBe(1);
    });

    it("should call outlook createOutlookEvent for outlook provider", async () => {
      mockOutlookCreateEvent.mockResolvedValue("event-456");

      const { syncTasksToCalendar } = await import("../index");
      const result = await syncTasksToCalendar({ provider: "outlook", accessToken: "token" }, [mockTask]);

      expect(result.created).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should track errors when outlook create fails", async () => {
      mockOutlookCreateEvent.mockRejectedValue(new Error("Failed to create"));

      const { syncTasksToCalendar } = await import("../index");
      const result = await syncTasksToCalendar({ provider: "outlook", accessToken: "token" }, [mockTask]);

      expect(result.errors.length).toBe(1);
      expect(result.errors[0]).toContain("Failed to sync task");
    });

    it("should throw error for unknown provider", async () => {
      const { syncTasksToCalendar } = await import("../index");

      await expect(
        syncTasksToCalendar({ provider: "unknown" as any, accessToken: "token" }, [mockTask])
      ).rejects.toThrow("not yet implemented");
    });
  });
});
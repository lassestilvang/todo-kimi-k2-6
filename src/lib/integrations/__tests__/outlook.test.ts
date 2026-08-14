import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { OutlookConnector } from "../outlook";
import type { IntegrationConfig } from "../base-connector";

// Mock fetch globally
global.fetch = vi.fn();

describe("Outlook Connector", () => {
  let connector: OutlookConnector;
  const mockConfig: IntegrationConfig = {
    id: "outlook-test",
    type: "outlook",
    name: "Outlook Calendar",
    enabled: true,
    accessToken: "test-token",
    refreshToken: "test-refresh-token",
    lastSyncAt: new Date().toISOString(),
    syncDirection: "bidirectional",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    connector = new OutlookConnector({ ...mockConfig, apiToken: "test-token" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should create connector with config values", () => {
      expect(connector.id).toBe("outlook"); // id is hardcoded in class
      expect(connector.type).toBe("outlook");
      expect(connector.name).toBe("Outlook Calendar");
    });

    it("should handle missing refreshToken", () => {
      const conn = new OutlookConnector({
        ...mockConfig,
        apiToken: "test-token",
        refreshToken: undefined,
      });
      expect((conn as any).refreshTokenValue).toBeNull();
    });
  });

  describe("authenticate", () => {
    it("should authenticate with access token", async () => {
      const result = await connector.authenticate({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      });

      expect(result.accessToken).toBe("new-access-token");
      expect(result.refreshToken).toBe("new-refresh-token");
      expect(result.expiresAt).toBeDefined();
    });

    it("should throw error when no access token provided", async () => {
      await expect(connector.authenticate({
        clientId: "test-client",
        clientSecret: "test-secret",
      })).rejects.toThrow("Outlook integration requires an access token");
    });

    it("should update apiToken on successful auth", async () => {
      await connector.authenticate({ accessToken: "updated-token" });
      expect((connector as any).apiToken).toBe("updated-token");
    });

    it("should clear refreshToken if not provided", async () => {
      await connector.authenticate({ accessToken: "test-token" });
      expect((connector as any).refreshTokenValue).toBeNull();
    });
  });

  describe("mapToTask", () => {
    it("should map external record to task with all fields", () => {
      const record = {
        id: "event-123",
        title: "Test Event",
        description: "Event description",
        dueDate: "2024-12-31",
        labels: ["work", "important"],
        assignee: "user@example.com",
        priority: "high",
        categories: ["important"],
        body: "Body content",
      };

      const result = connector.mapToTask(record as any);

      expect(result.title).toBe("Test Event");
      expect(result.description).toBe("Event description");
      expect(result.dueDate).toBe("2024-12-31");
      expect(result.labels).toEqual(["work", "important"]);
      expect(result.assignee).toBe("user@example.com");
      expect(result.priority).toBe("high");
    });

    it("should provide default title when not provided", () => {
      const result = connector.mapToTask({ id: "1", createdAt: "2024-01-01", title: "" } as any);
      expect(result.title).toBe("Untitled");
    });

    it("should extract priority from categories (urgent)", () => {
      const record = {
        id: "event-1",
        title: "Important Task",
        categories: ["urgent", "meeting"],
      };
      const result = connector.mapToTask(record as any);
      expect(result.priority).toBe("critical");
    });

    it("should extract priority from categories (high)", () => {
      const record = {
        id: "event-2",
        title: "Priority Task",
        categories: ["high", "work"],
      };
      const result = connector.mapToTask(record as any);
      expect(result.priority).toBe("high");
    });

    it("should extract priority from categories (low)", () => {
      const record = {
        id: "event-3",
        title: "Low Priority",
        categories: ["low", "deferred"],
      };
      const result = connector.mapToTask(record as any);
      expect(result.priority).toBe("low");
    });

    it("should return undefined priority when no matching categories", () => {
      const record = {
        id: "event-4",
        title: "Regular Task",
        categories: ["general"],
      };
      const result = connector.mapToTask(record as any);
      expect(result.priority).toBeUndefined();
    });

    it("should use description field as fallback to body", () => {
      const record = {
        id: "event-5",
        title: "Test",
        body: "Body content",
      };
      const result = connector.mapToTask(record as any);
      expect(result.description).toBe("Body content");
    });
  });

  describe("pushTask", () => {
    it("should create task without description", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "event-new-id",
          subject: "New Task",
        }),
      });

      const result = await connector.pushTask({
        title: "New Task",
        dueDate: "2024-12-31",
        priority: "high",
      });

      expect(result.id).toBe("event-new-id");
      expect(result.title).toBe("New Task");
      expect(result.eventId).toBe("event-new-id");
    });

    it("should throw error when dueDate is missing", async () => {
      await expect(connector.pushTask({
        title: "Task without date",
      })).rejects.toThrow("Task must have a due date for Outlook Calendar");
    });

    it("should create task with description", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "event-with-desc",
          subject: "Task with Description",
        }),
      });

      const result = await connector.pushTask({
        title: "Task with Description",
        description: "Detailed description",
        dueDate: "2024-12-31",
      });

      expect(result.id).toBe("event-with-desc");
      expect(result.description).toBe("Detailed description");
    });

    it("should throw error on API failure", async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        json: async () => ({
          error: { message: "Invalid credentials" },
        }),
      });

      await expect(connector.pushTask({
        title: "Failed Task",
        dueDate: "2024-12-31",
      })).rejects.toThrow("Failed to create Outlook event");
    });

    it("should format date in timezone", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "event-timezone",
          subject: "Timezone Task",
        }),
      });

      await connector.pushTask({
        title: "Timezone Task",
        dueDate: "2024-12-31",
      });

      // Verify the request was made with proper timezone formatting
      expect(fetch).toHaveBeenCalled();
      const callArgs = (fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.start).toBeDefined();
      expect(body.start.dateTime).toContain("2024-12-31");
    });

    it("should handle null description", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "event-nodescription",
          subject: "No Description Task",
        }),
      });

      const result = await connector.pushTask({
        title: "No Description Task",
        dueDate: "2024-12-31",
        description: null as any,
      });

      expect(result.id).toBe("event-nodescription");
    });

    it("should include priority as uppercase category", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "event-priority",
          subject: "Priority Task",
        }),
      });

      await connector.pushTask({
        title: "Priority Task",
        dueDate: "2024-12-31",
        priority: "high",
      });

      const callArgs = (fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      expect(body.categories).toContain("HIGH");
    });
  });

  describe("testConnection", () => {
    it("should return true on successful connection test", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
      });

      const result = await connector.testConnection();
      expect(result).toBe(true);
    });

    it("should return false on connection failure", async () => {
      (fetch as any).mockRejectedValue(new Error("Network error"));

      const result = await connector.testConnection();
      expect(result).toBe(false);
    });

    it("should return false on failed response", async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      });

      const result = await connector.testConnection();
      expect(result).toBe(false);
    });
  });

  describe("getSyncStatus", () => {
    it("should return sync status with last sync time", async () => {
      const now = new Date().toISOString();
      const conn = new OutlookConnector({
        ...mockConfig,
        lastSyncAt: now,
      });

      const result = await conn.getSyncStatus();

      expect(result.lastSync).toBeInstanceOf(Date);
      expect(result.pendingChanges).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it("should return epoch date when no last sync", async () => {
      const conn = new OutlookConnector({
        ...mockConfig,
        lastSyncAt: undefined,
      });

      const result = await conn.getSyncStatus();

      expect(result.lastSync.getTime()).toBe(0);
    });
  });

  describe("getUserProfile", () => {
    it("should fetch and return user profile", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "user-123",
          displayName: "Test User",
          mail: "test@example.com",
          userPrincipalName: "test@example.com",
        }),
      });

      const result = await connector.getUserProfile();

      expect(result.id).toBe("user-123");
      expect(result.displayName).toBe("Test User");
      expect(result.email).toBe("test@example.com");
    });

    it("should get email from userPrincipalName if mail is missing", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "user-456",
          displayName: "Another User",
          userPrincipalName: "another@example.com",
        }),
      });

      const result = await connector.getUserProfile();

      expect(result.email).toBe("another@example.com");
    });

    it("should throw error on failed profile fetch", async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Forbidden",
      });

      await expect(connector.getUserProfile()).rejects.toThrow("Failed to fetch Outlook profile");
    });
  });

  describe("refreshAccessTokenIfNeeded", () => {
    it("should return null when no refresh token", async () => {
      const result = await connector.refreshAccessTokenIfNeeded();
      expect(result).toBeNull();
    });

    it("should return null when env vars not set", async () => {
      const conn = new OutlookConnector({
        ...mockConfig,
        apiToken: "test-token",
        refreshToken: "refresh-token",
      });

      const result = await conn.refreshAccessTokenIfNeeded();
      expect(result).toBeNull();
    });

    it("should refresh token successfully", async () => {
      // Set required env vars
      process.env.OUTLOOK_CLIENT_ID = "test-client-id";
      process.env.OUTLOOK_CLIENT_SECRET = "test-secret";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      });

      const result = await connector.refreshAccessTokenIfNeeded();

      expect(result).toBe("new-access-token");
      expect((connector as any).apiToken).toBe("new-access-token");

      // Clean up
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;
    });

    it("should update refresh token when returned", async () => {
      process.env.OUTLOOK_CLIENT_ID = "test-client-id";
      process.env.OUTLOOK_CLIENT_SECRET = "test-secret";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "new-token",
          refresh_token: "updated-refresh-token",
          expires_in: 3600,
        }),
      });

      const conn = new OutlookConnector({
        ...mockConfig,
        apiToken: "test-token",
        refreshToken: "original-refresh-token",
      });

      await conn.refreshAccessTokenIfNeeded();

      expect((conn as any).refreshTokenValue).toBe("updated-refresh-token");

      // Clean up
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;
    });

    it("should return null on refresh failure", async () => {
      process.env.OUTLOOK_CLIENT_ID = "test-client-id";
      process.env.OUTLOOK_CLIENT_SECRET = "test-secret";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Invalid grant",
      });

      const conn = new OutlookConnector({
        ...mockConfig,
        apiToken: "test-token",
        refreshToken: "invalid-refresh-token",
      });

      const result = await conn.refreshAccessTokenIfNeeded();
      expect(result).toBeNull();

      // Clean up
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;
    });
  });

  describe("getAuthUrl", () => {
    it("should generate authorization URL", () => {
      process.env.OUTLOOK_CLIENT_ID = "test-client-id";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      const url = OutlookConnector.getAuthUrl("test-state");

      expect(url).toContain("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("state=test-state");
      expect(url).toContain("response_type=code");
      expect(url).toContain("offline_access");

      // Clean up
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.NEXTAUTH_URL;
    });

    it("should handle missing env vars gracefully", () => {
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.NEXTAUTH_URL;

      const url = OutlookConnector.getAuthUrl("state");

      expect(url).toContain("client_id=");
      expect(url).toContain("state=state");
    });
  });

  describe("exchangeCodeForTokens", () => {
    it("should exchange code for tokens", async () => {
      process.env.OUTLOOK_CLIENT_ID = "test-client-id";
      process.env.OUTLOOK_CLIENT_SECRET = "test-secret";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          access_token: "access-token",
          refresh_token: "refresh-token",
          expires_in: 3600,
        }),
      });

      const result = await OutlookConnector.exchangeCodeForTokens("auth-code");

      expect(result.access_token).toBe("access-token");
      expect(result.refresh_token).toBe("refresh-token");
      expect(result.expires_in).toBe(3600);

      // Clean up
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;
      delete process.env.NEXTAUTH_URL;
    });

    it("should throw error on failed exchange", async () => {
      process.env.OUTLOOK_CLIENT_ID = "test-client-id";
      process.env.OUTLOOK_CLIENT_SECRET = "test-secret";
      process.env.NEXTAUTH_URL = "http://localhost:3000";

      (fetch as any).mockResolvedValue({
        ok: false,
        statusText: "Bad Request",
        json: async () => ({
          error_description: "Invalid authorization code",
        }),
      });

      await expect(OutlookConnector.exchangeCodeForTokens("invalid-code"))
        .rejects.toThrow("Token exchange failed");

      // Clean up
      delete process.env.OUTLOOK_CLIENT_ID;
      delete process.env.OUTLOOK_CLIENT_SECRET;
      delete process.env.NEXTAUTH_URL;
    });
  });

  describe("mapOutlookEventToTask (private method)", () => {
    it("should map event with task keywords", () => {
      const event = {
        id: "event-1",
        subject: "Important Task Meeting",
        start: { dateTime: "2024-12-31T10:00:00", timeZone: "UTC" },
        body: { content: "Meeting content" },
        isReminderOn: true,
        sensitivity: "normal",
        categories: ["high"],
        webLink: "https://outlook.com/event/1",
      };

      const result = (connector as any).mapOutlookEventToTask(event);

      expect(result).not.toBeNull();
      expect(result.title).toBe("Important Task Meeting");
      expect(result.description).toBe("Meeting content");
      expect(result.dueDate).toBe("2024-12-31T10:00:00");
      expect(result.eventId).toBe("event-1");
    });

    it("should return null for non-task events without reminders", () => {
      const event = {
        id: "event-2",
        subject: "Regular Event",
        isReminderOn: false,
      };

      const result = (connector as any).mapOutlookEventToTask(event);
      expect(result).toBeNull();
    });

    it("should include events with task keywords even without reminders", () => {
      const event = {
        id: "event-3",
        subject: "Task: Complete project",
        isReminderOn: false,
      };

      const result = (connector as any).mapOutlookEventToTask(event);
      expect(result).not.toBeNull();
    });

    it("should set default values for missing fields", () => {
      const event = {
        id: "event-4",
        subject: "Task with keywords",
        isReminderOn: true,
      };

      const result = (connector as any).mapOutlookEventToTask(event);

      expect(result).not.toBeNull();
      expect(result.title).toBe("Task with keywords");
      expect(result.description).toBe("");
      expect(result.sensitivity).toBe("normal");
    });

    it("should handle event with attendees", () => {
      const event = {
        id: "event-5",
        subject: "Meeting with team",
        isReminderOn: true,
        attendees: [
          { name: "John", emailAddress: { address: "john@example.com" } },
        ],
      };

      const result = (connector as any).mapOutlookEventToTask(event);

      expect(result).not.toBeNull();
      expect(result.assignee).toBe("john@example.com");
      expect(result.attendees).toBeDefined();
    });
  });

  describe("graphApiFetch", () => {
    it("should include authorization header", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          id: "event-1",
          subject: "Test",
        }),
      });

      await connector.pushTask({
        title: "Test",
        dueDate: "2024-12-31",
      });

      const callArgs = (fetch as any).mock.calls[0];
      const headers = callArgs[1].headers;

      expect(headers).toHaveProperty("Authorization");
      expect(headers["Authorization"]).toBe("Bearer test-token");
    });
  });

  describe("extractPriorityFromEvent", () => {
    it("should extract critical priority from categories", () => {
      const event = { categories: ["urgent", "meeting"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("critical");
    });

    it("should extract high priority from categories", () => {
      const event = { categories: ["high", "important"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("high");
    });

    it("should extract low priority from categories", () => {
      const event = { categories: ["low", "deferred"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("low");
    });

    it("should return undefined when no matching categories", () => {
      const event = { categories: ["general", "others"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBeUndefined();
    });

    it("should handle undefined categories", () => {
      const event = {};
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBeUndefined();
    });

    it("should match case-insensitively", () => {
      const event = { categories: ["URGENT", "Critical"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("critical");
    });
  });

  describe("extractDueDateFromEvent", () => {
    it("should extract due date from event", () => {
      const event = { dueDate: "2024-12-31" };
      const result = (connector as any).extractDueDateFromEvent(event);
      expect(result).toBe("2024-12-31");
    });

    it("should return undefined when no due date", () => {
      const event = {};
      const result = (connector as any).extractDueDateFromEvent(event);
      expect(result).toBeUndefined();
    });
  });

  describe("fetchRecords", () => {
    it("should fetch records with since parameter", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const since = new Date("2024-01-01");
      const records = await connector.fetchRecords(since);

      expect(fetch).toHaveBeenCalled();
      expect(records).toEqual([]);
    });

    it("should fetch records with custom limit", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const records = await connector.fetchRecords(undefined, { limit: 10 });

      expect(fetch).toHaveBeenCalled();
      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain("$top=10");
    });

    it("should handle API error response", async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: async () => ({
          error: { message: "Rate limit exceeded" },
        }),
      });

      await expect(connector.fetchRecords()).rejects.toThrow("Outlook API error");
    });

    it("should filter events with task keywords", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          value: [
            {
              id: "event-1",
              subject: "Task: Important work",
              isReminderOn: true,
              start: { dateTime: "2024-12-31T10:00:00" },
            },
            {
              id: "event-2",
              subject: "Regular Meeting",
              isReminderOn: true,
              start: { dateTime: "2024-12-31T11:00:00" },
            },
          ],
        }),
      });

      const records = await connector.fetchRecords();
      expect(records.length).toBe(2);
    });

    it("should handle empty response value", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const records = await connector.fetchRecords();
      expect(records).toEqual([]);
    });

    it("should use default 7 days when no since parameter", async () => {
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      await connector.fetchRecords();

      const url = (fetch as any).mock.calls[0][0];
      expect(url).toContain("ge ");
    });
  });

  describe("extractPriorityFromEvent - critical branch", () => {
    it("should extract critical priority from 'critical' keyword", () => {
      const event = { categories: ["critical", "task"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("critical");
    });

    it("should extract critical when both urgent and critical present", () => {
      const event = { categories: ["urgent", "critical", "high"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("critical");
    });

    it("should extract critical from mixed case", () => {
      const event = { categories: ["URGENT", "CRITICAL", "Meeting"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("critical");
    });

    it("should extract high from 'important' when not urgent/critical", () => {
      const event = { categories: ["important", "meeting"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("high");
    });

    it("should extract high from mixed case", () => {
      const event = { categories: ["Important", "HIGH", "Meeting"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("high");
    });

    it("should extract low from 'deferred' when not urgent/high", () => {
      const event = { categories: ["deferred", "task"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("low");
    });

    it("should extract low from mixed case", () => {
      const event = { categories: ["DEFERRED", "low", "Personal"] };
      const result = (connector as any).extractPriorityFromEvent(event);
      expect(result).toBe("low");
    });
  });
});
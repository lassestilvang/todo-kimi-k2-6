import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";

// Mock modules
vi.mock("@/lib/actions/sharing", () => ({
  shareTask: vi.fn(),
  getTaskShares: vi.fn(),
  removeShare: vi.fn(),
  getSharedTasks: vi.fn(),
  getOrCreateUser: vi.fn(),
  createPublicShare: vi.fn(),
  getShareByToken: vi.fn(),
}));

describe("Shares API Route - Integration Tests", () => {
  let route: typeof import("../route");
  let mockSharing: {
    shareTask: ReturnType<typeof vi.fn>;
    getTaskShares: ReturnType<typeof vi.fn>;
    removeShare: ReturnType<typeof vi.fn>;
    getSharedTasks: ReturnType<typeof vi.fn>;
    getOrCreateUser: ReturnType<typeof vi.fn>;
    createPublicShare: ReturnType<typeof vi.fn>;
    getShareByToken: ReturnType<typeof vi.fn>;
  };

  class MockNextRequest {
    public nextUrl: { searchParams: URLSearchParams };
    public _jsonBody: unknown;

    constructor(url: string, options: { method?: string; body?: unknown } = {}) {
      const parsedUrl = new URL(url, "http://localhost");
      this.nextUrl = {
        searchParams: new URLSearchParams(parsedUrl.search),
      };
      this._jsonBody = options.body;
    }

    nextUrl = { searchParams: URLSearchParams.prototype };

    json () {
      return Promise.resolve(this._jsonBody);
    }
  }

  beforeEach(async () => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);

    // Re-import to get the mocked version
    vi.resetModules();
    mockSharing = await import("@/lib/actions/sharing");
    route = await import("../route");
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  describe("GET /api/shares", () => {
    it("should return share by token for public sharing", async () => {
      const mockShare = {
        id: 1,
        task_id: 123,
        user_id: null,
        permission: "view" as const,
        created_at: new Date().toISOString(),
      };

      mockSharing.getShareByToken.mockResolvedValueOnce(mockShare);

      const request = new MockNextRequest("http://localhost/api/shares?token=abc123") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.share).toEqual(mockShare);
      expect(mockSharing.getShareByToken).toHaveBeenCalledWith("abc123");
    });

    it("should return 404 for invalid share token", async () => {
      mockSharing.getShareByToken.mockResolvedValueOnce(null);

      const request = new MockNextRequest("http://localhost/api/shares?token=invalid") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: "Invalid share token" });
    });

    it("should return shares for specific task", async () => {
      const mockShares = [
        {
          id: 1,
          task_id: 123,
          user_id: 1,
          permission: "edit" as const,
          created_at: new Date().toISOString(),
          user: { id: 1, email: "test@example.com", name: "Test" },
        },
      ];

      mockSharing.getTaskShares.mockResolvedValueOnce(mockShares);

      const request = new MockNextRequest("http://localhost/api/shares?taskId=123") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.shares).toEqual(mockShares);
      expect(mockSharing.getTaskShares).toHaveBeenCalledWith(123);
    });

    it("should return shared tasks for specific user", async () => {
      const mockShares = [
        { id: 1, task_id: 1, user_id: 123, permission: "view" as const, created_at: new Date().toISOString() },
      ];

      mockSharing.getSharedTasks.mockResolvedValueOnce(mockShares);

      const request = new MockNextRequest("http://localhost/api/shares?userId=123") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.shares).toEqual(mockShares);
      expect(mockSharing.getSharedTasks).toHaveBeenCalledWith(123);
    });

    it("should return error when no params provided", async () => {
      const request = new MockNextRequest("http://localhost/api/shares") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Task ID, user ID, or token required" });
    });

    it("should handle errors gracefully", async () => {
      mockSharing.getTaskShares.mockRejectedValueOnce(new Error("Database error"));

      const request = new MockNextRequest("http://localhost/api/shares?taskId=123") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(500);
    });
  });

  describe("POST /api/shares", () => {
    it("should return error for missing taskId and userEmail", async () => {
      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "POST",
        body: { permission: "view" },
      }) as any;

      const response = await route.POST(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Task ID, and permission are required. For private shares, user email is also required.",
      });
    });

    it("should return error for missing permission", async () => {
      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "POST",
        body: { taskId: 123, userEmail: "test@example.com" },
      }) as any;

      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });

    it("should create public share link", async () => {
      mockSharing.createPublicShare.mockResolvedValueOnce({
        token: "public-token-123",
        permission: "view",
      });

      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "POST",
        body: { taskId: 123, permission: "view", isPublic: true },
      }) as any;

      const response = await route.POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.share.token).toBe("public-token-123");
      expect(data.share.permission).toBe("view");
      expect(mockSharing.createPublicShare).toHaveBeenCalledWith(123, "view");
    });

    it("should create private share with user", async () => {
      mockSharing.getOrCreateUser.mockResolvedValueOnce({
        id: 456,
        email: "newuser@example.com",
        name: "New User",
        avatar_url: null,
        created_at: new Date().toISOString(),
      });

      mockSharing.shareTask.mockResolvedValueOnce({
        id: 1,
        task_id: 123,
        user_id: 456,
        permission: "edit",
        created_at: new Date().toISOString(),
      });

      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "POST",
        body: { taskId: 123, userEmail: "newuser@example.com", permission: "edit" },
      }) as any;

      const response = await route.POST(request);

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.share.task_id).toBe(123);
      expect(data.share.user_id).toBe(456);
      expect(data.share.permission).toBe("edit");
    });

    it("should handle createPublicShare error", async () => {
      mockSharing.createPublicShare.mockRejectedValueOnce(new Error("Token generation failed"));

      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "POST",
        body: { taskId: 123, permission: "view", isPublic: true },
      }) as any;

      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });

    it("should handle shareTask error with user lookup", async () => {
      mockSharing.getOrCreateUser.mockRejectedValueOnce(new Error("User creation failed"));

      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "POST",
        body: { taskId: 123, userEmail: "test@example.com", permission: "view" },
      }) as any;

      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE /api/shares", () => {
    it("should return error for missing shareId", async () => {
      const request = new MockNextRequest("http://localhost/api/shares", {
        method: "DELETE",
      }) as any;

      const response = await route.DELETE(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Share ID is required" });
    });

    it("should remove share successfully", async () => {
      mockSharing.removeShare.mockResolvedValueOnce(undefined);

      const request = new MockNextRequest("http://localhost/api/shares?shareId=123", {
        method: "DELETE",
      }) as any;

      const response = await route.DELETE(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ success: true });
      expect(mockSharing.removeShare).toHaveBeenCalledWith(123);
    });

    it("should handle removeShare errors", async () => {
      mockSharing.removeShare.mockRejectedValueOnce(new Error("Delete failed"));

      const request = new MockNextRequest("http://localhost/api/shares?shareId=123", {
        method: "DELETE",
      }) as any;

      const response = await route.DELETE(request);

      expect(response.status).toBe(500);
    });
  });

  describe("Edge cases", () => {
    it("should handle multiple params - token takes precedence", async () => {
      const mockShare = { id: 1, task_id: 123, permission: "view" as const };
      mockSharing.getShareByToken.mockResolvedValueOnce(mockShare);

      const request = new MockNextRequest("http://localhost/api/shares?taskId=456&token=abc123") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ share: mockShare });
    });

    it("should handle both taskId and userId - taskId takes precedence", async () => {
      const mockShares = [{ id: 1, task_id: 123 }];
      mockSharing.getTaskShares.mockResolvedValueOnce(mockShares);

      const request = new MockNextRequest("http://localhost/api/shares?taskId=123&userId=456") as any;
      const response = await route.GET(request);

      expect(response.status).toBe(200);
      expect(mockSharing.getTaskShares).toHaveBeenCalledWith(123);
    });
  });
});
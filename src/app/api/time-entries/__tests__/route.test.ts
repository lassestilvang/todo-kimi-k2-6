import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";

vi.mock("@/lib/api-middleware", () => ({
  applyMiddleware: vi.fn().mockResolvedValue({ error: null, headers: {}, auth: { userId: 1 } }),
  errorResponse: (message: string, status: number) => ({
    status,
    json: () => Promise.resolve({ error: message }),
  }),
  jsonResponse: (data: any, status: number) => ({
    status,
    json: () => Promise.resolve(data),
  }),
}));

vi.mock("@/lib/actions/time", () => ({
  getTimeEntries: vi.fn().mockResolvedValue([]),
  addTimeEntry: vi.fn().mockResolvedValue({ id: 1, task_id: 1, start_time: "2024-01-01", duration: 3600 }),
  updateTimeEntry: vi.fn().mockResolvedValue({ id: 1, task_id: 1, start_time: "2024-01-01", duration: 7200 }),
  deleteTimeEntry: vi.fn().mockResolvedValue(undefined),
}));

function createMockRequest(url: string, options: { method?: string; body?: unknown } = {}): any {
  const parsedUrl = new URL(url, "http://localhost");
  return {
    nextUrl: { searchParams: parsedUrl.searchParams },
    json: () => Promise.resolve(options.body),
    method: options.method || "GET",
  };
}

describe("Time Entries API", () => {
  let route: typeof import("../route");

  beforeEach(async () => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
    vi.resetModules();
    route = await import("../route");
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  describe("GET /api/time-entries", () => {
    it("should return entries for task", async () => {
      const request = createMockRequest("http://localhost/api/time-entries?taskId=1");
      const response = await route.GET(request);

      expect(response.status).toBe(200);
    });

    it("should return 400 for missing taskId", async () => {
      const request = createMockRequest("http://localhost/api/time-entries");
      const response = await route.GET(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Task ID required" });
    });
  });

  describe("POST /api/time-entries", () => {
    it("should create time entry", async () => {
      const entryInput = { task_id: 1, start_time: "2024-01-01T10:00:00" };
      const request = createMockRequest("http://localhost/api/time-entries", {
        method: "POST",
        body: entryInput,
      });
      const response = await route.POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe("PUT /api/time-entries", () => {
    it("should return 400 for missing id", async () => {
      const request = createMockRequest("http://localhost/api/time-entries", {
        method: "PUT",
        body: { duration: 1800 },
      });
      const response = await route.PUT(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Time entry ID required" });
    });

    it("should update time entry with id", async () => {
      const request = createMockRequest("http://localhost/api/time-entries", {
        method: "PUT",
        body: { id: 1, duration: 1800 },
      });
      const response = await route.PUT(request);

      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/time-entries", () => {
    it("should return 400 for missing id", async () => {
      const request = createMockRequest("http://localhost/api/time-entries", {
        method: "DELETE",
      });
      const response = await route.DELETE(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Time entry ID required" });
    });

    it("should delete time entry by id", async () => {
      const request = createMockRequest("http://localhost/api/time-entries?id=1", {
        method: "DELETE",
      });
      const response = await route.DELETE(request);

      expect(response.status).toBe(200);
    });
  });
});
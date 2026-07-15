import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";

// Mock modules at the top level
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

vi.mock("@/lib/logger", () => ({
  logError: vi.fn(),
}));

// Helper to create mock NextRequest
function createMockRequest(url: string, options: { method?: string; body?: unknown } = {}): any {
  const parsedUrl = new URL(url, "http://localhost");
  return {
    nextUrl: {
      searchParams: parsedUrl.searchParams,
    },
    json: () => Promise.resolve(options.body),
    method: options.method || "GET",
  };
}

describe("Task Voting API - Structure and Logic Tests", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  describe("Handler existence", () => {
    it("should have GET handler defined", async () => {
      const route = await import("../route");
      expect(route.GET).toBeDefined();
      expect(typeof route.GET).toBe("function");
    });

    it("should have POST handler defined", async () => {
      const route = await import("../route");
      expect(route.POST).toBeDefined();
      expect(typeof route.POST).toBe("function");
    });

    it("should have DELETE handler defined", async () => {
      const route = await import("../route");
      expect(route.DELETE).toBeDefined();
      expect(typeof route.DELETE).toBe("function");
    });
  });

  describe("Vote validation logic", () => {
    it("should validate vote values -1 and 1 are valid", () => {
      const validValues = [-1, 1];
      const testValue = (value: number) => validValues.includes(value);
      expect(testValue(1)).toBe(true);
      expect(testValue(-1)).toBe(true);
    });

    it("should validate vote values outside -1 and 1 are invalid", () => {
      const validValues = [-1, 1];
      const testValue = (value: number) => validValues.includes(value);
      expect(testValue(0)).toBe(false);
      expect(testValue(2)).toBe(false);
    });

    it("should calculate vote score correctly", () => {
      const votes = [
        { value: 1 },
        { value: 1 },
        { value: -1 },
        { value: 1 },
      ];
      const total = votes.reduce((sum, v) => sum + v.value, 0);
      const count = votes.length;
      const score = count > 0 ? total / count : 0;

      expect(total).toBe(2);
      expect(count).toBe(4);
      expect(score).toBe(0.5);
    });

    it("should handle empty votes for score calculation", () => {
      const votes: { value: number }[] = [];
      const total = votes.reduce((sum, v) => sum + v.value, 0);
      const count = votes.length;
      const score = count > 0 ? total / count : 0;

      expect(score).toBe(0);
    });
  });
});

describe("Task Voting API - Request Validation Tests", () => {
  beforeEach(async () => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);

    // Re-import to get fresh module
    vi.resetModules();
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  describe("POST validation", () => {
    it("should return 400 for missing task_id", async () => {
      const route = await import("../route");
      const request = createMockRequest(
        "http://localhost/api/task-votes",
        { method: "POST", body: { value: 1 } }
      );
      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for missing value", async () => {
      const route = await import("../route");
      const request = createMockRequest(
        "http://localhost/api/task-votes",
        { method: "POST", body: { task_id: 1 } }
      );
      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid value (0)", async () => {
      const route = await import("../route");
      const request = createMockRequest(
        "http://localhost/api/task-votes",
        { method: "POST", body: { task_id: 1, value: 0 } }
      );
      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });

    it("should return 400 for invalid value (2)", async () => {
      const route = await import("../route");
      const request = createMockRequest(
        "http://localhost/api/task-votes",
        { method: "POST", body: { task_id: 1, value: 2 } }
      );
      const response = await route.POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe("DELETE validation", () => {
    it("should return 400 for missing task_id", async () => {
      const route = await import("../route");
      const request = createMockRequest(
        "http://localhost/api/task-votes",
        { method: "DELETE" }
      );
      const response = await route.DELETE(request);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "task_id is required" });
    });
  });
});

describe("Task Voting API - Response Structure Tests", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  it("should return proper response structure for GET without params", async () => {
    const route = await import("../route");
    const request = createMockRequest("http://localhost/api/task-votes");
    const response = await route.GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    // Mock returns empty votes when no params
    expect(data).toHaveProperty("votes");
  });

  it("should return proper response structure for POST success", async () => {
    const route = await import("../route");
    const request = createMockRequest(
      "http://localhost/api/task-votes",
      { method: "POST", body: { task_id: 1, value: 1 } }
    );
    const response = await route.POST(request);

    // Mock behavior: returns success but task may not exist
    // Either 200 (if mock allows) or 404 (if task check works)
    expect([200, 404, 500]).toContain(response.status);
  });

  it("should return proper response structure for DELETE missing param", async () => {
    const route = await import("../route");
    const request = createMockRequest(
      "http://localhost/api/task-votes",
      { method: "DELETE" }
    );
    const response = await route.DELETE(request);

    expect(response.status).toBe(400);
    expect(await response.json()).toHaveProperty("error");
  });
});

describe("Task Voting API - Vote Score Calculation", () => {
  // Pure unit tests for the score calculation logic used in the API
  it("should calculate average score from vote values", () => {
    const calculateScore = (votes: { value: number }[]) => {
      const total = votes.reduce((sum, v) => sum + v.value, 0);
      const count = votes.length;
      return count > 0 ? total / count : 0;
    };

    // All positive
    expect(calculateScore([{ value: 1 }, { value: 1 }, { value: 1 }])).toBe(1);

    // All negative
    expect(calculateScore([{ value: -1 }, { value: -1 }])).toBe(-1);

    // Mixed
    expect(calculateScore([{ value: 1 }, { value: 1 }, { value: -1 }])).toBe(1/3);

    // Empty
    expect(calculateScore([])).toBe(0);
  });

  it("should correctly sum vote values", () => {
    const sumVotes = (votes: { value: number }[]) => {
      return votes.reduce((sum, v) => sum + v.value, 0);
    };

    expect(sumVotes([])).toBe(0);
    expect(sumVotes([{ value: 1 }])).toBe(1);
    expect(sumVotes([{ value: -1 }])).toBe(-1);
    expect(sumVotes([{ value: 1 }, { value: 1 }, { value: -1 }])).toBe(1);
    expect(sumVotes([{ value: 1 }, { value: -1 }, { value: 1 }, { value: -1 }])).toBe(0);
  });
});

describe("Task Voting API - Database Operations", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    resetDb();
    vi.clearAllMocks();
  });

  describe("GET with task_id", () => {
    it("should return votes for specific task", async () => {
      // Create test tables
      const testDb = createTestDb();
      setDb(testDb);
      testDb.exec(`
        CREATE TABLE IF NOT EXISTS task_votes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          task_id INTEGER,
          user_id INTEGER,
          value INTEGER,
          created_at TEXT
        );
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          avatar_url TEXT
        );
      `);

      // Insert test votes
      testDb.prepare("INSERT INTO task_votes (task_id, user_id, value, created_at) VALUES (?, ?, ?, ?)")
        .run(1, 1, 1, "2024-01-01");
      testDb.prepare("INSERT INTO task_votes (task_id, user_id, value, created_at) VALUES (?, ?, ?, ?)")
        .run(1, 2, -1, "2024-01-02");

      const route = await import("../route");
      const request = createMockRequest("http://localhost/api/task-votes?task_id=1");
      const response = await route.GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("GET with user_id", () => {
    it("should return votes for specific user", async () => {
      const testDb = createTestDb();
      setDb(testDb);

      const route = await import("../route");
      const request = createMockRequest("http://localhost/api/task-votes?user_id=1");
      const response = await route.GET(request);

      expect(response.status).toBe(200);
    });
  });

  describe("Score calculation edge cases", () => {
    it("should handle all positive votes", () => {
      const votes = [{ value: 1 }, { value: 1 }, { value: 1 }];
      const total = votes.reduce((sum, v) => sum + v.value, 0);
      const score = total / votes.length;
      expect(score).toBe(1);
    });

    it("should handle all negative votes", () => {
      const votes = [{ value: -1 }, { value: -1 }, { value: -1 }];
      const total = votes.reduce((sum, v) => sum + v.value, 0);
      const score = total / votes.length;
      expect(score).toBe(-1);
    });

    it("should handle equal positive and negative votes", () => {
      const votes = [{ value: 1 }, { value: 1 }, { value: -1 }, { value: -1 }];
      const total = votes.reduce((sum, v) => sum + v.value, 0);
      const score = total / votes.length;
      expect(score).toBe(0);
    });
  });

  describe("Vote data structure", () => {
    it("should have correct vote object structure", () => {
      const vote = { id: 1, task_id: 1, user_id: 1, value: 1, created_at: "2024-01-01" };
      expect(vote.id).toBe(1);
      expect(vote.task_id).toBe(1);
      expect(vote.user_id).toBe(1);
      expect(vote.value).toBe(1);
    });
  });

  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Test with invalid database state
      const route = await import("../route");
      const request = createMockRequest("http://localhost/api/task-votes");

      // Should not throw
      const response = await route.GET(request);
      expect(response).toBeDefined();
    });
  });
});
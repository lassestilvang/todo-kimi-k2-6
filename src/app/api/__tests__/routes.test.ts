import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";

describe("API Routes", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  describe("GET /api/ai", () => {
    it("should return AI configuration status", async () => {
      const response = await fetch("/api/ai");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("openai");
      expect(data).toHaveProperty("anthropic");
      expect(data).toHaveProperty("activeProvider");
    });
  });

  describe("GET /api/auth/session", () => {
    it("should return session info", async () => {
      const response = await fetch("/api/auth/session");
      expect(response.status).toBe(200);
    });
  });

  describe("POST /api/ai (parse)", () => {
    it("should parse task input", async () => {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "parse",
          input: { text: "Create a test task" },
        }),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("name");
      expect(data.name).toBe("Create a test task");
    });
  });

  describe("POST /api/ai (insights)", () => {
    it("should generate insights", async () => {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "insights",
          input: { tasks: [] },
        }),
      });
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("tips");
      expect(data).toHaveProperty("suggestions");
      expect(data).toHaveProperty("trends");
    });
  });

  describe("GET /api/time-entries", () => {
    it("should return empty array for non-existent task", async () => {
      const response = await fetch("/api/time-entries?taskId=99999");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.entries).toEqual([]);
    });
  });

  describe("GET /api/reminders/upcoming", () => {
    it("should return upcoming reminders", async () => {
      const response = await fetch("/api/reminders/upcoming");
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  describe("GET /api/export/pdf", () => {
    it("should return PDF export", async () => {
      const response = await fetch("/api/export/pdf");
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/plain");
    });
  });

  describe("GET /api/calendar/events", () => {
    it("should return 401 without auth", async () => {
      const response = await fetch("/api/calendar/events");
      expect(response.status).toBe(401);
    });
  });

  describe("GET /api/shares/[token]", () => {
    it("should return 404 for invalid token", async () => {
      const response = await fetch("/api/shares/invalid-token");
      expect(response.status).toBe(404);
    });
  });
});
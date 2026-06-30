import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { setDb, resetDb } from "@/lib/db";

// Mock external services
vi.mock("nodemailer", () => ({
  createTransporter: () => ({
    sendMail: vi.fn().mockResolvedValue({ messageId: "test-message-id" }),
  }),
}));

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("API Integration Tests", () => {
  beforeEach(() => {
    resetDb();
    const testDb = createTestDb();
    setDb(testDb);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Authentication API", () => {
    it("should register a new user", async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.message).toBe("User created successfully");
    });

    it("should reject duplicate registration", async () => {
      // First registration
      await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "password123",
        }),
      });

      // Second registration with same email
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User 2",
          email: "test@example.com",
          password: "password123",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should reject weak password", async () => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          password: "short",
        }),
      });

      expect(response.status).toBe(400);
    });
  });

  describe("Task API", () => {
    it("should create task via API", async () => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "API Task" }),
      });

      expect(response.status).toBe(200);
      const task = await response.json();
      expect(task.name).toBe("API Task");
    });

    it("should return 404 for non-existent task", async () => {
      const response = await fetch("/api/tasks/99999", {
        method: "GET",
      });

      expect(response.status).toBe(404);
    });

    it("should update task via API", async () => {
      // Create task first
      const createResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Original" }),
      });
      const task = await createResponse.json();

      // Update task
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
      });

      expect(response.status).toBe(200);
      const updated = await response.json();
      expect(updated.name).toBe("Updated");
    });

    it("should delete task via API", async () => {
      // Create task first
      const createResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "To Delete" }),
      });
      const task = await createResponse.json();

      // Delete task
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: "DELETE",
      });

      expect(response.status).toBe(204);
    });
  });

  describe("Time Entries API", () => {
    it("should create time entry", async () => {
      // Create a task first
      const taskResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Task for time entry" }),
      });
      const task = await taskResponse.json();

      const response = await fetch("/api/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          start_time: new Date().toISOString(),
          duration_seconds: 1800,
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe("Reminders API", () => {
    it("should create reminder", async () => {
      // Create a task first
      const taskResponse = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Task for reminder" }),
      });
      const task = await taskResponse.json();

      const response = await fetch("/api/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: task.id,
          remind_at: new Date(Date.now() + 3600000).toISOString(),
        }),
      });

      expect(response.status).toBe(201);
    });
  });

  describe("Export API", () => {
    it("should export tasks as JSON", async () => {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("application/json");
    });

    it("should export tasks as CSV", async () => {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv" }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/csv");
    });
  });
});
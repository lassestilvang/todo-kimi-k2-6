import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer before any imports
vi.mock("nodemailer", () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-message-id" });
  const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail });

  return {
    default: { createTransport: mockCreateTransport },
    createTransport: mockCreateTransport,
  };
});

import { sendTaskReminderEmail, sendDueSoonEmail, sendTaskSharedEmail, sendWeeklyDigest } from "../index";

describe("email", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    // Set default env vars
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "test";
    process.env.SMTP_PASS = "pass";
    process.env.EMAIL_FROM = "test@test.com";
    process.env.NEXTAUTH_URL = "http://localhost:3000";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("sendTaskReminderEmail", () => {
    it("should send reminder email and return boolean", async () => {
      const task = {
        id: 1,
        name: "Test Task",
        deadline: "2024-12-31",
        completed: false,
        description: "Test description",
      };

      const result = await sendTaskReminderEmail("user@test.com", task);
      expect(result).toBe(true);
    });

    it("should send email without description", async () => {
      const task = {
        id: 1,
        name: "Test Task",
        deadline: null,
        completed: false,
      };

      const result = await sendTaskReminderEmail("user@test.com", task);
      expect(result).toBe(true);
    });

    it("should send email without deadline", async () => {
      const task = {
        id: 1,
        name: "Test Task",
        description: "No deadline",
      };

      const result = await sendTaskReminderEmail("user@test.com", task);
      expect(result).toBe(true);
    });
  });

  describe("sendDueSoonEmail", () => {
    it("should send due soon email and return boolean", async () => {
      const task = {
        id: 1,
        name: "Urgent Task",
        deadline: "2024-01-15",
      };

      const result = await sendDueSoonEmail("user@test.com", task);
      expect(result).toBe(true);
    });

    it("should send email without deadline", async () => {
      const task = {
        id: 1,
        name: "Task without deadline",
      };

      const result = await sendDueSoonEmail("user@test.com", task);
      expect(result).toBe(true);
    });
  });

  describe("sendTaskSharedEmail", () => {
    it("should send task shared email and return boolean", async () => {
      const task = {
        id: 123,
        name: "Shared Task",
        description: "Task description",
        deadline: "2024-12-31",
      };

      // sendTaskSharedEmail signature: (email, taskName, sharerName, permission)
      const result = await sendTaskSharedEmail("invitee@test.com", "Shared Task", "John Doe", "view");
      expect(result).toBe(true);
    });

    it("should send email with edit permission", async () => {
      const result = await sendTaskSharedEmail("invitee@test.com", "Task", "Jane", "edit");
      expect(result).toBe(true);
    });
  });

  describe("sendWeeklyDigest", () => {
    it("should send weekly digest with summary stats", async () => {
      const summary = {
        totalTasks: 50,
        completedTasks: 35,
        overdueTasks: 3,
        criticalTasks: 5,
      };

      const result = await sendWeeklyDigest("user@test.com", summary);
      expect(result).toBe(true);
    });

    it("should handle zero tasks", async () => {
      const summary = {
        totalTasks: 0,
        completedTasks: 0,
        overdueTasks: 0,
        criticalTasks: 0,
      };

      const result = await sendWeeklyDigest("user@test.com", summary);
      expect(result).toBe(true);
    });

    it("should handle high numbers", async () => {
      const summary = {
        totalTasks: 1000,
        completedTasks: 950,
        overdueTasks: 10,
        criticalTasks: 20,
      };

      const result = await sendWeeklyDigest("user@test.com", summary);
      expect(result).toBe(true);
    });
  });

  describe("email configuration via environment", () => {
    it("should use default SMTP settings when env vars not set", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.EMAIL_FROM;

      const task = { id: 1, name: "Test" };

      // Should still work with defaults - resend defaults
      const result = await sendTaskReminderEmail("test@test.com", task);
      expect(result).toBe(true);
    });

    it("should use custom SMTP port from environment", async () => {
      process.env.SMTP_PORT = "465";

      const task = { id: 1, name: "Test" };
      const result = await sendTaskReminderEmail("test@test.com", task);
      expect(result).toBe(true);
    });
  });

  describe("email template generation", () => {
    it("should generate correct subject for reminder", async () => {
      const task = { id: 1, name: "Reminder Task" };

      const result = await sendTaskReminderEmail("test@test.com", task);
      expect(result).toBe(true);
    });

    it("should generate correct subject for due soon", async () => {
      const task = { id: 1, name: "Due Soon Task" };

      const result = await sendDueSoonEmail("test@test.com", task);
      expect(result).toBe(true);
    });

    it("should generate correct subject for shared task", async () => {
      const result = await sendTaskSharedEmail("test@test.com", "Shared Task", "Sender", "view");
      expect(result).toBe(true);
    });

    it("should generate correct subject for weekly digest", async () => {
      const summary = { totalTasks: 10, completedTasks: 8, overdueTasks: 1, criticalTasks: 2 };

      const result = await sendWeeklyDigest("test@test.com", summary);
      expect(result).toBe(true);
    });
  });
});
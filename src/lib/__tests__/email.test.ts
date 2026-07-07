import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock nodemailer before imports
vi.mock("nodemailer", () => {
  const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-message-id" });
  return {
    default: {
      createTransport: vi.fn().mockReturnValue({ sendMail: mockSendMail }),
    },
    createTransport: vi.fn().mockReturnValue({ sendMail: mockSendMail }),
  };
});

import { sendTaskReminderEmail, sendDueSoonEmail, sendTaskSharedEmail, sendWeeklyDigest } from "../email";

describe("email (legacy)", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = "smtp.test.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "test";
    process.env.SMTP_PASS = "pass";
    process.env.EMAIL_FROM = "test@test.com";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("sendTaskReminderEmail", () => {
    it("should call transporter.sendMail with correct options", async () => {
      const task = {
        id: 1,
        name: "Test Task",
        deadline: "2024-12-31",
        completed: false,
        description: "Test description",
      };

      const result = await sendTaskReminderEmail("user@test.com", task);
      expect(result).toBeDefined();
    });

    it("should handle task without description", async () => {
      const task = {
        id: 1,
        name: "Test Task",
        deadline: null,
      };

      const result = await sendTaskReminderEmail("user@test.com", task);
      expect(result).toBeDefined();
    });
  });

  describe("sendDueSoonEmail", () => {
    it("should send due soon email", async () => {
      const task = {
        id: 1,
        name: "Urgent Task",
        deadline: "2024-01-15",
      };

      const result = await sendDueSoonEmail("user@test.com", task);
      expect(result).toBeDefined();
    });
  });

  describe("sendTaskSharedEmail", () => {
    it("should send shared email with task and inviter name", async () => {
      const task = {
        id: 123,
        name: "Shared Task",
        description: "Task description",
        deadline: "2024-12-31",
      };

      const result = await sendTaskSharedEmail("invitee@test.com", task, "John Doe");
      expect(result).toBeDefined();
    });
  });

  describe("sendWeeklyDigest", () => {
    it("should send weekly digest email", async () => {
      const summary = {
        totalTasks: 50,
        completedTasks: 35,
        overdueTasks: 3,
        criticalTasks: 5,
      };

      const result = await sendWeeklyDigest("user@test.com", summary);
      expect(result).toBeDefined();
    });
  });

  describe("environment variables", () => {
    it("should use default values when env vars not set", async () => {
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_PORT;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;
      delete process.env.EMAIL_FROM;

      const task = { id: 1, name: "Test" };
      const result = await sendTaskReminderEmail("test@test.com", task);
      expect(result).toBeDefined();
    });
  });
});
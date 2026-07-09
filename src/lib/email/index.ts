// Email notification system
// This implementation uses Nodemailer for sending emails
// Requires SMTP configuration (e.g., SendGrid, Resend, or custom SMTP)

import type { Priority } from "@/types";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

/**
 * Get user notification settings
 */
export interface NotificationSettings {
  enabled: boolean;
  reminderMinutes: number;
  dueDateReminders: boolean;
  overdueReminders: boolean;
  dailySummary: boolean;
}

// Create transporter with config
function createTransporter(config?: EmailConfig) {
  // Check if nodemailer is available
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodemailer = require("nodemailer");

    const smtp = config || {
      host: process.env.SMTP_HOST || "smtp.resend.dev",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || "resend",
        pass: process.env.SMTP_PASS || "",
      },
    };

    return nodemailer.createTransporter(smtp);
  } catch {
    // Fallback stub for development
    return {
      sendMail: async () => ({ success: true }),
    };
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions, config?: EmailConfig): Promise<boolean> {
  try {
    const transporter = createTransporter(config);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export interface EmailTask {
  id: number;
  name: string;
  description: string | null;
  deadline: string | null;
  priority?: Priority;
}

/**
 * Get notification settings for a user
 */
export async function getUserNotificationSettings(userId: number): Promise<NotificationSettings> {
  // In a real implementation, this would fetch from the database
  // For now, return default settings
  return {
    enabled: true,
    reminderMinutes: 60,
    dueDateReminders: true,
    overdueReminders: true,
    dailySummary: false,
  };
}

/**
 * Check if we should send an email notification for a task
 * Returns true if notifications are enabled and the task qualifies
 */
export async function shouldSendNotification(
  userId: number,
  task: EmailTask,
  type: "reminder" | "due_soon" | "overdue"
): Promise<boolean> {
  const settings = await getUserNotificationSettings(userId);

  if (!settings.enabled) return false;

  switch (type) {
    case "reminder":
      return settings.reminderMinutes > 0;
    case "due_soon":
      return settings.dueDateReminders;
    case "overdue":
      return settings.overdueReminders;
    default:
      return false;
  }
}

export async function sendTaskReminderEmail(
  userEmail: string,
  task: EmailTask
): Promise<boolean> {
  const subject = `Task Reminder: ${task.name}`;
  const html = `
    <h2>Task Reminder</h2>
    <p>You have a pending task:</p>
    <h3>${task.name}</h3>
    ${task.description ? `<p>${task.description}</p>` : ""}
    ${task.deadline ? `<p><strong>Due:</strong> ${new Date(task.deadline).toLocaleString()}</p>` : ""}
    <p><a href="${process.env.NEXTAUTH_URL}/tasks/${task.id}">View Task</a></p>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

export async function sendDueSoonEmail(
  userEmail: string,
  task: EmailTask
): Promise<boolean> {
  const subject = `Due Soon: ${task.name}`;
  const html = `
    <h2>Task Due Soon</h2>
    <p>The following task is due soon:</p>
    <h3>${task.name}</h3>
    ${task.deadline ? `<p><strong>Due:</strong> ${new Date(task.deadline).toLocaleString()}</p>` : ""}
    <p><a href="${process.env.NEXTAUTH_URL}/tasks/${task.id}">View Task</a></p>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

export async function sendTaskSharedEmail(
  userEmail: string,
  taskName: string,
  sharerName: string,
  permission: "view" | "edit"
): Promise<boolean> {
  const subject = `${sharerName} shared a task with you`;
  const html = `
    <h2>Task Shared With You</h2>
    <p>${sharerName} has shared a task with you.</p>
    <h3>${taskName}</h3>
    <p><strong>Your permission:</strong> ${permission}</p>
    <p><a href="${process.env.NEXTAUTH_URL}/tasks">View Tasks</a></p>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}

export async function sendWeeklyDigest(
  userEmail: string,
  summary: {
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    criticalTasks: number;
  }
): Promise<boolean> {
  const subject = `Your Weekly Task Summary`;
  const html = `
    <h2>Weekly Task Summary</h2>
    <div style="display: grid; gap: 8px;">
      <div><strong>Total Tasks:</strong> ${summary.totalTasks}</div>
      <div><strong>Completed:</strong> ${summary.completedTasks}</div>
      <div><strong>Overdue:</strong> ${summary.overdueTasks}</div>
      <div><strong>Critical:</strong> ${summary.criticalTasks}</div>
    </div>
    <p style="margin-top: 16px;"><a href="${process.env.NEXTAUTH_URL}">View Dashboard</a></p>
  `;

  return sendEmail({
    to: userEmail,
    subject,
    html,
  });
}
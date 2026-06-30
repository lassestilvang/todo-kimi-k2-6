import nodemailer from "nodemailer";
import type { TaskWithRelations, User } from "@/types";

// Email transporter configuration
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.dev",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASS || "",
  },
});

export interface NotificationConfig {
  dueDateReminders: boolean;
  overdueReminders: boolean;
  dailySummary: boolean;
  reminderMinutes: number;
}

export async function sendTaskDueReminder(
  user: User,
  task: TaskWithRelations
): Promise<void> {
  if (!task.deadline) return;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: user.email,
    subject: `Task Due: ${task.name}`,
    html: `
      <h2>Task Due Reminder</h2>
      <p>Hello ${user.name || "there"}!</p>
      <p>Your task <strong>${task.name}</strong> is due on ${new Date(task.deadline).toLocaleDateString()}.</p>
      ${task.description ? `<p>Description: ${task.description}</p>` : ""}
      <p>Don't forget to complete it!</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send due reminder:", error);
  }
}

export async function sendTaskOverdueNotification(
  user: User,
  task: TaskWithRelations
): Promise<void> {
  if (!task.deadline) return;

  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: user.email,
    subject: `Task Overdue: ${task.name}`,
    html: `
      <h2>Task Overdue!</h2>
      <p>Hello ${user.name || "there"}!</p>
      <p>Your task <strong>${task.name}</strong> was due on ${new Date(task.deadline).toLocaleDateString()} and is now overdue.</p>
      <p>Please prioritize completing this task.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}" style="display: inline-block; padding: 10px 20px; background: #e11d48; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send overdue notification:", error);
  }
}

export async function sendDailySummary(
  user: User,
  tasks: TaskWithRelations[]
): Promise<void> {
  const completedToday = tasks.filter(
    (t) => t.completed && t.completed_at && new Date(t.completed_at).toDateString() === new Date().toDateString()
  );
  const pending = tasks.filter((t) => !t.completed);
  const overdue = tasks.filter(
    (t) => !t.completed && t.deadline && new Date(t.deadline) < new Date()
  );

  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: user.email,
    subject: "Daily Task Summary",
    html: `
      <h2>Daily Task Summary</h2>
      <p>Hello ${user.name || "there"}!</p>
      <h3>Today's Progress</h3>
      <ul>
        <li>Completed: ${completedToday.length} tasks</li>
        <li>Pending: ${pending.length} tasks</li>
        <li>Overdue: ${overdue.length} tasks</li>
      </ul>
      ${overdue.length > 0 ? `<h3>Action Needed</h3><p>You have ${overdue.length} overdue tasks that need attention.</p>` : ""}
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px;">View All Tasks</a>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send daily summary:", error);
  }
}

export async function sendAssignmentNotification(
  user: User,
  task: TaskWithRelations,
  permission: "view" | "edit"
): Promise<void> {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: user.email,
    subject: `Task Assigned: ${task.name}`,
    html: `
      <h2>Task Assignment</h2>
      <p>Hello ${user.name || "there"}!</p>
      <p>You've been assigned the task <strong>${task.name}</strong> with <strong>${permission}</strong> permission.</p>
      ${task.description ? `<p>Description: ${task.description}</p>` : ""}
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${task.id}" style="display: inline-block; padding: 10px 20px; background: #0070f3; color: white; text-decoration: none; border-radius: 5px;">View Task</a>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send assignment notification:", error);
  }
}
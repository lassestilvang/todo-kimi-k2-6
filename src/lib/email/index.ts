// Email notification system
// This implementation uses Nodemailer for sending emails
// Requires SMTP configuration (e.g., SendGrid, Resend, or custom SMTP)

import nodemailer from "nodemailer";
import type { TaskWithRelations } from "@/types";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Create transporter with config
function createTransporter(config?: EmailConfig) {
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

export async function sendTaskReminderEmail(
  userEmail: string,
  task: TaskWithRelations
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
  task: TaskWithRelations
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

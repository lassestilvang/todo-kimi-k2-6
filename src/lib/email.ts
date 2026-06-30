import nodemailer from "nodemailer";
import type { TaskWithRelations } from "@/types";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.resend.dev",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "resend",
    pass: process.env.SMTP_PASS || "",
  },
});

export async function sendTaskReminderEmail(email: string, task: TaskWithRelations) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: email,
    subject: `Task Reminder: ${task.name}`,
    html: `
      <h2>Task Reminder</h2>
      <p>This is a reminder for your task: <strong>${task.name}</strong></p>
      ${task.description ? `<p>Description: ${task.description}</p>` : ""}
      ${task.deadline ? `<p>Deadline: ${new Date(task.deadline).toLocaleDateString()}</p>` : ""}
      <p>Don't forget to complete it!</p>
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendDueSoonEmail(email: string, task: TaskWithRelations) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: email,
    subject: `Task Due Soon: ${task.name}`,
    html: `
      <h2>Task Due Soon</h2>
      <p>⚠️ The following task is due soon:</p>
      <p><strong>${task.name}</strong></p>
      ${task.deadline ? `<p>Deadline: ${new Date(task.deadline).toLocaleDateString()}</p>` : ""}
    `,
  };

  return transporter.sendMail(mailOptions);
}

export async function sendWeeklyDigest(email: string, summary: {
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  criticalTasks: number;
}) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || "TaskFlow <noreply@taskflow.app>",
    to: email,
    subject: "Weekly Task Digest",
    html: `
      <h2>Weekly Task Digest</h2>
      <p>Here's your weekly summary:</p>
      <ul>
        <li>Total tasks: ${summary.totalTasks}</li>
        <li>Completed: ${summary.completedTasks}</li>
        <li>Overdue: ${summary.overdueTasks}</li>
        <li>Critical: ${summary.criticalTasks}</li>
      </ul>
    `,
  };

  return transporter.sendMail(mailOptions);
}
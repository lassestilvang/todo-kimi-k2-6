/**
 * External Integrations for TaskFlow
 * Supports Slack, Discord, and Email notifications
 */

export interface IntegrationConfig {
  enabled: boolean;
  webhookUrl?: string;
  channel?: string;
  botToken?: string;
}

export interface TaskNotification {
  taskId: number;
  taskName: string;
  action: "created" | "updated" | "completed" | "due_soon" | "overdue";
  assignee?: { id: number; name: string; email: string };
  dueDate?: string;
  priority?: string;
  workspaceId?: number;
}

/**
 * Send notification to Slack webhook
 */
export async function sendSlackNotification(
  webhookUrl: string,
  notification: TaskNotification
): Promise<boolean> {
  const colorMap = {
    created: "#36a64f",
    updated: "#3383cc",
    completed: "#36a64f",
    due_soon: "#ff9900",
    overdue: "#ff0000",
  };

  const titleMap = {
    created: "Task Created",
    updated: "Task Updated",
    completed: "Task Completed",
    due_soon: "Task Due Soon",
    overdue: "Task Overdue",
  };

  const payload = {
    attachments: [
      {
        color: colorMap[notification.action],
        title: titleMap[notification.action],
        text: notification.taskName,
        fields: [
          {
            title: "Priority",
            value: notification.priority || "None",
            short: true,
          },
          ...(notification.dueDate
            ? [
                {
                  title: "Due Date",
                  value: new Date(notification.dueDate).toLocaleDateString(),
                  short: true,
                },
              ]
            : []),
        ],
        footer: "TaskFlow",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Slack notification failed:", error);
    return false;
  }
}

/**
 * Send notification to Discord webhook
 */
export async function sendDiscordNotification(
  webhookUrl: string,
  notification: TaskNotification
): Promise<boolean> {
  const colorMap = {
    created: 0x36a64f,
    updated: 0x3383cc,
    completed: 0x36a64f,
    due_soon: 0xff9900,
    overdue: 0xff0000,
  };

  const titleMap = {
    created: "Task Created",
    updated: "Task Updated",
    completed: "Task Completed",
    due_soon: "Task Due Soon",
    overdue: "Task Overdue",
  };

  const payload = {
    embeds: [
      {
        title: titleMap[notification.action],
        description: notification.taskName,
        color: colorMap[notification.action],
        fields: [
          {
            name: "Priority",
            value: notification.priority || "None",
            inline: true,
          },
          ...(notification.dueDate
            ? [
                {
                  name: "Due Date",
                  value: new Date(notification.dueDate).toLocaleDateString(),
                  inline: true,
                },
              ]
            : []),
        ],
        footer: { text: "TaskFlow" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return response.ok;
  } catch (error) {
    console.error("Discord notification failed:", error);
    return false;
  }
}

/**
 * Send email notification
 */
export async function sendEmailNotification(
  to: string,
  notification: TaskNotification
): Promise<boolean> {
  // This would integrate with your email service (e.g., SendGrid, Resend)
  // For now, we'll just log it
  console.log("Email notification to:", to, notification);
  return true;
}
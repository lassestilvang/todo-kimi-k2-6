/**
 * Email Summary Generation
 * Creates daily/weekly task summaries for users
 */

interface TaskSummary {
  id: number;
  name: string;
  priority: string;
  dueDate: string | null;
  completed: boolean;
  daysUntilDue: number;
}

/**
 * Generate a daily summary for a user
 */
export function generateDailySummary(
  tasks: TaskSummary[],
  userName: string
): string {
  const overdue = tasks.filter((t) => !t.completed && t.daysUntilDue < 0);
  const dueToday = tasks.filter((t) => !t.completed && t.daysUntilDue === 0);
  const highPriority = tasks.filter((t) => t.priority === "critical" && !t.completed);

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #6366f1; color: white; padding: 20px; border-radius: 8px; }
    .section { margin: 20px 0; }
    .section h2 { color: #374151; font-size: 18px; }
    .task { padding: 12px; background: #f9fafb; border-radius: 6px; margin: 8px 0; }
    .priority-critical { border-left: 4px solid #ef4444; }
    .priority-high { border-left: 4px solid #f97316; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Daily Task Summary</h1>
      <p>Hello ${userName}!</p>
    </div>

    <div class="section">
      <h2>Overview</h2>
      <p>Total tasks: ${tasks.length} | Completed: ${tasks.filter(t => t.completed).length} | Overdue: ${overdue.length}</p>
    </div>

    ${overdue.length > 0 ? `
    <div class="section">
      <h2>⚠️ Overdue Tasks (${overdue.length})</h2>
      ${overdue.map(t => `
        <div class="task priority-${t.priority}">
          <strong>${t.name}</strong>
          <p>Priority: ${t.priority} | Was due: ${Math.abs(t.daysUntilDue)} days ago</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${dueToday.length > 0 ? `
    <div class="section">
      <h2>📅 Due Today (${dueToday.length})</h2>
      ${dueToday.map(t => `
        <div class="task priority-${t.priority}">
          <strong>${t.name}</strong>
          <p>Priority: ${t.priority}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    ${highPriority.length > 0 ? `
    <div class="section">
      <h2>🔥 High Priority Tasks (${highPriority.length})</h2>
      ${highPriority.map(t => `
        <div class="task priority-${t.priority}">
          <strong>${t.name}</strong>
          <p>Due: ${t.dueDate || 'No deadline'}</p>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="footer">
      <p>TaskFlow - Your productivity companion</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/api/settings">Manage notification settings</a></p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Generate a weekly summary for a user
 */
export function generateWeeklySummary(
  tasks: TaskSummary[],
  userName: string
): string {
  const completed = tasks.filter((t) => t.completed);
  const completionRate = tasks.length > 0 ? (completed.length / tasks.length) * 100 : 0;
  const streak = Math.floor(completionRate / 20); // Rough streak calculation

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 20px; border-radius: 8px; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
    .stat-box { text-align: center; padding: 16px; background: #f9fafb; border-radius: 8px; }
    .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; }
    .footer { color: #6b7280; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Weekly Productivity Report</h1>
      <p>Hello ${userName}!</p>
    </div>

    <div class="stats">
      <div class="stat-box">
        <div class="stat-number">${tasks.length}</div>
        <div>Total Tasks</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${Math.round(completionRate)}%</div>
        <div>Completion Rate</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${streak}</div>
        <div>Day Streak</div>
      </div>
    </div>

    <div class="footer">
      <p>TaskFlow - Your productivity companion</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/api/settings">Manage notification settings</a></p>
    </div>
  </div>
</body>
</html>`;
}
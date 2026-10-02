'use server';

import { getDb } from '@/lib/db';
import { logError } from '@/lib/logger';

export interface NotificationDigest {
  id: number;
  user_id: number;
  delivered_at: string;
  notification_count: number;
  digest_type: 'daily' | 'weekly' | 'custom';
  content: {
    overdue_tasks: Array<{ id: number; name: string; days_overdue: number }>;
    due_today: Array<{ id: number; name: string; priority: string }>;
    upcoming: Array<{ id: number; name: string; due_date: string | null }>;
    completed_today: number;
    streak: number;
    risk_alerts: number;
  };
}

export interface DailyDigestData {
  overdue: Array<{ id: number; name: string; days_overdue: number; priority: string }>;
  due_today: Array<{ id: number; name: string; priority: string }>;
  upcoming: Array<{ id: number; name: string; due_date: string | null; days_until: number }>;
  completed_today: number;
  streak: number;
  risk_alerts_count: number;
}

/**
 * Generate daily notification digest
 */
export async function generateDailyDigest(
  userId: number
): Promise<DailyDigestData> {
  const db = getDb();

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();

  // Get overdue tasks
  const overdue = db
    .prepare(
      `SELECT id, name, priority, date FROM tasks
       WHERE user_id = ? AND completed = 0 AND archived = 0 AND date < ?
       ORDER BY priority DESC, date ASC
       LIMIT 10`
    )
    .all(userId, today) as Array<{ id: number; name: string; priority: string; date: string | null }>;

  const overdueWithDays = overdue.map(t => ({
    ...t,
    days_overdue: Math.floor((now.getTime() - new Date(t.date || today).getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Get tasks due today
  const dueToday = db
    .prepare(
      `SELECT id, name, priority FROM tasks
       WHERE user_id = ? AND completed = 0 AND archived = 0 AND date = ?
       ORDER BY priority DESC`
    )
    .all(userId, today) as Array<{ id: number; name: string; priority: string }>;

  // Get upcoming tasks (next 7 days)
  const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  const upcoming = db
    .prepare(
      `SELECT id, name, date FROM tasks
       WHERE user_id = ? AND completed = 0 AND archived = 0 AND date > ? AND date <= ?
       ORDER BY date ASC
       LIMIT 10`
    )
    .all(userId, today, oneWeekFromNow) as Array<{ id: number; name: string; date: string | null }>;

  const upcomingWithDays = upcoming.map(t => ({
    ...t,
    days_until: Math.floor((new Date(t.date || today).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
  }));

  // Get tasks completed today
  const completedToday = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks
       WHERE user_id = ? AND completed = 1 AND DATE(COMPLETED_AT) = DATE('now')`
    )
    .get(userId) as { count: number };

  // Get streak (consecutive days with task completions)
  const streak = await calculateStreak(userId);

  // Get unread risk alerts
  const riskAlertsCount = db
    .prepare(
      `SELECT COUNT(*) as count FROM risk_alerts
       WHERE user_id = ? AND is_read = 0`
    )
    .get(userId) as { count: number };

  return {
    overdue: overdueWithDays,
    due_today: dueToday,
    upcoming: upcomingWithDays.map(t => ({
      id: t.id,
      name: t.name,
      due_date: t.date,
      days_until: t.days_until,
    })),
    completed_today: completedToday.count,
    streak,
    risk_alerts_count: riskAlertsCount.count,
  };
}

/**
 * Calculate user's completion streak
 */
async function calculateStreak(userId: number): Promise<number> {
  const db = getDb();

  // Get all completion dates
  const completions = db
    .prepare(
      `SELECT DATE(completed_at) as date FROM tasks
       WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
       ORDER BY date DESC`
    )
    .all(userId) as Array<{ date: string }>;

  if (completions.length === 0) return 0;

  const uniqueDates = [...new Set(completions.map(c => c.date))];

  let streak = 0;
  for (let i = 0; i < uniqueDates.length; i++) {
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() - i);
    const expectedStr = expectedDate.toISOString().split('T')[0];

    if (uniqueDates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Send notification digest (stub - would integrate with email/push services)
 */
export async function sendNotificationDigest(
  userId: number,
  digest: DailyDigestData
): Promise<boolean> {
  try {
    // Store digest in database
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    // Calculate total notifications
    const totalNotifications =
      digest.overdue.length +
      digest.due_today.length +
      digest.upcoming.length +
      (digest.completed_today > 0 ? 1 : 0) +
      (digest.risk_alerts_count > 0 ? 1 : 0);

    // In a real implementation, this would send:
    // - Email via SendGrid/Nodemailer
    // - Push notification via FCM/APNs
    // - SMS via Twilio

    // Store for history/analytics
    db.prepare(
      `INSERT INTO notification_digests
       (user_id, delivered_at, notification_count, digest_type, content)
       VALUES (?, ?, ?, 'daily', ?)`
    ).run(
      userId,
      today,
      totalNotifications,
      JSON.stringify(digest)
    );

    return true;
  } catch (error) {
    logError('Failed to send notification digest', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Create notification digest table if not exists
 */
export async function ensureNotificationTables(): Promise<void> {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_digests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      delivered_at TEXT,
      notification_count INTEGER,
      digest_type TEXT,
      content TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: number
): Promise<{
  daily_digest: boolean;
  weekly_digest: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  risk_alerts: boolean;
}> {
  const db = getDb();

  // Create preferences table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      user_id INTEGER PRIMARY KEY,
      daily_digest INTEGER DEFAULT 1,
      weekly_digest INTEGER DEFAULT 0,
      push_enabled INTEGER DEFAULT 1,
      email_enabled INTEGER DEFAULT 1,
      risk_alerts INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const prefs = db
    .prepare('SELECT * FROM notification_preferences WHERE user_id = ?')
    .get(userId) as
      | {
          user_id: number;
          daily_digest: number;
          weekly_digest: number;
          push_enabled: number;
          email_enabled: number;
          risk_alerts: number;
        }
      | undefined;

  if (!prefs) {
    // Return defaults
    return {
      daily_digest: true,
      weekly_digest: false,
      push_enabled: true,
      email_enabled: true,
      risk_alerts: true,
    };
  }

  return {
    daily_digest: Boolean(prefs.daily_digest),
    weekly_digest: Boolean(prefs.weekly_digest),
    push_enabled: Boolean(prefs.push_enabled),
    email_enabled: Boolean(prefs.email_enabled),
    risk_alerts: Boolean(prefs.risk_alerts),
  };
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: number,
  preferences: Partial<{
    daily_digest: boolean;
    weekly_digest: boolean;
    push_enabled: boolean;
    email_enabled: boolean;
    risk_alerts: boolean;
  }>
): Promise<boolean> {
  try {
    const db = getDb();

    // Check if preferences exist
    const existing = db
      .prepare('SELECT user_id FROM notification_preferences WHERE user_id = ?')
      .get(userId);

    if (existing) {
      // Update existing
      const fields = [];
      const values = [];

      if (preferences.daily_digest !== undefined) {
        fields.push('daily_digest = ?');
        values.push(preferences.daily_digest ? 1 : 0);
      }
      if (preferences.weekly_digest !== undefined) {
        fields.push('weekly_digest = ?');
        values.push(preferences.weekly_digest ? 1 : 0);
      }
      if (preferences.push_enabled !== undefined) {
        fields.push('push_enabled = ?');
        values.push(preferences.push_enabled ? 1 : 0);
      }
      if (preferences.email_enabled !== undefined) {
        fields.push('email_enabled = ?');
        values.push(preferences.email_enabled ? 1 : 0);
      }
      if (preferences.risk_alerts !== undefined) {
        fields.push('risk_alerts = ?');
        values.push(preferences.risk_alerts ? 1 : 0);
      }

      if (fields.length > 0) {
        values.push(userId);
        db.prepare(`UPDATE notification_preferences SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`).run(...values);
      }
    } else {
      // Create new
      db.prepare(
        `INSERT INTO notification_preferences
         (user_id, daily_digest, weekly_digest, push_enabled, email_enabled, risk_alerts)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(
        userId,
        preferences.daily_digest ?? true ? 1 : 0,
        preferences.weekly_digest ?? false ? 1 : 0,
        preferences.push_enabled ?? true ? 1 : 0,
        preferences.email_enabled ?? true ? 1 : 0,
        preferences.risk_alerts ?? true ? 1 : 0
      );
    }

    return true;
  } catch (error) {
    logError('Failed to update notification preferences', undefined, error instanceof Error ? error : new Error(String(error)));
    return false;
  }
}

/**
 * Generate weekly summary
 */
export async function generateWeeklySummary(
  userId: number
): Promise<{
  period_start: string;
  period_end: string;
  tasks_completed: number;
  tasks_created: number;
  average_completion_time: number;
  streak: number;
  risk_incidents: number;
  productivity_score: number;
}> {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const db = getDb();

  // Tasks completed this week
  const completed = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks
       WHERE user_id = ? AND completed = 1
       AND DATE(completed_at) >= DATE(?, 'weekday 0')`
    )
    .get(userId, now.toISOString()) as { count: number };

  // Tasks created this week
  const created = db
    .prepare(
      `SELECT COUNT(*) as count FROM tasks
       WHERE user_id = ? AND DATE(created_at) >= DATE(?, 'weekday 0')`
    )
    .get(userId, now.toISOString()) as { count: number };

  // Average time to complete (from estimate to actual)
  const avgTime = db
    .prepare(
      `SELECT AVG(actual_time) as avg_time FROM tasks
       WHERE user_id = ? AND completed = 1 AND actual_time IS NOT NULL`
    )
    .get(userId) as { avg_time: number | null } | undefined;

  // Risk incidents this week
  const riskIncidents = db
    .prepare(
      `SELECT COUNT(*) as count FROM risk_alerts
       WHERE user_id = ? AND triggered_at >= DATE(?, 'weekday 0')`
    )
    .get(userId, now.toISOString()) as { count: number };

  const streak = await calculateStreak(userId);

  // Calculate productivity score (0-100)
  let productivityScore = 50;
  productivityScore += (completed.count / Math.max(created.count, 1)) * 25;
  productivityScore += Math.min(streak * 2, 20);
  productivityScore = Math.min(100, Math.max(0, productivityScore));

  return {
    period_start: weekStart.toISOString().split('T')[0],
    period_end: weekEnd.toISOString().split('T')[0],
    tasks_completed: completed.count,
    tasks_created: created.count,
    average_completion_time: avgTime?.avg_time || 0,
    streak,
    risk_incidents: riskIncidents.count,
    productivity_score: Math.round(productivityScore),
  };
}
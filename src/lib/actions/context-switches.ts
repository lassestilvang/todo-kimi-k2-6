'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface ContextSwitch {
  id: number;
  user_id: number;
  task_id: number | null;
  project_tag: string | null;
  switched_at: string;
  session_duration_seconds: number | null;
  created_at: string;
}

export interface ContextSwitchStats {
  today_count: number;
  week_count: number;
  avg_session_minutes: number;
  estimated_productivity_drop_pct: number;
  level: 'low' | 'moderate' | 'high' | 'severe';
  recommendation: string;
}

/**
 * Record a context switch (the user moved to working on a different task).
 */
export async function recordContextSwitch(input: {
  task_id?: number | null;
  project_tag?: string | null;
  session_duration_seconds?: number | null;
}): Promise<ContextSwitch | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const result = db
    .prepare(
      `INSERT INTO context_switches
         (user_id, task_id, project_tag, switched_at, session_duration_seconds)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`
    )
    .run(
      user.id,
      input.task_id ?? null,
      input.project_tag ?? null,
      input.session_duration_seconds ?? null
    );

  revalidatePath('/context');
  return db
    .prepare('SELECT * FROM context_switches WHERE id = ?')
    .get(result.lastInsertRowid) as ContextSwitch;
}

/**
 * Get aggregate stats on context switching for the current day/week.
 */
export async function getContextSwitchStats(): Promise<ContextSwitchStats> {
  const db = getDb();
  const user = await getCurrentUser();
  const empty: ContextSwitchStats = {
    today_count: 0,
    week_count: 0,
    avg_session_minutes: 0,
    estimated_productivity_drop_pct: 0,
    level: 'low',
    recommendation: '',
  };
  if (!user?.id) return empty;

  const today = new Date().toISOString().slice(0, 10);
  const monday = new Date();
  const jsDay = monday.getDay() === 0 ? 7 : monday.getDay();
  monday.setDate(monday.getDate() - (jsDay - 1));
  const mondayIso = monday.toISOString().slice(0, 10);

  const todayCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c FROM context_switches
         WHERE user_id = ? AND date(switched_at) = ?`
      )
      .get(user.id, today) as { c: number }
  ).c;

  const weekRow = db
    .prepare(
      `SELECT COUNT(*) AS c, AVG(session_duration_seconds) AS avg_s
       FROM context_switches
       WHERE user_id = ? AND date(switched_at) >= ?`
    )
    .get(user.id, mondayIso) as { c: number; avg_s: number | null };

  const avg_session_minutes = weekRow.avg_s
    ? Math.round(weekRow.avg_s / 60)
    : 0;

  // Heuristic: every switch costs ~10 minutes of refocus time.
  // For today_count switches: drop_pct ≈ min(60, today_count * 5).
  const drop = Math.min(60, Math.round(todayCount * 5));
  const level: ContextSwitchStats['level'] =
    todayCount < 5 ? 'low' : todayCount < 12 ? 'moderate' : todayCount < 20 ? 'high' : 'severe';

  const recommendations: Record<ContextSwitchStats['level'], string> = {
    low: 'Steady pace — keep going.',
    moderate: `About ${drop}% productivity drop today. Consider a 30-min focus block before the next task.`,
    high: `High switching tax (${drop}%). Lock in a 60-min focus block and silence notifications.`,
    severe: `Severe switching today (${drop}% drop). Park new ideas in the parking lot and finish what you started.`,
  };

  return {
    today_count: todayCount,
    week_count: weekRow.c,
    avg_session_minutes,
    estimated_productivity_drop_pct: drop,
    level,
    recommendation: recommendations[level],
  };
}

/**
 * Reset today (manual reset button).
 */
export async function clearTodaySwitches(): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(
    `DELETE FROM context_switches WHERE user_id = ? AND date(switched_at) = ?`
  ).run(user.id, today);
  revalidatePath('/context');
  return true;
}

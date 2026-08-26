'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { listPrinciples } from './principles';
import { getWaitsNeedingNudge } from './async-waits';
import { getContextSwitchStats } from './context-switches';
import { getWeeklyCognitiveLoad } from './cognitive-load';
import { detectProcrastination } from './anti-procrastination';

export interface Briefing {
  generated_at: string;
  greeting: string;
  due_today: Array<{ id: number; name: string; priority: string }>;
  overdue: Array<{ id: number; name: string; priority: string; days_overdue: number }>;
  top_three: Array<{ id: number; name: string; priority: string; why: string }>;
  principle_of_the_day: string | null;
  nudges_needed: number;
  context_switch_level: string;
  cognitive_load_warning: string | null;
  procrastination_alerts: number;
  one_thing_to_do_first: { id: number; name: string; reason: string };
  summary: string;
}

/**
 * Build a daily briefing for the current user.
 *
 * Pure aggregation — pulls from tasks, principles, async waits, context switches,
 * cognitive load, and procrastination signals.
 */
export async function getBriefing(): Promise<Briefing> {
  const db = getDb();
  const user = await getCurrentUser();

  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? 'Burning the midnight oil'
      : hour < 12
      ? 'Good morning'
      : hour < 17
      ? 'Good afternoon'
      : 'Good evening';

  const empty: Briefing = {
    generated_at: new Date().toISOString(),
    greeting,
    due_today: [],
    overdue: [],
    top_three: [],
    principle_of_the_day: null,
    nudges_needed: 0,
    context_switch_level: 'low',
    cognitive_load_warning: null,
    procrastination_alerts: 0,
    one_thing_to_do_first: { id: 0, name: '', reason: '' },
    summary: '',
  };

  if (!user?.id) return empty;

  const today = new Date().toISOString().slice(0, 10);

  const dueToday = db
    .prepare(
      `SELECT id, name, priority FROM tasks
       WHERE user_id = ? AND completed = 0 AND date = ?
       ORDER BY CASE priority
                  WHEN 'critical' THEN 0
                  WHEN 'high' THEN 1
                  WHEN 'medium' THEN 2
                  WHEN 'low' THEN 3
                  ELSE 4 END,
                created_at ASC
       LIMIT 20`
    )
    .all(user.id, today) as Array<{ id: number; name: string; priority: string }>;

  const overdue = db
    .prepare(
      `SELECT id, name, priority,
              CAST(julianday('now') - julianday(date) AS INTEGER) AS days_overdue
       FROM tasks
       WHERE user_id = ? AND completed = 0
         AND date IS NOT NULL AND date < ?
       ORDER BY date ASC LIMIT 10`
    )
    .all(user.id, today) as Array<{
      id: number;
      name: string;
      priority: string;
      days_overdue: number;
    }>;

  const principles = await listPrinciples({ onlyActive: true });
  const principle_of_the_day =
    principles.length > 0
      ? principles[new Date().getDate() % principles.length].rule
      : null;

  const waits = await getWaitsNeedingNudge();
  const ctxStats = await getContextSwitchStats();
  const cogLoad = await getWeeklyCognitiveLoad();
  const proc = await detectProcrastination();

  // Top three: prioritize critical > high, then deep load first (focus window).
  const top_three = [...dueToday]
    .sort((a, b) => {
      const order: Record<string, number> = {
        critical: 0,
        high: 1,
        medium: 2,
        low: 3,
        none: 4,
      };
      return (order[a.priority] ?? 4) - (order[b.priority] ?? 4);
    })
    .slice(0, 3)
    .map((t, i) => ({
      ...t,
      why:
        i === 0
          ? 'Highest priority today — start here.'
          : i === 1
          ? 'Solid candidate for your second focus block.'
          : 'Wrap-up candidate for the afternoon.',
    }));

  const one = top_three[0] ?? overdue[0];
  const one_thing_to_do_first = one
    ? {
        id: one.id,
        name: one.name,
        reason:
          'priority' in one && (one as { priority: string }).priority === 'critical'
            ? 'Critical priority — start now.'
            : 'No critical item — pick your highest-energy task first.',
      }
    : { id: 0, name: 'No tasks today', reason: 'Take a breath — or pick something from the parking lot.' };

  const summaryParts: string[] = [];
  if (dueToday.length) summaryParts.push(`${dueToday.length} task${dueToday.length === 1 ? '' : 's'} due today`);
  if (overdue.length) summaryParts.push(`${overdue.length} overdue`);
  if (waits.length) summaryParts.push(`${waits.length} async nudge${waits.length === 1 ? '' : 's'} waiting`);
  if (proc.length) summaryParts.push(`${proc.length} procrastination signal${proc.length === 1 ? '' : 's'}`);

  return {
    ...empty,
    due_today: dueToday,
    overdue,
    top_three,
    principle_of_the_day,
    nudges_needed: waits.length,
    context_switch_level: ctxStats.level,
    cognitive_load_warning: cogLoad.over_capacity
      ? `Heavy 'deep' load this week (${Math.round((cogLoad.by_load.deep / Math.max(cogLoad.total_minutes, 1)) * 100)}%) — consider lighter tasks tomorrow.`
      : null,
    procrastination_alerts: proc.length,
    one_thing_to_do_first,
    summary: summaryParts.length
      ? summaryParts.join(' · ')
      : 'Clean slate today — pick what matters most.',
  };
}

'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export type CognitiveLoad = 'deep' | 'creative' | 'routine' | 'social' | 'emotional';

export interface CognitiveLoadDistribution {
  week: string;
  total_tasks: number;
  total_minutes: number;
  by_load: Record<CognitiveLoad, number>;
  recommended_share: Record<CognitiveLoad, number>;
  over_capacity: boolean;
}

/**
 * Set the cognitive load on a task.
 */
export async function setCognitiveLoad(
  taskId: number,
  load: CognitiveLoad
): Promise<boolean> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return false;
  const result = db
    .prepare(
      `UPDATE tasks SET cognitive_load = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`
    )
    .run(load, taskId, user.id);
  revalidatePath('/');
  return result.changes > 0;
}

/**
 * Compute the cognitive-load distribution for the current week (Mon–Sun of the
 * week the user is in).
 *
 * Uses estimate string ("HH:MM") to estimate minutes; falls back to a 30-min
 * default when unknown.
 */
export async function getWeeklyCognitiveLoad(): Promise<CognitiveLoadDistribution> {
  const db = getDb();
  const user = await getCurrentUser();

  const empty: CognitiveLoadDistribution = {
    week: '',
    total_tasks: 0,
    total_minutes: 0,
    by_load: { deep: 0, creative: 0, routine: 0, social: 0, emotional: 0 },
    recommended_share: {
      deep: 0.4,
      creative: 0.25,
      routine: 0.2,
      social: 0.1,
      emotional: 0.05,
    },
    over_capacity: false,
  };

  if (!user?.id) return empty;

  // Compute Monday of current week
  const today = new Date();
  const jsDay = today.getDay() === 0 ? 7 : today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (jsDay - 1));
  const mondayIso = monday.toISOString().slice(0, 10);

  const rows = db
    .prepare(
      `SELECT cognitive_load, estimate FROM tasks
       WHERE user_id = ? AND date >= ? AND completed = 0`
    )
    .all(user.id, mondayIso) as Array<{
      cognitive_load: CognitiveLoad | null;
      estimate: string | null;
    }>;

  const by_load: CognitiveLoadDistribution['by_load'] = {
    deep: 0,
    creative: 0,
    routine: 0,
    social: 0,
    emotional: 0,
  };
  let total_minutes = 0;

  for (const r of rows) {
    const minutes = parseEstimateMinutes(r.estimate) ?? 30;
    if (r.cognitive_load && r.cognitive_load in by_load) {
      by_load[r.cognitive_load] += minutes;
    }
    total_minutes += minutes;
  }

  const deep_share = total_minutes ? by_load.deep / total_minutes : 0;
  const over_capacity = deep_share > 0.55; // more than 55% deep → flag it

  return {
    week: mondayIso,
    total_tasks: rows.length,
    total_minutes,
    by_load,
    recommended_share: empty.recommended_share,
    over_capacity,
  };
}

function parseEstimateMinutes(estimate: string | null): number | null {
  if (!estimate) return null;
  if (/^\d+$/.test(estimate)) return parseInt(estimate, 10);
  const m = estimate.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

/**
 * Suggest an ordering for today's tasks by cognitive load × time of day.
 * Heuristic: deep work in the morning, creative mid-day, routine/social later.
 */
export async function suggestReorderedToday(): Promise<
  Array<{ id: number; name: string; cognitive_load: CognitiveLoad | null; date: string | null }>
> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];

  const today = new Date().toISOString().slice(0, 10);
  const rows = db
    .prepare(
      `SELECT id, name, cognitive_load, date FROM tasks
       WHERE user_id = ? AND completed = 0 AND date = ?
       ORDER BY priority ASC, sort_order ASC`
    )
    .all(user.id, today) as Array<{
      id: number;
      name: string;
      cognitive_load: CognitiveLoad | null;
      date: string | null;
    }>;

  const loadRank: Record<CognitiveLoad, number> = {
    deep: 0,
    creative: 1,
    emotional: 2,
    routine: 3,
    social: 4,
  };
  return [...rows].sort(
    (a, b) =>
      (loadRank[a.cognitive_load as CognitiveLoad] ?? 3) -
      (loadRank[b.cognitive_load as CognitiveLoad] ?? 3)
  );
}

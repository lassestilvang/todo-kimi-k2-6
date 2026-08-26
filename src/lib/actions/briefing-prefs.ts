'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface BriefingPreferences {
  id: number;
  user_id: number;
  enabled: number;
  delivery_hour: number;
  include_voice: number;
  include_predictions: number;
  include_principles: number;
  include_overdue: number;
  include_recommendations: number;
  updated_at: string;
}

export async function getBriefingPreferences(): Promise<BriefingPreferences | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const row = db
    .prepare('SELECT * FROM briefing_preferences WHERE user_id = ?')
    .get(user.id) as BriefingPreferences | undefined;
  return row ?? null;
}

export async function saveBriefingPreferences(input: {
  enabled?: boolean;
  delivery_hour?: number;
  include_voice?: boolean;
  include_predictions?: boolean;
  include_principles?: boolean;
  include_overdue?: boolean;
  include_recommendations?: boolean;
}): Promise<BriefingPreferences | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const existing = await getBriefingPreferences();
  const set = (
    obj: Partial<BriefingPreferences>,
    key: keyof BriefingPreferences,
    val: number | undefined
  ) => {
    if (val === undefined) return;
    obj[key] = val as never;
  };

  const merged: Partial<BriefingPreferences> = {};
  set(merged, 'enabled', input.enabled === undefined ? undefined : input.enabled ? 1 : 0);
  set(merged, 'delivery_hour', input.delivery_hour);
  set(merged, 'include_voice', input.include_voice === undefined ? undefined : input.include_voice ? 1 : 0);
  set(merged, 'include_predictions', input.include_predictions === undefined ? undefined : input.include_predictions ? 1 : 0);
  set(merged, 'include_principles', input.include_principles === undefined ? undefined : input.include_principles ? 1 : 0);
  set(merged, 'include_overdue', input.include_overdue === undefined ? undefined : input.include_overdue ? 1 : 0);
  set(merged, 'include_recommendations', input.include_recommendations === undefined ? undefined : input.include_recommendations ? 1 : 0);

  if (existing) {
    const fields = Object.keys(merged)
      .map(k => `${k} = ?`)
      .join(', ');
    const values = Object.values(merged);
    db.prepare(
      `UPDATE briefing_preferences SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`
    ).run(...values, user.id);
    revalidatePath('/settings');
    return db
      .prepare('SELECT * FROM briefing_preferences WHERE user_id = ?')
      .get(user.id) as BriefingPreferences;
  }

  db.prepare(
    `INSERT INTO briefing_preferences
       (user_id, enabled, delivery_hour, include_voice,
        include_predictions, include_principles, include_overdue, include_recommendations)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    user.id,
    merged.enabled ?? 1,
    merged.delivery_hour ?? 8,
    merged.include_voice ?? 0,
    merged.include_predictions ?? 1,
    merged.include_principles ?? 1,
    merged.include_overdue ?? 1,
    merged.include_recommendations ?? 1
  );
  revalidatePath('/settings');
  return db
    .prepare('SELECT * FROM briefing_preferences WHERE user_id = ?')
    .get(user.id) as BriefingPreferences;
}

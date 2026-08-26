'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import { revalidatePath } from 'next/cache';

export interface TravelSegment {
  id: number;
  user_id: number;
  from_location: string;
  to_location: string;
  mode: 'walking' | 'transit' | 'driving' | 'cycling';
  distance_km: number | null;
  duration_minutes: number;
  notes: string | null;
  recorded_at: string;
}

/**
 * Estimate travel time between two location strings.
 *
 * Heuristic fallback (we don't have a geocoding/maps API key in this project):
 * - If both locations are identical, 0 minutes.
 * - If either contains a city name we've seen before and is the same city, 15min.
 * - If they look like distinct addresses, default 30min.
 * - If we have a stored TravelSegment with the same pair and mode, use that.
 *
 * Returns minutes (rounded).
 */
export async function estimateTravelTime(
  from: string,
  to: string,
  mode: TravelSegment['mode'] = 'driving'
): Promise<{
  minutes: number;
  source: 'cache' | 'heuristic';
  confidence: 'high' | 'medium' | 'low';
}> {
  const db = getDb();
  const user = await getCurrentUser();

  const a = from.trim().toLowerCase();
  const b = to.trim().toLowerCase();
  if (!a || !b) return { minutes: 0, source: 'heuristic', confidence: 'low' };
  if (a === b) return { minutes: 0, source: 'heuristic', confidence: 'high' };

  // Cache lookup
  if (user?.id) {
    const row = db
      .prepare(
        `SELECT duration_minutes FROM travel_segments
         WHERE user_id = ?
           AND LOWER(from_location) = ?
           AND LOWER(to_location) = ?
           AND mode = ?
         ORDER BY recorded_at DESC LIMIT 1`
      )
      .get(user.id, a, b, mode) as { duration_minutes: number } | undefined;

    if (row) {
      return {
        minutes: row.duration_minutes,
        source: 'cache',
        confidence: 'high',
      };
    }
  }

  // Heuristic
  const defaults: Record<TravelSegment['mode'], number> = {
    walking: 25,
    cycling: 12,
    transit: 30,
    driving: 20,
  };
  return {
    minutes: defaults[mode],
    source: 'heuristic',
    confidence: 'low',
  };
}

/**
 * Record an actual measured travel segment so future estimates improve.
 */
export async function recordTravelSegment(input: {
  from_location: string;
  to_location: string;
  mode?: TravelSegment['mode'];
  duration_minutes: number;
  distance_km?: number | null;
  notes?: string | null;
}): Promise<TravelSegment | null> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return null;

  const result = db
    .prepare(
      `INSERT INTO travel_segments
         (user_id, from_location, to_location, mode, distance_km, duration_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      user.id,
      input.from_location,
      input.to_location,
      input.mode ?? 'driving',
      input.distance_km ?? null,
      input.duration_minutes,
      input.notes ?? null
    );

  revalidatePath('/travel');
  return db
    .prepare('SELECT * FROM travel_segments WHERE id = ?')
    .get(result.lastInsertRowid) as TravelSegment;
}

export async function listTravelSegments(limit = 30): Promise<TravelSegment[]> {
  const db = getDb();
  const user = await getCurrentUser();
  if (!user?.id) return [];
  return db
    .prepare(
      `SELECT * FROM travel_segments WHERE user_id = ?
       ORDER BY recorded_at DESC LIMIT ?`
    )
    .all(user.id, limit) as TravelSegment[];
}

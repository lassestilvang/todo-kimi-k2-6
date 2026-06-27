"use server";

import { getDb } from "@/lib/db";
import type { HabitStreak, HabitCompletion } from "@/types";

/**
 * Get habit streak data for a task
 */
export async function getHabitStreak(taskId: number): Promise<HabitStreak | null> {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM habit_streaks WHERE task_id = ? ORDER BY date DESC LIMIT 1"
  ).get(taskId) as HabitStreak | null;
}

/**
 * Get habit completions for a task within a date range
 */
export async function getHabitCompletions(
  taskId: number,
  startDate: string,
  endDate: string
): Promise<HabitCompletion[]> {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM habit_completions WHERE task_id = ? AND date >= ? AND date <= ? ORDER BY date ASC"
    )
    .all(taskId, startDate, endDate) as HabitCompletion[];
}

/**
 * Toggle habit completion for a specific date
 */
export async function toggleHabitCompletion(
  taskId: number,
  date: string
): Promise<{ completed: boolean; streak: number }> {
  const db = getDb();

  // Check if already completed
  const existing = db
    .prepare("SELECT id, completed FROM habit_completions WHERE task_id = ? AND date = ?")
    .get(taskId, date) as HabitCompletion | undefined;

  if (existing) {
    // Remove completion
    db.prepare("DELETE FROM habit_completions WHERE id = ?").run(existing.id);
    await updateStreak(taskId);
    return { completed: false, streak: await getCurrentStreak(taskId) };
  } else {
    // Add completion
    const now = new Date().toISOString();
    db.prepare(
      "INSERT INTO habit_completions (task_id, date, completed_at) VALUES (?, ?, ?)"
    ).run(taskId, date, now);
    await updateStreak(taskId);
    return { completed: true, streak: await getCurrentStreak(taskId) };
  }
}

/**
 * Get current streak count for a task
 */
async function getCurrentStreak(taskId: number): Promise<number> {
  const streak = await getHabitStreak(taskId);
  return streak?.streak_count || 0;
}

/**
 * Update streak record for a task
 */
async function updateStreak(taskId: number): Promise<void> {
  const db = getDb();

  // Get all completions sorted by date
  const completions = db
    .prepare("SELECT date FROM habit_completions WHERE task_id = ? ORDER BY date DESC")
    .all(taskId) as { date: string }[];

  const streakCount = calculateStreak(completions.map((c) => c.date));

  // Upsert streak record
  const existing = db.prepare("SELECT id FROM habit_streaks WHERE task_id = ?").get(taskId) as { id: number } | undefined;

  if (existing) {
    db.prepare(
      "UPDATE habit_streaks SET streak_count = ?, last_completed = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(streakCount, streakCount > 0 ? completions[0]?.date : null, existing.id);
  } else {
    db.prepare(
      "INSERT INTO habit_streaks (task_id, streak_count, last_completed) VALUES (?, ?, ?)"
    ).run(taskId, streakCount, streakCount > 0 ? completions[0]?.date : null);
  }
}

function calculateStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Check if the most recent completion is today or yesterday
  const lastCompleted = dates[0];
  if (lastCompleted !== todayStr && lastCompleted !== yesterdayStr) {
    return 0; // Streak is broken
  }

  // Count consecutive days
  let streak = 0;
  let expectedDate = lastCompleted;

  for (const date of dates) {
    if (date === expectedDate) {
      streak++;
      const prevDate = new Date(expectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      expectedDate = prevDate.toISOString().split("T")[0];
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Reset streak for a task
 */
export async function resetHabitStreak(taskId: number): Promise<void> {
  const db = getDb();
  db.prepare("DELETE FROM habit_completions WHERE task_id = ?").run(taskId);
  db.prepare("DELETE FROM habit_streaks WHERE task_id = ?").run(taskId);
}

/**
 * Get streak leaderboard (for public habits)
 */
export async function getStreakLeaderboard(): Promise<Array<{ task_id: number; name: string; streak_count: number }>> {
  const db = getDb();
  return db
    .prepare(
      `SELECT hs.task_id, t.name, hs.streak_count
       FROM habit_streaks hs
       JOIN tasks t ON hs.task_id = t.id
       ORDER BY hs.streak_count DESC
       LIMIT 10`
    )
    .all() as Array<{ task_id: number; name: string; streak_count: number }>;
}
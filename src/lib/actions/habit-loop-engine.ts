'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';
import type { HabitContext, HabitCompletion, Task } from '@/types';
import { revalidatePath } from 'next/cache';

// Extended Habit Loop Engine
// Implements the complete habit formation cycle:
// Cue → Craving → Response → Reward → Reflection

export interface HabitLoop {
  id: number;
  name: string;
  description: string | null;
  task_id: number;
  cue: string; // What triggers the habit?
  reward: string; // What feels good after?
  stacking: HabitStacking[]; // What should follow?
  reflection_prompt: string; // What to reflect on completion?
  enabled: boolean;
  streak_count: number;
  completion_rate: number;
  success_score: number; // 0-100 based on consistency and difficulty
  last_completed: string | null;
  created_at: string;
  updated_at: string;
}

export interface HabitStacking {
  id: number;
  habit_loop_id: number;
  after_task_id: number; // Complete this task first
  before_task_id: number; // Complete this after
  position: 'before' | 'after'; // Should this happen before/after
}

export interface HabitReflection {
  id: number;
  habit_loop_id: number;
  task_id: number;
  rating: number; // 1-5 how well it went
  notes: string | null;
  energy_level: number | null; // 1-10
  context_tags: string | null; // JSON array
  created_at: string;
}

const db = getDb();

// Get all habit loops for current user
export async function getHabitLoops(): Promise<HabitLoop[]> {
  const user = await getCurrentUser();
  if (!user?.id) return [];

  return db
    .prepare(
      `
    SELECT hl.*, t.name as task_name
    FROM habit_loops hl
    JOIN tasks t ON hl.task_id = t.id
    WHERE hl.enabled = 1 AND t.user_id = ?
    ORDER BY hl.streak_count DESC
  `
    )
    .all(user.id) as HabitLoop[];
}

// Get a specific habit loop
export async function getHabitLoop(id: number): Promise<HabitLoop | null> {
  const user = await getCurrentUser();
  if (!user?.id) return null;

  return db
    .prepare(
      `
    SELECT hl.*, t.name as task_name
    FROM habit_loops hl
    JOIN tasks t ON hl.task_id = t.id
    WHERE hl.id = ? AND t.user_id = ?
  `
    )
    .get(id, user.id) as HabitLoop | null;
}

// Create a new habit loop (from a task)
export async function createHabitLoop(
  userId: number,
  input: {
    task_id: number;
    name: string;
    description?: string;
    cue: string;
    reward: string;
    reflection_prompt?: string;
  }
): Promise<HabitLoop> {
  // Verify task ownership
  const task = db
    .prepare('SELECT id FROM tasks WHERE id = ? AND user_id = ?')
    .get(input.task_id, userId);
  if (!task) throw new Error('Task not found or access denied');

  const result = db
    .prepare(
      `
    INSERT INTO habit_loops (task_id, name, description, cue, reward, reflection_prompt, enabled, streak_count, success_score)
    VALUES (?, ?, ?, ?, ?, ?, 1, 0, 0.5)
  `
    )
    .run(
      input.task_id,
      input.name,
      input.description || null,
      input.cue,
      input.reward,
      input.reflection_prompt || null
    );

  revalidatePath('/habits');
  return {
    id: result.lastInsertRowid as number,
    task_id: input.task_id,
    name: input.name,
    description: input.description || null,
    cue: input.cue,
    reward: input.reward,
    stacking: [],
    reflection_prompt: input.reflection_prompt || '',
    enabled: true,
    streak_count: 0,
    completion_rate: 0,
    success_score: 0.5,
    last_completed: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Complete a habit and record reflection
export async function completeHabit(
  userId: number,
  habitLoopId: number,
  reflection: {
    rating: number;
    notes?: string;
    energy_level?: number;
    context_tags?: string[];
  }
): Promise<{ success: boolean; streak: number; successScore: number }> {
  // Verify ownership
  const habitLoop = await getHabitLoop(habitLoopId);
  if (!habitLoop) throw new Error('Habit loop not found');

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  // Record completion
  db.prepare(
    `
    INSERT INTO habit_completions (task_id, date, completed_at)
    VALUES (?, ?, ?)
  `
  ).run(habitLoop.task_id, todayStr, now.toISOString());

  // Record reflection
  db.prepare(
    `
    INSERT INTO habit_reflections (habit_loop_id, task_id, rating, notes, energy_level, context_tags)
    VALUES (?, ?, ?, ?, ?, ?)
  `
  ).run(
    habitLoopId,
    habitLoop.task_id,
    reflection.rating,
    reflection.notes || null,
    reflection.energy_level || null,
    reflection.context_tags ? JSON.stringify(reflection.context_tags) : null
  );

  // Update streak and success score
  const streakData = await calculateHabitStats(userId, habitLoopId);

  db.prepare(
    `
    UPDATE habit_loops
    SET streak_count = ?, success_score = ?, last_completed = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `
  ).run(streakData.streak, streakData.successScore, todayStr, habitLoopId);

  revalidatePath(`/habits/${habitLoopId}`);
  return {
    success: true,
    streak: streakData.streak,
    successScore: streakData.successScore,
  };
}

// Calculate habit statistics
async function calculateHabitStats(
  userId: number,
  habitLoopId: number
): Promise<{ streak: number; successScore: number }> {
  const habitLoop = db
    .prepare('SELECT * FROM habit_loops WHERE id = ?')
    .get(habitLoopId) as HabitLoop | undefined;
  if (!habitLoop) return { streak: 0, successScore: 0 };

  const completions = db
    .prepare(
      `
    SELECT date FROM habit_completions
    WHERE task_id = ?
  `
    )
    .all(habitLoop.task_id) as { date: string }[];

  const reflections = db
    .prepare(
      `
    SELECT rating, energy_level FROM habit_reflections
    WHERE habit_loop_id = ? AND date(date) >= date('now', '-30 days')
  `
    )
    .all(habitLoopId) as { rating: number; energy_level: number | null }[];

  // Calculate streak
  const streak = calculateCurrentStreak(completions.map(c => c.date));

  // Calculate success score based on:
  // - Completion rate (40% weight)
  // - Average reflection rating (30% weight)
  // - Energy level consistency (20% weight)
  // - Streak (10% weight)

  const completionRate =
    completions.length > 0 ? Math.min(1, completions.length / 30) : 0;
  const avgRating =
    reflections.length > 0
      ? reflections.reduce((sum, r) => sum + r.rating, 0) /
        reflections.length /
        5
      : 0;
  const avgEnergy =
    reflections.length > 0
      ? reflections.reduce((sum, r) => sum + (r.energy_level || 5), 0) /
        reflections.length /
        10
      : 0.5;

  const streakBoost = Math.min(1, streak / 30);

  const successScore =
    completionRate * 0.4 +
    avgRating * 0.3 +
    avgEnergy * 0.2 +
    streakBoost * 0.1;

  return { streak, successScore: Math.round(successScore * 100) / 100 };
}

function calculateCurrentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const sorted = [...new Set(dates)].sort().reverse();
  const lastCompleted = sorted[0];

  if (lastCompleted !== todayStr && lastCompleted !== yesterdayStr) {
    return 0;
  }

  let streak = 0;
  let expectedDate = lastCompleted;

  for (const date of sorted) {
    if (date === expectedDate) {
      streak++;
      const prevDate = new Date(expectedDate);
      prevDate.setDate(prevDate.getDate() - 1);
      expectedDate = prevDate.toISOString().split('T')[0];
    } else {
      break;
    }
  }

  return streak;
}

// Implementation Intentions
// "When situation X arises, I will perform response Y"

export interface ImplementationIntention {
  id: number;
  habit_loop_id: number;
  trigger: string; // "When I feel stressed"
  response: string; // "I will take 3 deep breaths"
  context_tags: string | null; // JSON array for filtering
  success_rate: number; // How often was this intention followed?
  created_at: string;
}

export async function createImplementationIntention(
  habitLoopId: number,
  input: { trigger: string; response: string; context_tags?: string[] }
): Promise<ImplementationIntention> {
  const result = db
    .prepare(
      `
    INSERT INTO implementation_intentions (habit_loop_id, trigger, response, context_tags)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(
      habitLoopId,
      input.trigger,
      input.response,
      input.context_tags ? JSON.stringify(input.context_tags) : null
    );

  return {
    id: result.lastInsertRowid as number,
    habit_loop_id: habitLoopId,
    trigger: input.trigger,
    response: input.response,
    context_tags: input.context_tags
      ? JSON.stringify(input.context_tags)
      : null,
    success_rate: 0,
    created_at: new Date().toISOString(),
  };
}

export async function getImplementationIntentions(
  habitLoopId: number
): Promise<ImplementationIntention[]> {
  return db
    .prepare(
      `
    SELECT * FROM implementation_intentions
    WHERE habit_loop_id = ?
    ORDER BY created_at DESC
  `
    )
    .all(habitLoopId) as ImplementationIntention[];
}

// Habit Stacking
// "After [current habit], I will [new habit]"

export async function addHabitStacking(
  habitLoopId: number,
  input: {
    after_task_id?: number;
    before_task_id?: number;
    position: 'before' | 'after';
  }
): Promise<HabitStacking> {
  if (!input.after_task_id && !input.before_task_id) {
    throw new Error('Must specify either after_task_id or before_task_id');
  }

  const result = db
    .prepare(
      `
    INSERT INTO habit_stackings (habit_loop_id, after_task_id, before_task_id, position)
    VALUES (?, ?, ?, ?)
  `
    )
    .run(
      habitLoopId,
      input.after_task_id || null,
      input.before_task_id || null,
      input.position
    );

  revalidatePath(`/habits/${habitLoopId}`);
  return {
    id: result.lastInsertRowid as number,
    habit_loop_id: habitLoopId,
    after_task_id: input.after_task_id || 0,
    before_task_id: input.before_task_id || 0,
    position: input.position,
  };
}

export async function getHabitStacking(
  habitLoopId: number
): Promise<HabitStacking[]> {
  return db
    .prepare(
      `
    SELECT * FROM habit_stackings
    WHERE habit_loop_id = ?
  `
    )
    .all(habitLoopId) as HabitStacking[];
}

// Habit Score Calculation
export async function calculateHabitScores(): Promise<
  Array<{
    habit_loop_id: number;
    name: string;
    streak: number;
    completion_rate: number;
    success_score: number;
    prediction_7days: number;
  }>
> {
  const habits = await getHabitLoops();

  return Promise.all(
    habits.map(async habit => {
      const completions = db
        .prepare(
          `
      SELECT date FROM habit_completions
      WHERE task_id = ?
    `
        )
        .all(habit.task_id) as { date: string }[];

      const reflections = db
        .prepare(
          `
      SELECT rating FROM habit_reflections
      WHERE habit_loop_id = ?
    `
        )
        .all(habit.id) as { rating: number }[];

      const prediction = predictHabitSuccess(
        completions,
        reflections,
        habit.streak_count
      );

      return {
        habit_loop_id: habit.id,
        name: habit.name,
        streak: habit.streak_count,
        completion_rate: Math.min(
          100,
          Math.round((completions.length / 30) * 100)
        ),
        success_score: habit.success_score,
        prediction_7days: prediction,
      };
    })
  );
}

function predictHabitSuccess(
  completions: { date: string }[],
  reflections: { rating: number }[],
  currentStreak: number
): number {
  if (completions.length < 3) return 50; // Not enough data

  const recentCompletions = completions.filter(c => {
    const date = new Date(c.date);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return date >= weekAgo;
  });

  const recentRate = recentCompletions.length / 7;
  const avgRating =
    reflections.length > 0
      ? reflections.reduce((sum, r) => sum + r.rating, 0) /
        reflections.length /
        5
      : 0.5;

  // Prediction formula: weighted average of recent rate, average rating, and streak
  return Math.min(
    100,
    Math.round(
      recentRate * 40 + avgRating * 30 + Math.min(1, currentStreak / 14) * 30
    )
  );
}

// Habit Loop Analysis
export async function analyzeHabitLoop(habitLoopId: number): Promise<{
  optimal_time: string | null;
  energy_level: number;
  improvement_suggestions: string[];
}> {
  const habitLoop = await getHabitLoop(habitLoopId);
  if (!habitLoop) throw new Error('Habit not found');

  const completions = db
    .prepare(
      `
    SELECT date, created_at FROM habit_completions
    WHERE task_id = ?
    ORDER BY date ASC
  `
    )
    .all(habitLoop.task_id) as { date: string; created_at: string }[];

  const reflections = db
    .prepare(
      `
    SELECT rating, energy_level, context_tags, created_at
    FROM habit_reflections
    WHERE habit_loop_id = ?
    ORDER BY created_at DESC
  `
    )
    .all(habitLoopId) as {
    rating: number;
    energy_level: number | null;
    context_tags: string | null;
    created_at: string;
  }[];

  // Analyze optimal time
  let optimalTime: string | null = null;
  if (completions.length > 3) {
    const hours: number[] = [];
    for (const c of completions) {
      const hour = new Date(c.created_at).getHours();
      hours.push(hour);
    }
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;
    optimalTime = `${avgHour.toString().padStart(2, '0')}:00`;
  }

  // Calculate average energy level
  const energyLevels = reflections
    .map(r => r.energy_level)
    .filter((e): e is number => e !== null);
  const energyLevel =
    energyLevels.length > 0
      ? Math.round(
          (energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length) * 2
        ) / 2
      : 5;

  // Generate suggestions
  const suggestions: string[] = [];

  if (habitLoop.streak_count < 7) {
    suggestions.push('Build consistency first - aim for 7 consecutive days');
  }

  if (habitLoop.completion_rate < 0.3) {
    suggestions.push('Start small - reduce the habit to 2-5 minutes initially');
  }

  const lowEnergyReflections = reflections.filter(
    r => r.energy_level && r.energy_level < 5
  );
  if (lowEnergyReflections.length > reflections.length * 0.5) {
    suggestions.push('Try this habit during your peak energy hours');
  }

  if (suggestions.length === 0) {
    suggestions.push(
      "You're doing great! Consider increasing the habit difficulty."
    );
  }

  return {
    optimal_time: optimalTime,
    energy_level: energyLevel,
    improvement_suggestions: suggestions,
  };
}

// Reset habit (for starting fresh)
export async function resetHabit(habitLoopId: number): Promise<void> {
  const habitLoop = await getHabitLoop(habitLoopId);
  if (!habitLoop) throw new Error('Habit not found');

  // Clear completions and reflections, keep streak for historical data
  db.prepare('DELETE FROM habit_completions WHERE task_id = ?').run(
    habitLoop.task_id
  );
  db.prepare('DELETE FROM habit_reflections WHERE habit_loop_id = ?').run(
    habitLoopId
  );

  // Reset streak
  db.prepare(
    `
    UPDATE habit_loops
    SET streak_count = 0, success_score = 0.5, last_completed = NULL
    WHERE id = ?
  `
  ).run(habitLoopId);

  revalidatePath(`/habits`);
}

// Mark tables if they don't exist
const initDb = () => {
  db.exec(`CREATE TABLE IF NOT EXISTS habit_loops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    cue TEXT,
    reward TEXT,
    reflection_prompt TEXT,
    enabled INTEGER DEFAULT 1,
    streak_count INTEGER DEFAULT 0,
    completion_rate REAL DEFAULT 0,
    success_score REAL DEFAULT 0.5,
    last_completed TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS habit_reflections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_loop_id INTEGER NOT NULL REFERENCES habit_loops(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id),
    rating INTEGER CHECK(rating BETWEEN 1 AND 5),
    notes TEXT,
    energy_level INTEGER CHECK(energy_level BETWEEN 1 AND 10),
    context_tags TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS implementation_intentions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_loop_id INTEGER NOT NULL REFERENCES habit_loops(id) ON DELETE CASCADE,
    trigger TEXT NOT NULL,
    response TEXT NOT NULL,
    context_tags TEXT,
    success_rate REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);

  db.exec(`CREATE TABLE IF NOT EXISTS habit_stackings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_loop_id INTEGER NOT NULL REFERENCES habit_loops(id) ON DELETE CASCADE,
    after_task_id INTEGER REFERENCES tasks(id),
    before_task_id INTEGER REFERENCES tasks(id),
    position TEXT CHECK(position IN ('before', 'after')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )`);
};

// Initialize DB on module load
initDb();

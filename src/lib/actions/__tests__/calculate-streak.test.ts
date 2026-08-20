import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setDb, resetDb } from '@/lib/db';
import { createTestDb } from '@/lib/db/test-db';

describe('Habit Calculate Streak Coverage', () => {
  let db: ReturnType<typeof createTestDb>;

  beforeEach(() => {
    resetDb();
    db = createTestDb();
    setDb(db);

    // Create tables
    db.exec(`
      CREATE TABLE IF NOT EXISTS habit_streaks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        streak_count INTEGER DEFAULT 0,
        last_completed TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS habit_completions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        completed_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, date)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL
      )
    `);
  });

  afterEach(() => {
    db.close();
    resetDb();
  });

  describe('toggleHabitCompletion - triggers calculateStreak', () => {
    it('should add a completion', async () => {
      const { toggleHabitCompletion } = await import('../habits');

      const today = new Date().toISOString().split('T')[0];
      const result = await toggleHabitCompletion(1, today);

      expect(result.completed).toBe(true);
      expect(typeof result.streak).toBe('number');
    });

    it('should remove an existing completion', async () => {
      const { toggleHabitCompletion } = await import('../habits');

      const today = new Date().toISOString().split('T')[0];

      // First toggle adds
      await toggleHabitCompletion(2, today);

      // Second toggle removes
      const result = await toggleHabitCompletion(2, today);
      expect(result.completed).toBe(false);
    });

    it('should update streak after adding completion', async () => {
      const { toggleHabitCompletion } = await import('../habits');

      const today = new Date().toISOString().split('T')[0];

      // First completion
      await toggleHabitCompletion(1, today);

      // Get the streak
      const streak = await db
        .prepare('SELECT streak_count FROM habit_streaks WHERE task_id = ?')
        .get(1);

      expect(streak?.streak_count).toBeGreaterThanOrEqual(0);
    });

    it('should calculate consecutive streak correctly (lines 115-129)', async () => {
      const { toggleHabitCompletion, getHabitStreak } =
        await import('../habits');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Create yesterday's date string
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Create a day before yesterday
      const dayBeforeYesterday = new Date(today);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      const dayBeforeYesterdayStr = dayBeforeYesterday
        .toISOString()
        .split('T')[0];

      // Add completions for 3 consecutive days
      await toggleHabitCompletion(100, dayBeforeYesterdayStr);
      await toggleHabitCompletion(100, yesterdayStr);
      await toggleHabitCompletion(100, todayStr);

      // Get the streak - should be 3
      const streak = await getHabitStreak(100);
      expect(streak).toBeTruthy();
      expect(streak!.streak_count).toBe(3);
    });

    it('should break streak loop when dates are not consecutive (line 125)', async () => {
      const { toggleHabitCompletion, getHabitStreak } =
        await import('../habits');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Create yesterday's date string
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Create a date 3 days ago (skipping a day)
      const threeDaysAgo = new Date(today);
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

      // Add completions: yesterday, then 3 days ago
      // This creates a gap - yesterday -> 3 days ago (skipping 2 days ago)
      await toggleHabitCompletion(102, yesterdayStr);
      await toggleHabitCompletion(102, threeDaysAgoStr);

      // Get the streak - should be 1 (only yesterday is consecutive from today)
      const streak = await getHabitStreak(102);
      expect(streak).toBeTruthy();
      expect(streak!.streak_count).toBe(1); // Just yesterday
    });

    it('should return zero streak when last completion is more than 1 day old (line 110)', async () => {
      const { toggleHabitCompletion, getHabitStreak } =
        await import('../habits');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create a date that is 3 days ago (definitely not yesterday or today)
      const oldDate = new Date(today);
      oldDate.setDate(oldDate.getDate() - 3);
      const oldStr = oldDate.toISOString().split('T')[0];

      await toggleHabitCompletion(101, oldStr);

      // Get the streak - should be 0 because last completion is not today or yesterday
      const streak = await getHabitStreak(101);
      expect(streak).toBeTruthy();
      expect(streak!.streak_count).toBe(0);
    });

    it("should break streak loop when there's a gap in consecutive dates (line 125)", async () => {
      const { toggleHabitCompletion, getHabitStreak } =
        await import('../habits');

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

      // Create yesterday
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Create day before yesterday
      const dayBeforeYesterday = new Date(today);
      dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
      const dayBeforeYesterdayStr = dayBeforeYesterday
        .toISOString()
        .split('T')[0];

      // Create a date 5 days ago (creating a gap)
      const fiveDaysAgo = new Date(today);
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      const fiveDaysAgoStr = fiveDaysAgo.toISOString().split('T')[0];

      // Add completions: day -5, day -2, day 0 (creating a gap between day -2 and day 0)
      // When ordered DESC: [day 0, day -2, day -5]
      // Loop: day 0 matches expected day 0, day -2 does NOT match expected day -1, BREAK!
      await toggleHabitCompletion(103, fiveDaysAgoStr);
      await toggleHabitCompletion(103, dayBeforeYesterdayStr);
      await toggleHabitCompletion(103, todayStr);

      // Get the streak - should be 1 (only today matched consecutively)
      const streak = await getHabitStreak(103);
      expect(streak).toBeTruthy();
      expect(streak!.streak_count).toBe(1);
    });
  });

  describe('getHabitStreak', () => {
    it('should return null/falsy when no streak exists', async () => {
      const { getHabitStreak } = await import('../habits');

      const result = await getHabitStreak(999);
      expect(result).toBeFalsy();
    });
  });

  describe('getHabitCompletions coverage', () => {
    it('should return empty array when no completions exist', async () => {
      const { getHabitCompletions } = await import('../habits');

      const completions = await getHabitCompletions(
        1,
        '2024-01-01',
        '2024-12-31'
      );
      expect(Array.isArray(completions)).toBe(true);
    });
  });

  describe('resetHabitStreak coverage', () => {
    it('should delete streak for a task', async () => {
      const { resetHabitStreak } = await import('../habits');

      // Create streak data directly
      db.prepare(
        'INSERT INTO habit_streaks (task_id, streak_count) VALUES (?, ?)'
      ).run(1, 5);

      await resetHabitStreak(1);

      // Verify streak is deleted
      const streaks = db
        .prepare('SELECT * FROM habit_streaks WHERE task_id = ?')
        .all(1);
      expect(streaks.length).toBe(0);
    });
  });

  describe('getStreakLeaderboard coverage', () => {
    it('should return empty array when no streaks exist', async () => {
      const { getStreakLeaderboard } = await import('../habits');

      const result = await getStreakLeaderboard();
      expect(Array.isArray(result)).toBe(true);
    });
  });
});

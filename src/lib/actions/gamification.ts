'use server';

import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/session';

export interface Achievement {
  id: number;
  user_id: number;
  achievement_type: string;
  title: string;
  description: string;
  badge_icon: string;
  badge_color: string;
  xp_reward: number;
  unlocked_at: string;
}

export interface UserLevel {
  user_id: number;
  level: number;
  total_xp: number;
  xp_to_next_level: number;
  rank: string;
  badges_earned: number;
  tasks_completed: number;
}

export interface LeaderboardEntry {
  user_id: number;
  user_name: string;
  level: number;
  total_xp: number;
  tasks_completed: number;
  current_streak: number;
  rank: number;
}

/**
 * Calculate user XP and level
 */
export async function calculateUserLevel(userId: number): Promise<UserLevel> {
  const db = getDb();

  // Count completed tasks
  const completedTasks = db
    .prepare(
      'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1'
    )
    .get(userId) as { count: number };

  // Count current streak
  const completions = db
    .prepare(
      `SELECT DATE(completed_at) as date FROM tasks
       WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
       ORDER BY date DESC`
    )
    .all(userId) as Array<{ date: string }>;

  let streak = 0;
  const today = new Date().toISOString().split('T')[0];
  for (let i = 0; i < completions.length; i++) {
    const expected = new Date();
    expected.setDate(expected.getDate() - i);
    if (completions[i].date === expected.toISOString().split('T')[0]) {
      streak++;
    } else {
      break;
    }
  }

  // Calculate XP: 10 per task + bonus for streaks
  let totalXp = completedTasks.count * 10;
  totalXp += streak * 5; // 5 bonus XP per day of streak

  // Level calculation: level = floor(sqrt(xp / 100)) + 1
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;

  // XP to next level
  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const xpToNextLevel = xpForNextLevel - totalXp;

  // Count badges
  const badges = db
    .prepare(
      'SELECT COUNT(*) as count FROM achievements WHERE user_id = ?'
    )
    .get(userId) as { count: number };

  // Determine rank
  let rank = 'Bronze';
  if (level >= 50) rank = 'Diamond';
  else if (level >= 25) rank = 'Platinum';
  else if (level >= 15) rank = 'Gold';
  else if (level >= 10) rank = 'Silver';
  else if (level >= 5) rank = 'Bronze';

  return {
    user_id: userId,
    level,
    total_xp: totalXp,
    xp_to_next_level: xpToNextLevel,
    rank,
    badges_earned: badges.count,
    tasks_completed: completedTasks.count,
  };
}

/**
 * Check and unlock achievements
 */
export async function checkAchievements(userId: number): Promise<Achievement[]> {
  const db = getDb();
  const unlocked: Achievement[] = [];

  // Define achievements
  const achievementDefs = [
    {
      type: 'first_task',
      title: 'First Steps',
      description: 'Complete your first task',
      icon: '🎯',
      color: 'green',
      xp: 50,
      check: () => {
        const r = db
          .prepare(
            'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1'
          )
          .get(userId) as { count: number };
        return r.count >= 1;
      },
    },
    {
      type: 'task_10',
      title: 'Getting Started',
      description: 'Complete 10 tasks',
      icon: '⭐',
      color: 'blue',
      xp: 100,
      check: () => {
        const r = db
          .prepare(
            'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1'
          )
          .get(userId) as { count: number };
        return r.count >= 10;
      },
    },
    {
      type: 'task_50',
      title: 'Productive Pro',
      description: 'Complete 50 tasks',
      icon: '🏆',
      color: 'yellow',
      xp: 250,
      check: () => {
        const r = db
          .prepare(
            'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1'
          )
          .get(userId) as { count: number };
        return r.count >= 50;
      },
    },
    {
      type: 'task_100',
      title: 'Centurion',
      description: 'Complete 100 tasks',
      icon: '💯',
      color: 'purple',
      xp: 500,
      check: () => {
        const r = db
          .prepare(
            'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND completed = 1'
          )
          .get(userId) as { count: number };
        return r.count >= 100;
      },
    },
    {
      type: 'streak_3',
      title: 'On a Roll',
      description: 'Maintain a 3-day streak',
      icon: '🔥',
      color: 'orange',
      xp: 100,
      check: async () => {
        const level = await calculateUserLevel(userId);
        return level.tasks_completed >= 3;
      },
    },
    {
      type: 'streak_7',
      title: 'Week Warrior',
      description: 'Maintain a 7-day streak',
      icon: '⚡',
      color: 'orange',
      xp: 200,
      check: async () => {
        const completions = db
          .prepare(
            `SELECT DATE(completed_at) as date FROM tasks
             WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL`
          )
          .all(userId) as Array<{ date: string }>;

        let streak = 0;
        for (let i = 0; i < 7; i++) {
          const expected = new Date();
          expected.setDate(expected.getDate() - i);
          const dateStr = expected.toISOString().split('T')[0];
          if (completions.some(c => c.date === dateStr)) {
            streak++;
          } else {
            break;
          }
        }
        return streak >= 7;
      },
    },
    {
      type: 'high_priority_master',
      title: 'Priority Master',
      description: 'Complete 10 high-priority tasks',
      icon: '🎖️',
      color: 'red',
      xp: 200,
      check: () => {
        const r = db
          .prepare(
            `SELECT COUNT(*) as count FROM tasks
             WHERE user_id = ? AND completed = 1 AND priority IN ('critical', 'high')`
          )
          .get(userId) as { count: number };
        return r.count >= 10;
      },
    },
    {
      type: 'early_bird',
      title: 'Early Bird',
      description: 'Complete 5 tasks before noon',
      icon: '🌅',
      color: 'orange',
      xp: 150,
      check: () => {
        const r = db
          .prepare(
            `SELECT COUNT(*) as count FROM tasks
             WHERE user_id = ? AND completed = 1
             AND CAST(strftime('%H', completed_at) AS INTEGER) < 12`
          )
          .get(userId) as { count: number };
        return r.count >= 5;
      },
    },
    {
      type: 'skill_collector',
      title: 'Skill Collector',
      description: 'Develop 5 skills',
      icon: '🧠',
      color: 'indigo',
      xp: 200,
      check: () => {
        const r = db
          .prepare(
            'SELECT COUNT(*) as count FROM user_skills WHERE user_id = ?'
          )
          .get(userId) as { count: number };
        return r.count >= 5;
      },
    },
  ];

  for (const def of achievementDefs) {
    // Check if already unlocked
    const existing = db
      .prepare(
        'SELECT id FROM achievements WHERE user_id = ? AND achievement_type = ?'
      )
      .get(userId, def.type);

    if (existing) continue;

    // Check if criteria met
    const isMet = await def.check();
    if (!isMet) continue;

    // Unlock achievement
    const result = db
      .prepare(
        `INSERT INTO achievements
         (user_id, achievement_type, title, description, badge_icon, badge_color, xp_reward, unlocked_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
      )
      .run(userId, def.type, def.title, def.description, def.icon, def.color, def.xp);

    unlocked.push({
      id: Number(result.lastInsertRowid),
      user_id: userId,
      achievement_type: def.type,
      title: def.title,
      description: def.description,
      badge_icon: def.icon,
      badge_color: def.color,
      xp_reward: def.xp,
      unlocked_at: new Date().toISOString(),
    });
  }

  return unlocked;
}

/**
 * Get user achievements
 */
export async function getUserAchievements(userId: number): Promise<Achievement[]> {
  const db = getDb();

  return db
    .prepare(
      `SELECT * FROM achievements
       WHERE user_id = ?
       ORDER BY unlocked_at DESC`
    )
    .all(userId) as Achievement[];
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(limit = 20): Promise<LeaderboardEntry[]> {
  const db = getDb();

  const users = db
    .prepare(
      `SELECT id, name, email FROM users LIMIT ?`
    )
    .all(limit) as Array<{ id: number; name: string; email: string }>;

  const entries: LeaderboardEntry[] = [];

  for (const user of users) {
    const level = await calculateUserLevel(user.id);
    entries.push({
      user_id: user.id,
      user_name: user.name || user.email,
      level: level.level,
      total_xp: level.total_xp,
      tasks_completed: level.tasks_completed,
      current_streak: 0, // Would need separate calculation
      rank: 0, // Set after sorting
    });
  }

  // Sort by XP and add rank
  entries.sort((a, b) => b.total_xp - a.total_xp);
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return entries;
}